import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfigService } from '../../common/config/app.config';
import { EvolutionService } from '../evolution/evolution.service';
import { AiService, type LlmUsage } from '../ai/ai.service';
import { TransactionsService } from '../transactions/transactions.service';
import { SegmentsService } from '../segments/segments.service';
import { CategoriesService } from '../categories/categories.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReportsService } from '../reports/reports.service';
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
  remoteJidAlt?: string;
  participant?: string;
  addressingMode?: string;
}

interface MessageContent {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string; mimetype?: string };
  audioMessage?: { mimetype?: string; ptt?: boolean; seconds?: number };
  documentMessage?: { fileName?: string; mimetype?: string; caption?: string };
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
  mediaAttachment?: {
    base64: string;
    fileName: string;
    mimetype: string;
    caption?: string;
  } | null;
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
    private readonly reports: ReportsService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptions: SubscriptionsService,
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

    // WhatsApp usa "LID addressing": remoteJid pode vir como
    // `123456789@lid` (identificador de privacidade). Nesse caso o
    // número real fica em remoteJidAlt. Sempre preferimos o Alt quando
    // presente. Se a JID final ainda for @lid, não é telefone válido.
    const jid = data.key?.remoteJidAlt ?? data.key?.remoteJid;
    if (!jid || jid.endsWith('@lid')) return;
    const senderNumber = jid.split('@')[0];
    if (!senderNumber) return;

    const plainText =
      data.message?.conversation ??
      data.message?.extendedTextMessage?.text;

    const hasImage = !!data.message?.imageMessage;
    const hasAudio = !!data.message?.audioMessage;
    const hasPdf =
      !!data.message?.documentMessage &&
      (data.message.documentMessage.mimetype ?? '').includes('pdf');
    const imageCaption = data.message?.imageMessage?.caption ?? null;
    const pdfCaption = data.message?.documentMessage?.caption ?? null;

    // Precisa ter algum conteúdo processável
    const messageText =
      plainText ??
      (hasImage ? imageCaption ?? '[imagem enviada]' : null) ??
      (hasAudio ? '[áudio enviado]' : null) ??
      (hasPdf ? pdfCaption ?? `[PDF: ${data.message?.documentMessage?.fileName ?? 'documento'}]` : null);
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

    const inboundMessage = await this.prisma.whatsAppMessage.create({
      data: {
        companyId: sender?.companyId ?? null,
        userId: sender?.id ?? null,
        phoneNumber: senderNumber,
        direction: 'INBOUND',
        messageText,
        externalMessageId,
      },
      select: { id: true },
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

    // Bloqueio por assinatura: se trial expirou ou inadimplente,
    // responde com link pra renovar e não processa.
    const accessAllowed =
      await this.subscriptions.isAccessAllowed(companyId);
    if (!accessAllowed) {
      const reply =
        '🔒 Seu acesso ao *Meu Caixa* está suspenso.\n\n' +
        'O período gratuito acabou ou sua assinatura está pendente.\n\n' +
        'Renove agora em: https://meucaixa.store/plano\n\n' +
        'Planos:\n' +
        '• Mensal: R$ 19,90/mês\n' +
        '• Anual: R$ 199,90/ano (economize ~16%)';
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
          actionTaken: 'subscription_expired',
        },
      });
      return;
    }

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

    // Áudio: baixa da Evolution, transcreve via gemini-2.5-flash,
    // depois deixa o pipeline de texto processar normalmente.
    let transcribedText: string | null = null;
    if (hasAudio) {
      const audioMedia = await this.evolution.getMediaBase64(instanceName, {
        id: data.key?.id,
        remoteJid: data.key?.remoteJid,
        fromMe: data.key?.fromMe,
      });
      if (!audioMedia) {
        const reply =
          '❌ Não consegui baixar seu áudio. Tente enviar de novo ou escreva em texto.';
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
            actionTaken: 'audio_fetch_failed',
          },
        });
        return;
      }
      const transcribeResult = await this.ai.transcribeAudio(
        audioMedia.base64,
        audioMedia.mimetype,
      );
      transcribedText = transcribeResult.text;
      if (transcribedText) {
        // Substitui o placeholder "[áudio enviado]" pelo texto transcrito
        // pra facilitar debug e histórico auditável.
        await this.prisma.whatsAppMessage
          .update({
            where: { id: inboundMessage.id },
            data: { messageText: `🎤 ${transcribedText}` },
          })
          .catch(() => undefined);
      }
      if (!transcribedText) {
        const reply =
          '❌ Não consegui entender o áudio. Fale um pouco mais claro ou envie em texto, por favor.';
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
            actionTaken: 'audio_transcribe_failed',
          },
        });
        return;
      }
    }

    // PDF: extrai texto com pdf-parse, alimenta pipeline de texto
    let pdfExtractedText: string | null = null;
    if (hasPdf) {
      const pdfMedia = await this.evolution.getMediaBase64(instanceName, {
        id: data.key?.id,
        remoteJid: data.key?.remoteJid,
        fromMe: data.key?.fromMe,
      });
      if (!pdfMedia) {
        const reply =
          '❌ Não consegui baixar o PDF. Tente enviar de novo ou descrever em texto.';
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
            actionTaken: 'pdf_fetch_failed',
          },
        });
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const buffer = Buffer.from(pdfMedia.base64, 'base64');
        const parsed = await pdfParse(buffer);
        const text = (parsed.text ?? '').trim();

        if (text.length > 20) {
          // PDF com texto extraível — usa como input pro classificador
          pdfExtractedText = text.slice(0, 3000); // limita pra não estourar tokens
          this.logger.log(
            `PDF parsed: ${String(text.length)} chars, truncated to 3000`,
          );
        } else {
          // PDF escaneado (sem texto) — tenta como imagem (primeira página)
          this.logger.log(
            'PDF sem texto extraível — tentando via vision',
          );
        }
      } catch (err) {
        this.logger.warn(
          `pdf-parse falhou: ${err instanceof Error ? err.message : 'erro'}`,
        );
      }

      // Se não conseguiu extrair texto, pede pro cliente descrever
      if (!pdfExtractedText) {
        const reply =
          '📄 Recebi seu PDF, mas não consegui ler o conteúdo. ' +
          'Me descreve o que é: por exemplo, _"despesa de 500 da nota de bobina"_ ou _"receita de 2k do cliente silva"_.';
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
            actionTaken: 'pdf_unreadable',
          },
        });
        return;
      }
    }

    const [segmentsList, categoriesList] = await Promise.all([
      this.segments.findAll(companyId),
      this.categories.findAll(companyId),
    ]);

    // Monta contexto com hierarquia 3 níveis: Pai > Sub > SubDaSub
    const categoryTree: string[] = [];
    const roots = categoriesList.filter((c) => !c.parentCategoryId);
    for (const root of roots) {
      const level1 = categoriesList.filter(
        (c) => c.parentCategoryId === root.id,
      );
      if (level1.length === 0) {
        categoryTree.push(root.name);
        continue;
      }
      const parts: string[] = [];
      for (const sub of level1) {
        const level2 = categoriesList.filter(
          (c) => c.parentCategoryId === sub.id,
        );
        if (level2.length > 0) {
          parts.push(
            `${sub.name}(${level2.map((c) => c.name).join(',')})`,
          );
        } else {
          parts.push(sub.name);
        }
      }
      categoryTree.push(`${root.name} > ${parts.join(', ')}`);
    }

    const context = {
      segments: segmentsList.map((s) => s.name),
      categories: categoryTree,
    };

    let interpretation;
    let llmUsage: LlmUsage | null = null;
    // Texto cru que chegou ao classificador. Usado depois como fallback
    // para extrair categoria por substring quando a IA esquece de retornar.
    let rawInputText = messageText;
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
      const imgResult = await this.ai.interpretImage(
        media.base64,
        media.mimetype,
        imageCaption,
        context,
      );
      interpretation = imgResult.interpretation;
      llmUsage = imgResult.usage;
    } else {
      // Texto normal OU áudio já transcrito
      rawInputText = pdfExtractedText ?? transcribedText ?? messageText;

      // Confirmação de exclusão pendente: se o bot acabou de perguntar
      // "confirma? SIM/NÃO" e o cliente respondeu algo afirmativo/negativo,
      // trata a resposta SEM chamar a IA. Janela de 10min.
      const pending = await this.getPendingConfirmation(companyId, senderNumber);
      if (pending) {
        if (this.isConfirmYes(rawInputText)) {
          const result = await this.applyPendingDelete(companyId, pending);
          await this.evolution
            .sendTextMessage(instanceName, senderNumber, result.responseText)
            .catch(() => {});
          await this.prisma.whatsAppMessage.create({
            data: {
              companyId,
              userId: sender.id,
              phoneNumber: senderNumber,
              direction: 'OUTBOUND',
              messageText: result.responseText,
              actionTaken: result.actionTaken,
              relatedTransactionId: result.relatedTransactionId,
            },
          });
          return;
        }
        if (this.isConfirmNo(rawInputText)) {
          const reply = '👍 Ok, cancelado. Nada foi excluído.';
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
              actionTaken: `delete_${pending.kind}_cancelled`,
            },
          });
          return;
        }
        // Qualquer outra coisa: descarta a pendência e segue o fluxo normal
      }

      // Short-circuit: se o cliente manda uma palavra-chave clara de relatório
      // sem especificar período, geramos a intent direto — sem custo de IA e
      // sem risco do modelo cair em "unknown" por mensagem curta.
      const quick = this.quickReportIntent(rawInputText);
      if (quick) {
        interpretation = quick;
        llmUsage = null;
      } else {
        const msgResult = await this.ai.interpretMessage(rawInputText, context);
        interpretation = msgResult.interpretation;
        llmUsage = msgResult.usage;
      }
    }

    // Se veio de PDF e a IA não soube classificar, pergunta ao cliente
    if (hasPdf && interpretation.intent === 'unknown') {
      const reply =
        `📄 Li seu PDF${data.message?.documentMessage?.fileName ? ` (${data.message.documentMessage.fileName})` : ''}, ` +
        'mas não consegui identificar se é uma *despesa* ou *receita*.\n\n' +
        'Me ajuda: responde com algo como:\n' +
        '• _"despesa de 500 nota de bobina"_\n' +
        '• _"receita de 2k referente ao PDF"_\n\n' +
        (interpretation.reasoning
          ? `_O que encontrei no documento: ${interpretation.reasoning}_`
          : '');
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
          actionTaken: 'pdf_needs_clarification',
        },
      });
      return;
    }

    const result = await this.executeIntent(
      companyId,
      sender.id,
      interpretation,
      rawInputText,
    );

    // Quando a mensagem veio por áudio, prepende o que foi transcrito para
    // o usuário ver o que o bot ouviu. Se a transcrição estiver errada,
    // ele corrige na hora com update_last ou delete_last.
    if (transcribedText) {
      const preview =
        transcribedText.length > 200
          ? transcribedText.slice(0, 200) + '…'
          : transcribedText;
      result.responseText = `🎤 _Ouvi: "${preview}"_\n\n${result.responseText}`;
    }

    try {
      if (result.mediaAttachment) {
        await this.evolution.sendDocumentMessage(
          instanceName,
          senderNumber,
          {
            base64: result.mediaAttachment.base64,
            fileName: result.mediaAttachment.fileName,
            mimetype: result.mediaAttachment.mimetype,
            caption: result.responseText,
          },
        );
      } else {
        await this.evolution.sendTextMessage(
          instanceName,
          senderNumber,
          result.responseText,
        );
      }
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
        modelUsed: llmUsage?.model ?? null,
        promptTokens: llmUsage?.promptTokens ?? null,
        completionTokens: llmUsage?.completionTokens ?? null,
        llmCostUsd: llmUsage?.costUsd ?? null,
      },
    });
  }

  /**
   * Normaliza texto pra comparação: trim, lowercase, remove acentos,
   * colapsa espaços múltiplos. Usado no match de categoria/segmento.
   */
  private normalize(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Curto-circuita palavras-chave isoladas de relatório ("Relatório",
   * "Resumo", "Balanço", "Extrato", "Fechamento", "Me dê um relatório",
   * etc) em uma intent query_report com defaults (mês corrente, tudo,
   * agrupado por categoria). Se o cliente escreveu algo mais complexo
   * que não bate o padrão, retorna null e deixa a IA classificar.
   */
  private quickReportIntent(text: string): BotInterpretation | null {
    const norm = this.normalize(text)
      .replace(/[.!?,;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!norm) return null;

    // Palavras-chave puras ou precedidas por pedido curto
    const keywords = [
      'relatorio',
      'relatorios',
      'relat',
      'resumo',
      'resumos',
      'balanco',
      'balancete',
      'extrato',
      'fechamento',
      'consolidado',
      'levantamento',
      'prestacao de contas',
    ];

    const wantsPdf = /\bpdf\b/.test(norm);
    const isReport = keywords.some((kw) => {
      // Palavra solta OU "me dê/manda/gera/quero/preciso + kw"
      if (norm === kw) return true;
      const prefix = /^(me\s+(de|da|manda|envia|envie|gera|gere|passa)\s+(um|uma|o|a)?\s*|quero\s+(um|uma|o|a)?\s*|preciso\s+(de)?\s*(um|uma|o|a)?\s*|manda\s+(um|uma|o|a)?\s*|gera\s+(um|uma|o|a)?\s*|envia\s+(um|uma|o|a)?\s*|da\s+(um|uma|o|a)?\s*)/;
      const stripped = norm.replace(prefix, '').trim();
      return stripped === kw || stripped === `${kw} em pdf` || stripped === `${kw} pdf`;
    });

    if (!isReport) return null;

    return {
      intent: 'query_report',
      confidence: 0.95,
      data: {
        period: 'this_month',
        reportType: 'all',
        groupBy: 'category',
        format: wantsPdf ? 'pdf' : 'text',
      },
      reasoning: 'short-circuit: palavra-chave de relatório sem período explícito',
    };
  }

  /**
   * Fallback robusto pra resolver o ID de uma categoria a partir de:
   * 1) o nome exato devolvido pela IA em intentData.category (match normalizado)
   * 2) caso a IA devolva null, tenta achar alguma categoria cujo nome
   *    (normalizado, em palavras inteiras) apareça na descrição OU no texto
   *    original do usuário. Isso cobre o caso em que o modelo "esquece" de
   *    retornar a categoria mesmo com a palavra no texto.
   */
  private async resolveCategoryId(
    companyId: string,
    type: 'INCOME' | 'EXPENSE',
    aiCategory: string | null | undefined,
    description: string | null | undefined,
    rawText: string | null | undefined,
  ): Promise<{ id?: string; name?: string }> {
    const all = await this.prisma.category.findMany({
      where: { companyId, type },
      select: { id: true, name: true },
    });
    if (all.length === 0) return {};

    const normMap = all.map((c) => ({
      id: c.id,
      name: c.name,
      norm: this.normalize(c.name),
    }));

    if (aiCategory) {
      const target = this.normalize(aiCategory);
      const exact = normMap.find((c) => c.norm === target);
      if (exact) return { id: exact.id, name: exact.name };
      // Tolerância: a IA pode ter plural/singular. Tenta startsWith dos dois lados.
      const partial = normMap.find(
        (c) => c.norm.startsWith(target) || target.startsWith(c.norm),
      );
      if (partial) return { id: partial.id, name: partial.name };
    }

    // Fallback por substring no texto (descrição + texto original).
    // Procura palavras inteiras — evita que "loja" bate com "relojoaria".
    const haystack = this.normalize(
      [description, rawText].filter(Boolean).join(' '),
    );
    if (haystack) {
      // Ordena por nome mais longo primeiro (match mais específico vence).
      const sorted = [...normMap].sort((a, b) => b.norm.length - a.norm.length);
      for (const c of sorted) {
        if (!c.norm) continue;
        // Word boundary com regex escapado
        const escaped = c.norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`);
        if (re.test(haystack)) return { id: c.id, name: c.name };
      }
    }

    return {};
  }

  private async executeIntent(
    companyId: string,
    userId: string,
    interpretation: BotInterpretation,
    rawText: string = '',
  ): Promise<HandlerResult> {
    switch (interpretation.intent) {
      case 'register_expense':
        return this.executeRegisterTransaction(
          companyId,
          interpretation,
          'EXPENSE',
          rawText,
        );
      case 'register_income':
        return this.executeRegisterTransaction(
          companyId,
          interpretation,
          'INCOME',
          rawText,
        );
      case 'query_balance':
        return this.executeQueryBalance(companyId);
      case 'query_expenses_month':
        return this.executeQueryExpensesMonth(companyId);
      case 'query_upcoming':
        return this.executeQueryUpcoming(companyId);
      case 'query_report':
        return this.executeQueryReport(companyId, userId, interpretation);
      case 'delete_last':
        return this.executeDeleteLast(companyId);
      case 'update_last':
        return this.executeUpdateLast(companyId, interpretation);
      case 'create_category':
        return this.executeCreateCategory(companyId, interpretation);
      case 'create_segment':
        return this.executeCreateSegment(companyId, interpretation);
      case 'delete_category':
        return this.executeDeleteCategory(companyId, interpretation);
      case 'delete_segment':
        return this.executeDeleteSegment(companyId, interpretation);
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
    rawText: string = '',
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

    // Resolve categoria: primeiro tenta match pelo que a IA retornou,
    // cai pra substring do texto/descrição se a IA deixou null.
    // O cadastro do cliente é a fonte da verdade — se a palavra está
    // na mensagem e bate com uma categoria cadastrada, USA.
    const resolvedCategory = await this.resolveCategoryId(
      companyId,
      type,
      intentData.category ?? null,
      intentData.description ?? null,
      rawText,
    );
    const categoryId = resolvedCategory.id;
    const categoryName = resolvedCategory.name;

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
    // Fallback segmento por substring se IA não retornou
    if (!segmentId) {
      const allSeg = await this.prisma.segment.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
      });
      const haystack = this.normalize(
        [intentData.description, rawText].filter(Boolean).join(' '),
      );
      if (haystack && allSeg.length > 0) {
        const sorted = [...allSeg].sort(
          (a, b) => b.name.length - a.name.length,
        );
        for (const s of sorted) {
          const n = this.normalize(s.name);
          if (!n) continue;
          const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`\\b${escaped}\\b`).test(haystack)) {
            segmentId = s.id;
            segmentName = s.name;
            break;
          }
        }
      }
    }

    const description =
      intentData.description ??
      (type === 'EXPENSE'
        ? 'Despesa via WhatsApp'
        : 'Receita via WhatsApp');

    // Data "de hoje" sempre no timezone de São Paulo (YYYY-MM-DD)
    const todaySP = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const isPending =
      intentData.status === 'PENDING' && !!intentData.dueDate;
    const dueDate = intentData.dueDate;
    const transactionDate = isPending
      ? (dueDate as string)
      : (intentData.date ?? todaySP);

    const transaction = await this.transactions.create(
      companyId,
      adminUser.id,
      {
        type,
        amount,
        description,
        date: transactionDate,
        status: isPending ? 'PENDING' : 'PAID',
        ...(isPending
          ? { dueDate: dueDate as string }
          : { paymentDate: transactionDate }),
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

    // Converte YYYY-MM-DD → DD/MM/YYYY pra exibir pro usuário
    const [ty, tm, td] = transactionDate.split('-');
    const transactionDateBR = `${td}/${tm}/${ty}`;

    let response: string;
    if (isPending) {
      response = `🔔 *Boleto registrado!*\n\n`;
      response += `• Valor: *${formattedAmount}*\n`;
      response += `• Descrição: ${description}\n`;
      if (categoryName) response += `• Categoria: ${categoryName}\n`;
      if (segmentName) response += `• Segmento: ${segmentName}\n`;
      response += `• Vencimento: ${transactionDateBR}\n`;
      response += `• Status: Pendente ⏳\n\n`;
      response += `Vou te lembrar às *9h da manhã* no dia do vencimento. ✅`;
    } else {
      response = `${emoji} *${label} registrada!*\n\n`;
      response += `• Valor: *${formattedAmount}*\n`;
      response += `• Descrição: ${description}\n`;
      if (categoryName) response += `• Categoria: ${categoryName}\n`;
      if (segmentName) response += `• Segmento: ${segmentName}\n`;
      response += `• Data: ${transactionDateBR}\n`;
      response += '• Status: Pago ✅';
    }

    return {
      responseText: response,
      actionTaken: isPending
        ? `registered_pending_${type.toLowerCase()}`
        : `registered_${type.toLowerCase()}`,
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

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });

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
            timeZone: 'America/Sao_Paulo',
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
    userId: string,
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

    if (interpretation.data.format === 'pdf') {
      return this.executeQueryReportPdf(companyId, userId, range);
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

  private async executeQueryReportPdf(
    companyId: string,
    userId: string,
    range: { start: Date; end: Date; label: string },
  ): Promise<HandlerResult> {
    const usage = await this.reports.getUsage(companyId);
    if (usage.used >= usage.limit) {
      const resets = new Date(usage.resetsAt).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });
      return {
        responseText:
          `📄 Você já usou os *${usage.limit} PDFs* deste mês.\n` +
          `Libera em *${resets}*.\n\n` +
          `Se quiser, posso te enviar o resumo em *texto* agora — é só pedir "relatório do mês".`,
        actionTaken: 'report_pdf_rate_limited',
        relatedTransactionId: null,
      };
    }

    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    const from = toIso(range.start);
    const to = toIso(range.end);

    try {
      const { pdf, filename } = await this.reports.generate({
        companyId,
        userId,
        from,
        to,
        source: 'WHATSAPP',
      });

      const caption =
        `📄 *Relatório em PDF — ${range.label}*\n\n` +
        `Usei ${usage.used + 1}/${usage.limit} PDFs deste mês.`;

      return {
        responseText: caption,
        actionTaken: 'report_pdf_sent',
        relatedTransactionId: null,
        mediaAttachment: {
          base64: pdf.toString('base64'),
          fileName: filename,
          mimetype: 'application/pdf',
        },
      };
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao gerar PDF';
      this.logger.error(`executeQueryReportPdf: ${msg}`);
      return {
        responseText: `❌ Não consegui gerar o PDF: ${msg}`,
        actionTaken: 'report_pdf_error',
        relatedTransactionId: null,
      };
    }
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
        ? new Date(tx.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
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

    const { data: d } = interpretation;
    const updateData: Prisma.TransactionUpdateInput = {};
    const changes: string[] = [];
    const oldFormatted = Number(last.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    // Correção de valor
    if (d.newAmount && d.newAmount > 0) {
      updateData.amount = d.newAmount;
      const newFormatted = d.newAmount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      changes.push(`• Valor: ${oldFormatted} → *${newFormatted}*`);
    }

    // Correção de categoria
    if (d.category) {
      const resolved = await this.resolveCategoryId(
        companyId,
        last.type as 'INCOME' | 'EXPENSE',
        d.category,
        null,
        null,
      );
      if (resolved.id) {
        updateData.category = { connect: { id: resolved.id } };
        changes.push(`• Categoria: *${resolved.name}*`);
      } else {
        return {
          responseText:
            `❌ A categoria "${d.category}" não existe. ` +
            `Cadastre ela primeiro no painel ou use uma das já cadastradas.`,
          actionTaken: 'update_last_category_not_found',
          relatedTransactionId: last.id,
        };
      }
    }

    // Correção de segmento
    if (d.segment) {
      const seg = await this.segments.findByName(companyId, d.segment);
      if (seg) {
        updateData.segment = { connect: { id: seg.id } };
        changes.push(`• Segmento: *${seg.name}*`);
      } else {
        return {
          responseText:
            `❌ O segmento "${d.segment}" não existe. ` +
            `Cadastre ele primeiro no painel ou use um dos já cadastrados.`,
          actionTaken: 'update_last_segment_not_found',
          relatedTransactionId: last.id,
        };
      }
    }

    if (changes.length === 0) {
      return {
        responseText:
          `✏️ Quer corrigir o último lançamento (_${last.description}_)?\n\n` +
          `Me diga o que mudar:\n` +
          `• _"muda o valor pra 150"_\n` +
          `• _"categoria shopee"_\n` +
          `• _"segmento loja"_`,
        actionTaken: 'update_last_no_data',
        relatedTransactionId: last.id,
      };
    }

    await this.prisma.transaction.update({
      where: { id: last.id },
      data: updateData,
    });

    return {
      responseText:
        `✏️ *Lançamento atualizado!*\n\n` +
        `_${last.description}_\n` +
        changes.join('\n'),
      actionTaken: 'updated_last',
      relatedTransactionId: last.id,
    };
  }

  private async executeCreateCategory(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    const { data: d } = interpretation;
    const rawName = (d.newName ?? '').trim();

    if (!rawName) {
      return {
        responseText:
          '❌ Não entendi o nome da categoria. Tente: _"cria categoria Aluguel em despesa"_',
        actionTaken: 'create_category_no_name',
        relatedTransactionId: null,
      };
    }

    const type = d.categoryType ?? 'EXPENSE';

    // Verifica duplicata (case-insensitive + sem acento)
    const existing = await this.prisma.category.findMany({
      where: { companyId, type },
      select: { id: true, name: true },
    });
    const target = this.normalize(rawName);
    const dup = existing.find((c) => this.normalize(c.name) === target);
    if (dup) {
      const typeLabel =
        type === 'EXPENSE' ? 'despesa' : type === 'INCOME' ? 'receita' : 'ambos';
      return {
        responseText:
          `ℹ️ A categoria *${dup.name}* já existe em ${typeLabel}. Nada pra criar.`,
        actionTaken: 'create_category_duplicate',
        relatedTransactionId: null,
      };
    }

    const name = this.titleCase(rawName);
    const color = this.pickDefaultColor(type);
    const icon = type === 'INCOME' ? 'trending-up' : 'tag';

    try {
      await this.categories.create(companyId, { name, type, color, icon });
    } catch (err) {
      this.logger.error(
        `Falha ao criar categoria via WhatsApp: ${err instanceof Error ? err.message : 'erro'}`,
      );
      return {
        responseText:
          '❌ Não consegui criar a categoria agora. Tenta de novo em instantes.',
        actionTaken: 'create_category_error',
        relatedTransactionId: null,
      };
    }

    const typeLabel =
      type === 'EXPENSE'
        ? 'despesa'
        : type === 'INCOME'
          ? 'receita'
          : 'despesa e receita';
    const emoji = type === 'INCOME' ? '💰' : type === 'BOTH' ? '🔁' : '💸';

    return {
      responseText:
        `✅ Categoria criada!\n\n${emoji} *${name}* (${typeLabel})\n\n` +
        `Agora você pode usar ela nos seus lançamentos.`,
      actionTaken: 'category_created',
      relatedTransactionId: null,
    };
  }

  private async executeCreateSegment(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    const { data: d } = interpretation;
    const rawName = (d.newName ?? '').trim();

    if (!rawName) {
      return {
        responseText:
          '❌ Não entendi o nome do segmento. Tente: _"cria segmento Loja Física"_',
        actionTaken: 'create_segment_no_name',
        relatedTransactionId: null,
      };
    }

    const existing = await this.segments.findByName(companyId, rawName);
    if (existing) {
      return {
        responseText: `ℹ️ O segmento *${existing.name}* já existe. Nada pra criar.`,
        actionTaken: 'create_segment_duplicate',
        relatedTransactionId: null,
      };
    }

    const name = this.titleCase(rawName);

    try {
      await this.segments.create(companyId, { name });
    } catch (err) {
      this.logger.error(
        `Falha ao criar segmento via WhatsApp: ${err instanceof Error ? err.message : 'erro'}`,
      );
      return {
        responseText:
          '❌ Não consegui criar o segmento agora. Tenta de novo em instantes.',
        actionTaken: 'create_segment_error',
        relatedTransactionId: null,
      };
    }

    return {
      responseText:
        `✅ Segmento criado!\n\n🏷️ *${name}*\n\n` +
        `Agora você pode usar ele nos seus lançamentos.`,
      actionTaken: 'segment_created',
      relatedTransactionId: null,
    };
  }

  /**
   * Procura a categoria pelo nome (normalizado) — opcionalmente restringindo
   * por tipo. Retorna TODAS as correspondências pra o handler decidir se é
   * ambígua (existe em despesa E receita com mesmo nome).
   */
  private async findCategoriesByName(
    companyId: string,
    name: string,
    type?: 'INCOME' | 'EXPENSE' | 'BOTH',
  ): Promise<Array<{ id: string; name: string; type: string }>> {
    const all = await this.prisma.category.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      select: { id: true, name: true, type: true },
    });
    const target = this.normalize(name);
    return all.filter((c) => this.normalize(c.name) === target);
  }

  private async executeDeleteCategory(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    const { data: d } = interpretation;
    const rawName = (d.newName ?? '').trim();

    if (!rawName) {
      return {
        responseText:
          '❌ Não entendi qual categoria excluir. Tente: _"exclui categoria Aluguel"_',
        actionTaken: 'delete_category_no_name',
        relatedTransactionId: null,
      };
    }

    const matches = await this.findCategoriesByName(
      companyId,
      rawName,
      d.categoryType,
    );

    if (matches.length === 0) {
      return {
        responseText:
          `❌ Não encontrei a categoria *${rawName}*. ` +
          `Verifique o nome ou liste no painel web.`,
        actionTaken: 'delete_category_not_found',
        relatedTransactionId: null,
      };
    }

    if (matches.length > 1) {
      const opts = matches
        .map((c) => `• *${c.name}* (${c.type === 'EXPENSE' ? 'despesa' : c.type === 'INCOME' ? 'receita' : 'ambos'})`)
        .join('\n');
      return {
        responseText:
          `⚠️ Encontrei *${matches.length}* categorias com nome "${rawName}":\n\n${opts}\n\n` +
          `Especifique o tipo: _"exclui categoria ${rawName} de despesa"_`,
        actionTaken: 'delete_category_ambiguous',
        relatedTransactionId: null,
      };
    }

    const target = matches[0]!;
    const txCount = await this.prisma.transaction.count({
      where: { companyId, categoryId: target.id },
    });
    const childCount = await this.prisma.category.count({
      where: { companyId, parentCategoryId: target.id },
    });

    // Se tem dependências, já avisa — não deixa nem chegar na confirmação
    if (txCount > 0) {
      return {
        responseText:
          `🚫 Não dá pra excluir *${target.name}*: existem *${txCount}* transações usando essa categoria. ` +
          `Mova ou apague as transações primeiro.`,
        actionTaken: 'delete_category_has_transactions',
        relatedTransactionId: null,
      };
    }
    if (childCount > 0) {
      return {
        responseText:
          `🚫 Não dá pra excluir *${target.name}*: existem *${childCount}* subcategorias. ` +
          `Exclua as subcategorias primeiro.`,
        actionTaken: 'delete_category_has_children',
        relatedTransactionId: null,
      };
    }

    const typeLabel =
      target.type === 'EXPENSE'
        ? 'despesa'
        : target.type === 'INCOME'
          ? 'receita'
          : 'ambos';

    return {
      responseText:
        `⚠️ Confirma a exclusão da categoria *${target.name}* (${typeLabel})?\n\n` +
        `Responda *SIM* para confirmar ou *NÃO* para cancelar.`,
      actionTaken: `awaiting_delete_category_confirm:${target.id}`,
      relatedTransactionId: null,
    };
  }

  private async executeDeleteSegment(
    companyId: string,
    interpretation: BotInterpretation,
  ): Promise<HandlerResult> {
    const { data: d } = interpretation;
    const rawName = (d.newName ?? '').trim();

    if (!rawName) {
      return {
        responseText:
          '❌ Não entendi qual segmento excluir. Tente: _"exclui segmento Loja Física"_',
        actionTaken: 'delete_segment_no_name',
        relatedTransactionId: null,
      };
    }

    const target = await this.segments.findByName(companyId, rawName);
    if (!target) {
      return {
        responseText: `❌ Não encontrei o segmento *${rawName}*.`,
        actionTaken: 'delete_segment_not_found',
        relatedTransactionId: null,
      };
    }

    return {
      responseText:
        `⚠️ Confirma a exclusão do segmento *${target.name}*?\n\n` +
        `Responda *SIM* para confirmar ou *NÃO* para cancelar.\n\n` +
        `_(Segmentos são desativados — as transações antigas continuam intactas.)_`,
      actionTaken: `awaiting_delete_segment_confirm:${target.id}`,
      relatedTransactionId: null,
    };
  }

  /**
   * Checa se a última mensagem OUTBOUND pra esse telefone está aguardando
   * um SIM/NÃO de confirmação de exclusão, em até 10min.
   * Retorna null se não há pendência.
   */
  private async getPendingConfirmation(
    companyId: string,
    phoneNumber: string,
  ): Promise<{ kind: 'category' | 'segment'; targetId: string } | null> {
    const last = await this.prisma.whatsAppMessage.findFirst({
      where: {
        companyId,
        phoneNumber,
        direction: 'OUTBOUND',
      },
      orderBy: { createdAt: 'desc' },
      select: { actionTaken: true, createdAt: true },
    });
    if (!last || !last.actionTaken) return null;
    const ageMs = Date.now() - last.createdAt.getTime();
    if (ageMs > 10 * 60 * 1000) return null;

    const m = /^awaiting_delete_(category|segment)_confirm:([0-9a-f-]{36})$/i.exec(
      last.actionTaken,
    );
    if (!m) return null;
    return { kind: m[1] as 'category' | 'segment', targetId: m[2]! };
  }

  private isConfirmYes(text: string): boolean {
    const t = this.normalize(text).replace(/[.!?,;:]/g, '').trim();
    return [
      'sim',
      's',
      'confirma',
      'confirmo',
      'confirmar',
      'ok',
      'pode',
      'pode sim',
      'pode ser',
      'manda',
      'manda ver',
      'isso',
      'yes',
      'yep',
      'bora',
      'positivo',
    ].includes(t);
  }

  private isConfirmNo(text: string): boolean {
    const t = this.normalize(text).replace(/[.!?,;:]/g, '').trim();
    return [
      'nao',
      'n',
      'cancela',
      'cancelar',
      'para',
      'deixa',
      'deixa quieto',
      'deixa pra la',
      'negativo',
      'no',
      'nope',
    ].includes(t);
  }

  private async applyPendingDelete(
    companyId: string,
    pending: { kind: 'category' | 'segment'; targetId: string },
  ): Promise<HandlerResult> {
    if (pending.kind === 'category') {
      const cat = await this.prisma.category.findFirst({
        where: { id: pending.targetId, companyId },
        select: { id: true, name: true },
      });
      if (!cat) {
        return {
          responseText: '❌ A categoria não existe mais.',
          actionTaken: 'delete_category_gone',
          relatedTransactionId: null,
        };
      }
      try {
        await this.categories.remove(companyId, cat.id);
      } catch (err) {
        return {
          responseText: `❌ Não consegui excluir: ${err instanceof Error ? err.message : 'erro'}`,
          actionTaken: 'delete_category_error',
          relatedTransactionId: null,
        };
      }
      return {
        responseText: `🗑️ Categoria *${cat.name}* excluída com sucesso.`,
        actionTaken: 'category_deleted',
        relatedTransactionId: null,
      };
    }

    // segmento
    const seg = await this.prisma.segment.findFirst({
      where: { id: pending.targetId, companyId },
      select: { id: true, name: true },
    });
    if (!seg) {
      return {
        responseText: '❌ O segmento não existe mais.',
        actionTaken: 'delete_segment_gone',
        relatedTransactionId: null,
      };
    }
    try {
      await this.segments.remove(companyId, seg.id);
    } catch (err) {
      return {
        responseText: `❌ Não consegui excluir: ${err instanceof Error ? err.message : 'erro'}`,
        actionTaken: 'delete_segment_error',
        relatedTransactionId: null,
      };
    }
    return {
      responseText: `🗑️ Segmento *${seg.name}* desativado.`,
      actionTaken: 'segment_deleted',
      relatedTransactionId: null,
    };
  }

  /** Capitaliza a primeira letra de cada palavra, preservando o resto. */
  private titleCase(s: string): string {
    return s
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) =>
        w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w,
      )
      .join(' ');
  }

  /** Cor default alinhada com o tipo (reutiliza verde/vermelho do tema). */
  private pickDefaultColor(type: 'INCOME' | 'EXPENSE' | 'BOTH'): string {
    if (type === 'INCOME') return '#8DFF6B';
    if (type === 'EXPENSE') return '#FF6B6B';
    return '#8DFF6B';
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

🏷️ *Criar categoria/segmento:*
• "cria categoria Aluguel em despesa"
• "cria categoria Vendas Online em receita"
• "cria segmento Loja Física"

🗑️ *Excluir categoria/segmento:* (pede confirmação)
• "exclui categoria Aluguel"
• "apaga segmento Loja Física"

_Dica: use "k" para milhares (2k = 2.000)_`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
