import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AppConfigService } from '../../common/config/app.config';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Webhook do WhatsApp Cloud API (Meta Graph API).
 *
 * - GET  /webhooks/whatsapp-cloud → handshake de verificação. Meta envia
 *   hub.mode, hub.verify_token, hub.challenge. Se o token bate com
 *   WHATSAPP_CLOUD_VERIFY_TOKEN, devolvemos o challenge como texto puro.
 * - POST /webhooks/whatsapp-cloud → entrega de eventos (mensagens recebidas,
 *   status de mensagem enviada, etc). Por enquanto só loga e responde 200 OK.
 *   O processamento real (IA + lançamento) vem numa próxima etapa.
 *
 * Doc: developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 */
@Controller('webhooks/whatsapp-cloud')
@SkipThrottle()
export class WhatsAppCloudWebhookController {
  private readonly logger = new Logger(WhatsAppCloudWebhookController.name);

  constructor(private readonly config: AppConfigService) {}

  /**
   * Handshake de verificação. Meta chama com query params:
   *   ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
   *
   * Devolvemos o hub.challenge em text/plain SE o verify_token bater.
   */
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

  /**
   * Entrega de eventos. Por enquanto SÓ LOGA. Sempre responde 200 OK rápido
   * pra Meta não re-enfileirar (eles têm timeout de 20s).
   */
  @Post()
  @Public()
  @HttpCode(200)
  receive(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request,
  ) {
    const body = req.body as unknown;

    // TODO: validar assinatura HMAC com APP_SECRET (não-bloqueante por ora)
    if (signature) {
      this.logger.debug(`[receive] signature header presente: ${signature.slice(0, 16)}...`);
    }

    try {
      const summary = this.summarize(body);
      this.logger.log(`[receive] ${summary}`);
    } catch (err) {
      this.logger.warn(
        `[receive] Falha ao resumir payload: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }

    return { received: true };
  }

  /**
   * Extrai um resumo legível do payload pra log (sem despejar JSON inteiro).
   * Estrutura: entry[].changes[].value.{messages|statuses}.
   */
  private summarize(body: unknown): string {
    if (!body || typeof body !== 'object') return 'payload vazio';

    const obj = body as {
      object?: string;
      entry?: Array<{
        id?: string;
        changes?: Array<{
          field?: string;
          value?: {
            messaging_product?: string;
            metadata?: { phone_number_id?: string; display_phone_number?: string };
            contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
            messages?: Array<{
              id?: string;
              from?: string;
              type?: string;
              text?: { body?: string };
            }>;
            statuses?: Array<{
              id?: string;
              status?: string;
              recipient_id?: string;
            }>;
          };
        }>;
      }>;
    };

    const parts: string[] = [`object=${obj.object ?? '?'}`];

    for (const entry of obj.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const v = change.value;
        if (!v) continue;

        const phoneId = v.metadata?.phone_number_id;
        if (phoneId) parts.push(`phoneId=${phoneId}`);

        for (const m of v.messages ?? []) {
          const preview = m.text?.body?.slice(0, 80) ?? '';
          parts.push(
            `msg from=${m.from} type=${m.type} id=${m.id} text="${preview}"`,
          );
        }

        for (const s of v.statuses ?? []) {
          parts.push(
            `status id=${s.id} status=${s.status} to=${s.recipient_id}`,
          );
        }
      }
    }

    return parts.join(' | ');
  }
}
