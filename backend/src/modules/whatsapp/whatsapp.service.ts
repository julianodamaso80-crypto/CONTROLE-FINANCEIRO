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
}

interface MessageData {
  key?: MessageKey;
  message?: MessageContent;
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
    if (!this.appConfig.isWhatsAppConfigured()) {
      throw new ServiceUnavailableException(
        'Integração WhatsApp não configurada. Contate o administrador.',
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
    if (!this.appConfig.isWhatsAppConfigured()) {
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

  async processWebhook(payload: WebhookPayload): Promise<void> {
    if (!this.appConfig.isWhatsAppConfigured()) {
      this.logger.warn(
        'Webhook recebido mas WhatsApp não está configurado — ignorando',
      );
      return;
    }

    const instanceName = payload.instance;
    if (!instanceName) return;

    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { instanceName },
    });

    if (!instance) {
      this.logger.warn(
        `Webhook para instância desconhecida: ${instanceName}`,
      );
      return;
    }

    const event = payload.event?.toLowerCase();

    if (event === 'qrcode.updated') {
      await this.handleQrCodeUpdate(instance.id, payload.data);
    } else if (event === 'connection.update') {
      await this.handleConnectionUpdate(instance, payload.data);
    } else if (event === 'messages.upsert') {
      await this.handleIncomingMessage(
        instance,
        payload.data as unknown as MessageData,
      );
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
    instance: {
      id: string;
      instanceName: string;
      companyId: string;
    },
    data: MessageData,
  ): Promise<void> {
    if (data.key?.fromMe === true) return;
    if (data.key?.remoteJid?.endsWith('@g.us')) return;

    const senderNumber = data.key?.remoteJid?.split('@')[0];
    if (!senderNumber) return;

    const messageText =
      data.message?.conversation ??
      data.message?.extendedTextMessage?.text;
    if (!messageText) return;

    const externalMessageId = data.key?.id;
    if (externalMessageId) {
      const existing = await this.prisma.whatsAppMessage.findFirst({
        where: { externalMessageId },
      });
      if (existing) return;
    }

    await this.prisma.whatsAppMessage.create({
      data: {
        companyId: instance.companyId,
        phoneNumber: senderNumber,
        direction: 'INBOUND',
        messageText,
        externalMessageId,
      },
    });

    const [segmentsList, categoriesList] = await Promise.all([
      this.segments.findAll(instance.companyId),
      this.categories.findAll(instance.companyId),
    ]);

    const context = {
      segments: segmentsList.map((s) => s.name),
      categories: categoriesList.map((c) => c.name),
    };

    const interpretation = await this.ai.interpretMessage(
      messageText,
      context,
    );

    const result = await this.executeIntent(
      instance.companyId,
      interpretation,
    );

    try {
      await this.evolution.sendTextMessage(
        instance.instanceName,
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
        companyId: instance.companyId,
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
      default:
        return {
          responseText:
            '🤔 Não entendi sua mensagem. Envie *ajuda* para ver os comandos disponíveis.',
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
      where: { companyId, role: 'ADMIN', isActive: true },
    });

    if (!adminUser) {
      return {
        responseText:
          '❌ Erro interno: nenhum administrador encontrado.',
        actionTaken: 'error_no_admin',
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
