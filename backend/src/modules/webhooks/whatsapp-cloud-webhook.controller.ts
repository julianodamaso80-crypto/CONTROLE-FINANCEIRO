import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AppConfigService } from '../../common/config/app.config';
import { Public } from '../../common/decorators/public.decorator';
import {
  WhatsAppService,
  type MessageData,
} from '../whatsapp/whatsapp.service';
import { WhatsAppCloudService } from '../whatsapp-cloud/whatsapp-cloud.service';

/** Mensagem individual no payload da Graph API (entry[].changes[].value.messages[]). */
interface CloudMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  audio?: { id?: string; mime_type?: string; voice?: boolean };
  document?: {
    id?: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
  };
}

interface CloudWebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: CloudMessage[];
        statuses?: Array<{ id?: string; status?: string; recipient_id?: string }>;
      };
    }>;
  }>;
}

/**
 * Webhook do WhatsApp Cloud API (Meta Graph API) — número oficial.
 *
 * - GET  /webhooks/whatsapp-cloud → handshake de verificação.
 * - POST /webhooks/whatsapp-cloud → entrega de eventos. Valida a assinatura
 *   (se APP_SECRET setado), normaliza cada mensagem pro shape interno e
 *   despacha pro pipeline de IA (WhatsAppService.processCloudInbound).
 *   Responde 200 OK rápido — Meta tem timeout de ~20s e re-enfileira.
 */
@Controller('webhooks/whatsapp-cloud')
@SkipThrottle()
export class WhatsAppCloudWebhookController {
  private readonly logger = new Logger(WhatsAppCloudWebhookController.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly whatsapp: WhatsAppService,
    private readonly cloud: WhatsAppCloudService,
  ) {}

  @Get()
  @Public()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ) {
    const expected = this.config.getWhatsAppCloudVerifyToken();

    if (mode === 'subscribe' && token === expected && challenge) {
      this.logger.log('[verify] Handshake OK, devolvendo challenge');
      return res.status(200).type('text/plain').send(challenge);
    }

    this.logger.warn(
      `[verify] Handshake recusado. mode=${mode} tokenMatch=${token === expected}`,
    );
    throw new BadRequestException('Verification failed');
  }

  @Post()
  @Public()
  @HttpCode(200)
  receive(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Valida assinatura HMAC quando APP_SECRET está setado e temos o corpo cru.
    if (req.rawBody && !this.cloud.verifyWebhookSignature(req.rawBody, signature)) {
      this.logger.warn('[receive] Assinatura inválida — descartando payload');
      return { received: true };
    }

    const body = req.body as CloudWebhookBody;

    // Processa fora do ciclo da resposta — Meta só quer o 200 rápido.
    for (const data of this.extractMessages(body)) {
      this.whatsapp.processCloudInbound(data).catch((e: unknown) => {
        this.logger.error(
          `[receive] ${e instanceof Error ? e.message : 'erro desconhecido'}`,
        );
      });
    }

    return { received: true };
  }

  /**
   * Extrai e normaliza as mensagens recebidas pro shape interno MessageData
   * que o pipeline de IA já entende. Ignora statuses (recibos de entrega).
   */
  private extractMessages(body: CloudWebhookBody): MessageData[] {
    if (body.object !== 'whatsapp_business_account') return [];

    const out: MessageData[] = [];
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          const normalized = this.normalize(msg);
          if (normalized) out.push(normalized);
        }
      }
    }
    return out;
  }

  private normalize(msg: CloudMessage): MessageData | null {
    if (!msg.from || !msg.id) return null;

    // remoteJid no formato Baileys pro pipeline extrair o número (digits@...).
    const remoteJid = `${msg.from}@s.whatsapp.net`;

    const message: MessageData['message'] = {};
    let mediaId: string | undefined;

    switch (msg.type) {
      case 'text':
        message.conversation = msg.text?.body;
        break;
      case 'image':
        message.imageMessage = {
          caption: msg.image?.caption,
          mimetype: msg.image?.mime_type,
        };
        mediaId = msg.image?.id;
        break;
      case 'audio':
        message.audioMessage = {
          mimetype: msg.audio?.mime_type,
          ptt: msg.audio?.voice ?? true,
        };
        mediaId = msg.audio?.id;
        break;
      case 'document':
        message.documentMessage = {
          fileName: msg.document?.filename,
          mimetype: msg.document?.mime_type,
          caption: msg.document?.caption,
        };
        mediaId = msg.document?.id;
        break;
      default:
        // Tipos não suportados (location, sticker, etc) — ignora.
        return null;
    }

    return {
      key: {
        id: msg.id,
        fromMe: false,
        remoteJid,
        mediaId,
      },
      message,
      messageType: msg.type,
    };
  }
}
