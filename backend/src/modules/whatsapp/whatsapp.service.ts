import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfigService } from '../../common/config/app.config';
import { EvolutionService } from '../evolution/evolution.service';
import { AiService } from '../ai/ai.service';
import { TransactionsService } from '../transactions/transactions.service';
import { SegmentsService } from '../segments/segments.service';
import { CategoriesService } from '../categories/categories.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import type { BotInterpretation } from '../ai/ai.types';

interface WebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

interface MessageKey {
  id?: string;
  fromMe?: boolean;
  remoteJid?: string;
}

interface MessageContent {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string; mimetype?: string };
  audioMessage?: { mimetype?: string; ptt?: boolean; seconds?: number };
  documentMessage?: { fileName?: string; mimetype?: string };
}

interface MessageData {
  key?: MessageKey;
  message?: MessageContent;
  messageType?: string;
}

interface HandlerResult {
  responseText: string;
  actionTaken: string;
  relatedTransactionId: string | null;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly evolution: EvolutionService,
    private readonly ai: AiService,
    private readonly transactions: TransactionsService,
    private readonly segments: SegmentsService,
    private readonly categories: CategoriesService,
    private readonly bankAccounts: BankAccountsService,
  ) {}

  async connectWhatsApp(companyId: string) {
    const missing = this.appConfig.getMissingEvolutionVars();
    if (missing.length > 0) {
      throw new ServiceUnavailableException(
        `Integração WhatsApp não configurada. Variáveis ausentes no backend: ${missing.join(', ')}`,
      );
    }

    const existing = await this.prisma.whatsAppInstance.findUnique({
      where: { companyId },
    });

    if (existing?.status === 'CONNECTED') {
      throw new BadRequestException('WhatsApp já está conectado.');
    }

    if (existing) {
      await this.evolution
        .deleteInstance(existing.instanceName)
        .catch(() => {});
      await this.prisma.whatsAppInstance.delete({
        where: { id: existing.id },
      });
    }

    const prefix = this.appConfig.getEvolutionInstancePrefix();
    const instanceName = prefix + companyId.replace(/-/g, '').slice(0, 12);
    const webhookUrl =
      this.appConfig.getPublicWebhookUrl() + '/api/whatsapp/webhook';

    const result = await this.evolution.createInstance(
      instanceName,
      webhookUrl,
    );

    let qrCode = result.qrCodeBase64;

    if (!qrCode) {
      await this.delay(2000);
      qrCode = await this.evolution.fetchQrCode(instanceName);
    }

    await this.prisma.whatsAppInstance.create({
      data: {
        companyId,
        instanceName,
        instanceToken: result.token,
        status: 'PENDING_QR',
        qrCodeBase64: qrCode,
      },
    });

    return { status: 'PENDING_QR' as const, qrCode, instanceName };
  }

  async getStatus(companyId: string) {
    // Retorna "não configurado" de forma graciosa sem crashar
    if (!this.appConfig.isEvolutionConfigured()) {
      return {
        status: 'NOT_CONNECTED' as const,
        qrCode: null,
        phoneNumber: null,
        profileName: null,
        profilePicUrl: null,
        lastConnectedAt: null,
        configured: false,
      };
    }

    const instance = await this.prisma.whatsAppInstance.findUnique({
      where: { companyId },
    });

    if (!instance) {
      return {
        status: 'NOT_CONNECTED' as const,
        qrCode: null,
        phoneNumber: null,
        profileName: null,
        profilePicUrl: null,
        lastConnectedAt: null,
      };
    }

    if (instance.status === 'PENDING_QR' && !instance.qrCodeBase64) {
      const qrCode = await this.evolution.fetchQrCode(
        instance.instanceName,
      );
      if (qrCode) {
        await this.prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { qrCodeBase64: qrCode },
        });
        return {
          status: instance.status,
          qrCode,
          phoneNumber: instance.phoneNumber,
          profileName: instance.profileName,
          profilePicUrl: instance.profilePicUrl,
          lastConnectedAt:
            instance.lastConnectedAt?.toISOString() ?? null,
        };
      }
    }

    return {
      status: instance.status,
      qrCode: instance.qrCodeBase64,
      phoneNumber: instance.phoneNumber,
      profileName: instance.profileName,
      profilePicUrl: instance.profilePicUrl,
      lastConnectedAt: instance.lastConnectedAt?.toISOString() ?? null,
    };
  }

  async disconnect(companyId: string) {
    const instance = await this.prisma.whatsAppInstance.findUnique({
      where: { companyId },
    });

    if (instance) {
      await this.evolution
        .logoutInstance(instance.instanceName)
        .catch(() => {});
      await this.prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { status: 'DISCONNECTED', qrCodeBase64: null },
      });
    }

    return { message: 'WhatsApp desconectado com sucesso' };
  }

  /**
   * Envia código de recuperação de senha (6 dígitos) via WhatsApp.
   */
  async sendPasswordResetCode(phone: string, code: string): Promise<void> {
    if (!this.appConfig.isEvolutionConfigured()) return;

    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { status: 'CONNECTED' },
    });
    if (!instance) {
      this.logger.warn(
        'Nenhuma instância WhatsApp conectada — código de reset não enviado',
      );
      return;
    }

    const message =
      `🔐 *Recuperação de senha — Meu Caixa*\n\n` +
      `Seu código é: *${code}*\n\n` +
      `Ele expira em 10 minutos. Se você não pediu, ignore esta mensagem.`;

    await this.evolution
      .sendTextMessage(instance.instanceName, phone, message)
      .catch((err) => {
        this.logger.warn(
          `sendPasswordResetCode falhou: ${err instanceof Error ? err.message : 'erro'}`,
        );
      });
  }

  /**
   * Envia mensagem de boas-vindas para um novo cliente recém-cadastrado.
   * Usa a primeira instância CONNECTED (o bot global do Meu Caixa).
   */
  async sendWelcomeMessage(phone: string, name: string): Promise<void> {
    if (!this.appConfig.isEvolutionConfigured()) return;

    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { status: 'CONNECTED' },
    });
    if (!instance) {
      this.logger.warn(
        'Nenhuma instância WhatsApp conectada — boas-vindas não enviadas',
      );
      return;
    }

    const firstName = name.split(' ')[0] ?? name;
    const message =
      `👋 Olá, ${firstName}! Seja bem-vindo ao *Meu Caixa*.\n\n` +
      `Sou seu assistente financeiro pelo WhatsApp. Você já pode:\n\n` +
      `💸 Registrar despesas: _"gastei 50 no uber"_\n` +
      `💰 Registrar receitas: _"recebi 2k do cliente"_\n` +
      `📊 Pedir relatórios: _"quanto ganhei essa semana"_\n` +
      `💼 Consultar saldo: _"qual meu saldo"_\n\n` +
      `Envie *ajuda* a qualquer momento pra ver os comandos.`;

    await this.evolution
      .sendTextMessage(instance.instanceName, phone, message)
      .catch((err) => {
        this.logger.warn(
          `sendWelcomeMessage falhou: ${err instanceof Error ? err.message : 'erro'}`,
        );
      });
  }

  async processWebhook(payload: WebhookPayload): Promise<void> {
    if (!this.appConfig.isEvolutionConfigured()) {
      this.logger.warn(
        'Webhook recebido mas Evolution não está configurado — ignorando',
      );
      return;
    }

    const instanceName = payload.instance;
    if (!instanceName) return;

    const event = payload.event?.toLowerCase();

    // Mensagens de entrada não dependem do registro DB:
    // o roteamento agora é por phone do remetente (user.phone).
    if (event === 'messages.upsert') {
      await this.handleIncomingMessage(
        instanceName,
        payload.data as unknown as MessageData,
      );
      return;
    }

    // Eventos de QR/conexão precisam do registro DB. Se não existir, ignora
    // silenciosamente (o admin pode reconectar pelo painel se quiser tracking).
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { instanceName },
    });
    if (!instance) {
      return;
    }

    if (event === 'qrcode.updated') {
      await this.handleQrCodeUpdate(instance.id, payload.data);
    } else if (event === 'connection.update') {
      await this.handleConnectionUpdate(instance, payload.data);
    }
  }

  private async handleQrCodeUpdate(
    instanceId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const qrData = data as {
      qrcode?: { base64?: string };
      base64?: string;
    };
    const base64 = qrData.qrcode?.base64 ?? qrData.base64 ?? null;

    if (base64) {
      await this.prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: { qrCodeBase64: base64, status: 'PENDING_QR' },
      });
    }
  }

  private async handleConnectionUpdate(
    instance: {
      id: string;
      instanceName: string;
      companyId: string;
    },
    data: Record<string, unknown>,
  ): Promise<void> {
    const state = data['state'] as string | undefined;

    if (state === 'open') {
      const info = await this.evolution.fetchInstance(
        instance.instanceName,
      );
      const phoneNumber = info.ownerJid
        ? (info.ownerJid.split('@')[0] ?? null)
        : null;

      await this.prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: {
          status: 'CONNECTED',
          phoneNumber,
          profileName: info.profileName,
          profilePicUrl: info.profilePicUrl,
          lastConnectedAt: new Date(),
          qrCodeBase64: null,
          lastError: null,
        },
      });

      if (phoneNumber) {
        await this.prisma.company
          .update({
            where: { id: instance.companyId },
            data: { whatsappNumber: phoneNumber },
          })
          .catch(() => {});
      }
    } else if (state === 'close') {
      await this.prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { status: 'DISCONNECTED' },
      });
    } else if (state === 'connecting') {
      await this.prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { status: 'CONNECTING' },
      });
    }
  }

  private async handleIncomingMessage(
    instanceName: string,
    data: MessageData,
  ): Promise<void> {
    if (data.key?.fromMe === true) return;
    if (data.key?.remoteJid?.endsWith('@g.us')) return;

    const senderNumber = data.key?.remoteJid?.split('@')[0];
    if (!senderNumber) return;

    const plainText =
      data.message?.conversation ??
      data.message?.extendedTextMessage?.text;

    const hasImage = !!data.message?.imageMessage;
    const hasAudio = !!data.message?.audioMessage;
    const imageCaption = data.message?.imageMessage?.caption ?? null;

    // Precisa ter algum conteúdo processável
    const messageText =
      plainText ??
      (hasImage ? imageCaption ?? '[imagem enviada]' : null) ??
      (hasAudio ? '[áudio enviado]' : null);
    if (!messageText) return;

    const externalMessageId = data.key?.id;
    if (externalMessageId) {
      const existing = await this.prisma.whatsAppMessage.findFirst({
        where: { externalMessageId },
      });
      if (existing) return;
    }

    // Roteamento: identifica o cliente pelo número do remetente.
    // Cada usuário do Meu Caixa tem um phone único → usamos isso como chave.
    const sender = await this.prisma.user.findUnique({
      where: { phone: senderNumber },
      select: { id: true, name: true, companyId: true, isActive: true },
    });

    await this.prisma.whatsAppMessage.create({
      data: {
        companyId: sender?.companyId ?? null,
        userId: sender?.id ?? null,
        phoneNumber: senderNumber,
        direction: 'INBOUND',
        messageText,
        externalMessageId,
      },
    });

    if (!sender || !sender.isActive) {
      const reply =
        '👋 Olá! Esse número ainda não está cadastrado no Meu Caixa.\n\n' +
        'Crie sua conta em https://meucaixa.store e cadastre este mesmo WhatsApp para começar a usar.';
      await this.evolution
        .sendTextMessage(instanceName, senderNumber, reply)
        .catch(() => {});
      await this.prisma.whatsAppMessage.create({
        data: {
          companyId: null,
          phoneNumber: senderNumber,
          direction: 'OUTBOUND',
          messageText: reply,
          actionTaken: 'not_registered',
        },
      });
      return;
    }

    const companyId = sender.companyId;

    if (!this.appConfig.isAiConfigured()) {
      await this.evolution
        .sendTextMessage(
          instanceName,
          senderNumber,
          'Olá! O assistente de IA ainda não foi configurado. Entre em contato com o administrador.',
        )
        .catch(() => {});
      return;
    }

    // Áudio: fallback educado (gpt-4o-mini não transcreve)
    if (hasAudio) {
      const reply =
        '🎤 Recebi seu áudio, mas ainda não consigo escutar — me envie a mesma informação em texto, por favor. Exemplo: "gastei 50 no uber".';
      await this.evolution
        .sendTextMessage(instanceName, senderNumber, reply)
        .catch(() => {});
      await this.prisma.whatsAppMessage.create({
        data: {
          companyId,
          userId: sender.id,
          phoneNumber: senderNumber,
          direction: 'OUTBOUND',
          messageText: reply,
          actionTaken: 'audio_not_supported',
        },
      });
      return;
    }

    const [segmentsList, categoriesList] = await Promise.all([
      this.segments.findAll(companyId),
      this.categories.findAll(companyId),
    ]);

    const context = {
      segments: segmentsList.map((s) => s.name),
      categories: categoriesList.map((c) => c.name),
    };

    let interpretation;
    if (hasImage) {
      // Baixa a imagem da Evolution e manda pro gpt-4o-mini vision
      const media = await this.evolution.getMediaBase64(instanceName, {
        id: data.key?.id,
        remoteJid: data.key?.remoteJid,
        fromMe: data.key?.fromMe,
      });
      if (!media) {
        const reply =
          '❌ Não consegui baixar a imagem. Tente enviar de novo ou descrever em texto.';
        await this.evolution
          .sendTextMessage(instanceName, senderNumber, reply)
          .catch(() => {});
        await this.prisma.whatsAppMessage.create({
          data: {
            companyId,
            userId: sender.id,
            phoneNumber: senderNumber,
            direction: 'OUTBOUND',
            messageText: reply,
            actionTaken: 'image_fetch_failed',
          },
        });
        return;
      }
      interpretation = await this.ai.interpretImage(
        media.base64,
        media.mimetype,
        imageCaption,
        context,
      );
    } else {
      interpretation = await this.ai.interpretMessage(messageText, context);
    }

    const result = await this.executeIntent(companyId, interpretation);

    try {
      await this.evolution.sendTextMessage(
        instanceName,
        senderNumber,
        result.responseText,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar resposta: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
    }

    await this.prisma.whatsAppMessage.create({
      data: {
        companyId,
        userId: sender.id,
        phoneNumber: senderNumber,
        direction: 'OUTBOUND',
        messageText: result.responseText,
        aiInterpretation:
          interpretation as unknown as Prisma.InputJsonValue,
        actionTaken: result.actionTaken,
        relatedTransactionId: result.relatedTransactionId,
      },
    });
  }

  private async executeIntent(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    switch (interpretation.intent) {
      case 'register_expense':
        return this.executeRegisterTransaction(
          companyId,
          interpretation,
          'EXPENSE',
        );
      case 'register_income':
        return this.executeRegisterTransaction(
          companyId,
          interpretation,
          'INCOME',
        );
      case 'query_balance':
        return this.executeQueryBalance(companyId);
      case 'query_expenses_month':
        return this.executeQueryExpensesMonth(companyId);
      case 'query_upcoming':
        return this.executeQueryUpcoming(companyId);
      case 'query_report':
        return this.executeQueryReport(companyId, interpretation);
      case 'delete_last':
        return this.executeDeleteLast(companyId);
      case 'update_last':
        return this.executeUpdateLast(companyId, interpretation);
      case 'help':
        return {
          responseText: this.buildHelpMessage(),
          actionTaken: 'help',
          relatedTransactionId: null,
        };
      case 'greeting':
        return {
          responseText:
            '👋 Olá! Sou o assistente do *Meu Caixa*. Posso te ajudar a:\n\n' +
            '💸 Registrar despesas: _"gastei 50 no uber"_\n' +
            '💰 Registrar receitas: _"recebi 2k do cliente"_\n' +
            '📊 Gerar relatórios: _"quanto ganhei essa semana"_\n' +
            '💼 Consultar saldo: _"qual meu saldo"_\n\n' +
            'Envie *ajuda* a qualquer momento para ver todos os comandos.',
          actionTaken: 'greeting',
          relatedTransactionId: null,
        };
      default:
        return {
          responseText:
            '🤔 Sou o assistente do *Meu Caixa* — só consigo te ajudar com finanças (despesas, receitas, saldo e relatórios).\n\n' +
            'Envie *ajuda* para ver os comandos disponíveis.',
          actionTaken: 'unknown',
          relatedTransactionId: null,
        };
    }
  }

  private async executeRegisterTransaction(
    companyId: string,
    interpretation: BotInterpretation,
    type: 'INCOME' | 'EXPENSE',
  ): Promise<HandlerResult> {
    const { data: intentData } = interpretation;
    const amount = intentData.amount;

    if (!amount || amount <= 0) {
      return {
        responseText:
          '❌ Não consegui identificar o valor. Tente algo como: "gastei 50 no uber"',
        actionTaken: 'error_no_amount',
        relatedTransactionId: null,
      };
    }

    const adminUser = await this.prisma.user.findFirst({
      where: { companyId, isActive: true },
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    });

    if (!adminUser) {
      return {
        responseText:
          '❌ Erro interno: nenhum usuário ativo encontrado para esta empresa.',
        actionTaken: 'error_no_user',
        relatedTransactionId: null,
      };
    }

    let categoryId: string | undefined;
    let categoryName: string | undefined;
    if (intentData.category) {
      const match = await this.prisma.category.findFirst({
        where: {
          companyId,
          name: { equals: intentData.category, mode: 'insensitive' },
        },
      });
      if (match) {
        categoryId = match.id;
        categoryName = match.name;
      }
    }

    let segmentId: string | undefined;
    let segmentName: string | undefined;
    if (intentData.segment) {
      const match = await this.segments.findByName(
        companyId,
        intentData.segment,
      );
      if (match) {
        segmentId = match.id;
        segmentName = match.name;
      }
    }

    const description =
      intentData.description ??
      (type === 'EXPENSE'
        ? 'Despesa via WhatsApp'
        : 'Receita via WhatsApp');

    const transactionDate =
      intentData.date ?? new Date().toISOString().slice(0, 10);

    const transaction = await this.transactions.create(
      companyId,
      adminUser.id,
      {
        type,
        amount,
        description,
        date: transactionDate,
        status: 'PAID',
        paymentDate: transactionDate,
        categoryId,
        segmentId,
      },
    );

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { source: 'WHATSAPP' },
    });

    const emoji = type === 'EXPENSE' ? '💸' : '💰';
    const label = type === 'EXPENSE' ? 'Despesa' : 'Receita';
    const formattedAmount = amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    let response = `${emoji} *${label} registrada!*\n\n`;
    response += `• Valor: *${formattedAmount}*\n`;
    response += `• Descrição: ${description}\n`;
    if (categoryName) response += `• Categoria: ${categoryName}\n`;
    if (segmentName) response += `• Segmento: ${segmentName}\n`;
    response += `• Data: ${transactionDate}\n`;
    response += '• Status: Pago ✅';

    return {
      responseText: response,
      actionTaken: `registered_${type.toLowerCase()}`,
      relatedTransactionId: transaction.id,
    };
  }

  private async executeQueryBalance(
    companyId: string,
  ): Promise<HandlerResult> {
    const accounts = await this.bankAccounts.findAll(companyId);

    if (accounts.length === 0) {
      return {
        responseText:
          '🏦 Nenhuma conta bancária cadastrada. Cadastre suas contas no dashboard para consultar saldo.',
        actionTaken: 'query_balance_empty',
        relatedTransactionId: null,
      };
    }

    let totalBalance = 0;
    let response = '🏦 *Saldo das suas contas:*\n\n';

    for (const acc of accounts) {
      const balance = Number(acc.currentBalance);
      totalBalance += balance;
      const formatted = balance.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      response += `• ${acc.name}: *${formatted}*\n`;
    }

    const totalFormatted = totalBalance.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    response += `\n📊 *Total: ${totalFormatted}*`;

    return {
      responseText: response,
      actionTaken: 'query_balance',
      relatedTransactionId: null,
    };
  }

  private async executeQueryExpensesMonth(
    companyId: string,
  ): Promise<HandlerResult> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        companyId,
        type: 'EXPENSE',
        status: 'PAID',
        date: { gte: firstDay, lte: lastDay },
      },
      _sum: { amount: true },
      _count: true,
    });

    const total = Number(aggregate._sum.amount ?? 0);
    const count = aggregate._count;

    const byCategory = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        companyId,
        type: 'EXPENSE',
        status: 'PAID',
        date: { gte: firstDay, lte: lastDay },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 3,
    });

    const totalFormatted = total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    let response = `📊 *Despesas de ${monthName}:*\n\n`;
    response += `• Total: *${totalFormatted}* (${String(count)} transações)\n`;

    if (byCategory.length > 0) {
      response += '\n🏷️ *Top categorias:*\n';
      for (const item of byCategory) {
        const catAmount = Number(item._sum.amount ?? 0);
        const catFormatted = catAmount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        if (item.categoryId) {
          const cat = await this.prisma.category.findUnique({
            where: { id: item.categoryId },
          });
          response += `• ${cat?.name ?? 'Sem categoria'}: ${catFormatted}\n`;
        } else {
          response += `• Sem categoria: ${catFormatted}\n`;
        }
      }
    }

    return {
      responseText: response,
      actionTaken: 'query_expenses_month',
      relatedTransactionId: null,
    };
  }

  private resolveReportRange(
    data: BotInterpretation['data'],
  ): { start: Date; end: Date; label: string } | null {
    const now = new Date();
    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    switch (data.period) {
      case 'today': {
        return { start: startOfDay(now), end: endOfDay(now), label: 'Hoje' };
      }
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { start: startOfDay(y), end: endOfDay(y), label: 'Ontem' };
      }
      case 'this_week': {
        const dow = now.getDay(); // 0 = domingo
        const start = new Date(now);
        start.setDate(now.getDate() - dow);
        return {
          start: startOfDay(start),
          end: endOfDay(now),
          label: 'Esta semana',
        };
      }
      case 'last_week': {
        const dow = now.getDay();
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - dow);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
        return {
          start: startOfDay(lastWeekStart),
          end: endOfDay(lastWeekEnd),
          label: 'Semana passada',
        };
      }
      case 'this_month': {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `${monthNames[now.getMonth()]}/${now.getFullYear()}`,
        };
      }
      case 'last_month': {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `${monthNames[s.getMonth()]}/${s.getFullYear()}`,
        };
      }
      case 'specific_month': {
        const m = data.monthNumber;
        const y = data.year ?? now.getFullYear();
        if (!m || m < 1 || m > 12) return null;
        const s = new Date(y, m - 1, 1);
        const e = new Date(y, m, 0);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `${monthNames[m - 1]}/${y}`,
        };
      }
      case 'last_n_months': {
        const n = data.n ?? 3;
        const s = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `Últimos ${n} meses`,
        };
      }
      case 'last_n_days': {
        const n = data.n ?? 7;
        const s = new Date(now);
        s.setDate(now.getDate() - (n - 1));
        return {
          start: startOfDay(s),
          end: endOfDay(now),
          label: `Últimos ${n} dias`,
        };
      }
      case 'this_year': {
        const s = new Date(now.getFullYear(), 0, 1);
        const e = new Date(now.getFullYear(), 11, 31);
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `${now.getFullYear()}`,
        };
      }
      case 'custom': {
        if (!data.startDate || !data.endDate) return null;
        const s = new Date(data.startDate);
        const e = new Date(data.endDate);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
        const fmt = (d: Date) =>
          d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: `${fmt(s)} → ${fmt(e)}`,
        };
      }
      default:
        return null;
    }
  }

  private async executeQueryReport(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    const range = this.resolveReportRange(interpretation.data);
    if (!range) {
      return {
        responseText:
          '❓ Não consegui entender o período. Tente algo como: "relatório do mês", "quanto ganhei essa semana", "gastei quanto em janeiro".',
        actionTaken: 'report_invalid_period',
        relatedTransactionId: null,
      };
    }

    const reportType = interpretation.data.reportType ?? 'all';
    const groupBy = interpretation.data.groupBy ?? 'category';
    const showIncome = reportType === 'income' || reportType === 'all' || reportType === 'profit';
    const showExpense = reportType === 'expense' || reportType === 'all' || reportType === 'profit';

    const baseWhere = {
      companyId,
      status: 'PAID' as const,
      date: { gte: range.start, lte: range.end },
    };

    const [incomeAgg, expenseAgg] = await Promise.all([
      showIncome
        ? this.prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'INCOME' },
            _sum: { amount: true },
            _count: true,
          })
        : Promise.resolve(null),
      showExpense
        ? this.prisma.transaction.aggregate({
            where: { ...baseWhere, type: 'EXPENSE' },
            _sum: { amount: true },
            _count: true,
          })
        : Promise.resolve(null),
    ]);

    const incomeTotal = Number(incomeAgg?._sum.amount ?? 0);
    const expenseTotal = Number(expenseAgg?._sum.amount ?? 0);
    const incomeCount = incomeAgg?._count ?? 0;
    const expenseCount = expenseAgg?._count ?? 0;

    if (incomeCount === 0 && expenseCount === 0) {
      return {
        responseText: `📊 *${range.label}*\n\nNenhum lançamento encontrado nesse período.`,
        actionTaken: 'report_empty',
        relatedTransactionId: null,
      };
    }

    const fmt = (n: number) =>
      n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const groupField: 'categoryId' | 'segmentId' =
      groupBy === 'segment' ? 'segmentId' : 'categoryId';
    const shouldGroup = groupBy !== 'none';

    let response = `📊 *Relatório — ${range.label}*\n`;

    if (showIncome && incomeCount > 0) {
      response += `\n💰 *Receitas:* ${fmt(incomeTotal)} (${incomeCount})`;
      if (shouldGroup) {
        const incomeByGroup = await this.prisma.transaction.groupBy({
          by: [groupField],
          where: { ...baseWhere, type: 'INCOME' },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        });
        for (const item of incomeByGroup) {
          const amount = Number(item._sum.amount ?? 0);
          const id = item[groupField];
          const name = id ? await this.resolveGroupName(groupBy, id) : 'Sem categoria';
          response += `\n  • ${name}: ${fmt(amount)}`;
        }
      }
      response += '\n';
    }

    if (showExpense && expenseCount > 0) {
      response += `\n💸 *Despesas:* ${fmt(expenseTotal)} (${expenseCount})`;
      if (shouldGroup) {
        const expenseByGroup = await this.prisma.transaction.groupBy({
          by: [groupField],
          where: { ...baseWhere, type: 'EXPENSE' },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        });
        for (const item of expenseByGroup) {
          const amount = Number(item._sum.amount ?? 0);
          const id = item[groupField];
          const name = id ? await this.resolveGroupName(groupBy, id) : 'Sem categoria';
          response += `\n  • ${name}: ${fmt(amount)}`;
        }
      }
      response += '\n';
    }

    if (reportType === 'all' || reportType === 'profit') {
      const profit = incomeTotal - expenseTotal;
      const icon = profit >= 0 ? '✅' : '⚠️';
      response += `\n${icon} *${profit >= 0 ? 'Lucro' : 'Prejuízo'}:* ${fmt(profit)}`;
    }

    return {
      responseText: response.trim(),
      actionTaken: 'query_report',
      relatedTransactionId: null,
    };
  }

  private async resolveGroupName(
    groupBy: 'category' | 'segment' | 'none',
    id: string,
  ): Promise<string> {
    if (groupBy === 'segment') {
      const s = await this.prisma.segment.findUnique({ where: { id } });
      return s?.name ?? 'Sem segmento';
    }
    const c = await this.prisma.category.findUnique({ where: { id } });
    return c?.name ?? 'Sem categoria';
  }

  private async executeQueryUpcoming(
    companyId: string,
  ): Promise<HandlerResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);

    const upcoming = await this.prisma.transaction.findMany({
      where: {
        companyId,
        status: 'PENDING',
        dueDate: { gte: today, lte: weekLater },
      },
      include: { category: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    if (upcoming.length === 0) {
      return {
        responseText: '✅ Nenhum vencimento nos próximos 7 dias!',
        actionTaken: 'query_upcoming_empty',
        relatedTransactionId: null,
      };
    }

    let totalPending = 0;
    let response = '📅 *Próximos vencimentos (7 dias):*\n\n';

    for (const tx of upcoming) {
      const txAmount = Number(tx.amount);
      totalPending += txAmount;
      const formatted = txAmount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      const dueFormatted = tx.dueDate
        ? new Date(tx.dueDate).toLocaleDateString('pt-BR')
        : '—';
      const emoji = tx.type === 'EXPENSE' ? '🔴' : '🟢';
      response += `${emoji} ${dueFormatted} — ${tx.description}: *${formatted}*\n`;
    }

    const totalFormatted = totalPending.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    response += `\n💰 *Total pendente: ${totalFormatted}*`;

    return {
      responseText: response,
      actionTaken: 'query_upcoming',
      relatedTransactionId: null,
    };
  }

  private async executeDeleteLast(
    companyId: string,
  ): Promise<HandlerResult> {
    const last = await this.prisma.transaction.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    if (!last) {
      return {
        responseText:
          '❌ Nenhuma transação encontrada para excluir.',
        actionTaken: 'delete_last_empty',
        relatedTransactionId: null,
      };
    }

    const formatted = Number(last.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    await this.transactions.remove(companyId, last.id);

    const emoji = last.type === 'EXPENSE' ? '💸' : '💰';
    const label = last.type === 'EXPENSE' ? 'Despesa' : 'Receita';

    return {
      responseText: `🗑️ Transação excluída!\n\n${emoji} ${last.description}: *${formatted}* (${label})`,
      actionTaken: 'deleted_last',
      relatedTransactionId: last.id,
    };
  }

  private async executeUpdateLast(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    const last = await this.prisma.transaction.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    if (!last) {
      return {
        responseText:
          '❌ Nenhuma transação encontrada para atualizar.',
        actionTaken: 'update_last_empty',
        relatedTransactionId: null,
      };
    }

    const newAmount = interpretation.data.newAmount;
    if (!newAmount || newAmount <= 0) {
      return {
        responseText:
          '❌ Informe o novo valor. Ex: "alterar último para 150"',
        actionTaken: 'update_last_no_amount',
        relatedTransactionId: null,
      };
    }

    const oldFormatted = Number(last.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    await this.prisma.transaction.update({
      where: { id: last.id },
      data: { amount: newAmount },
    });

    const newFormatted = newAmount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    return {
      responseText: `✏️ *Transação atualizada!*\n\n• ${last.description}\n• Antes: ${oldFormatted}\n• Agora: *${newFormatted}*`,
      actionTaken: 'updated_last',
      relatedTransactionId: last.id,
    };
  }

  private buildHelpMessage(): string {
    return `🤖 *Meu Caixa — Assistente Financeiro*

Mande uma mensagem e eu cuido do resto! Exemplos:

💸 *Registrar despesa:*
• "gastei 50 no uber"
• "paguei 200 de luz"
• "saída 1.5k aluguel"

💰 *Registrar receita:*
• "recebi 3k do cliente silva"
• "entrada 500 venda loja"
• "faturei 10k projeto"

🏦 *Consultar saldo:*
• "saldo"
• "quanto tenho em caixa?"

📊 *Despesas do mês:*
• "despesas do mês"
• "quanto gastei esse mês?"

📅 *Próximos vencimentos:*
• "vencimentos"
• "o que vence essa semana?"

🗑️ *Apagar último lançamento:*
• "apagar último"
• "deletar"

✏️ *Atualizar valor do último:*
• "alterar último para 150"
• "corrigir valor para 2k"

_Dica: use "k" para milhares (2k = 2.000)_`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
