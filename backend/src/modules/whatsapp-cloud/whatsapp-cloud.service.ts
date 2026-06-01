import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import axios, { type AxiosInstance } from 'axios';
import { AppConfigService } from '../../common/config/app.config';

/** Componente de template (corpo, header, botões). Repassado cru pra Graph API. */
export interface TemplateComponent {
  type: 'body' | 'header' | 'button';
  sub_type?: string;
  index?: number;
  parameters: Array<{ type: string; text?: string }>;
}

/**
 * Cliente do WhatsApp Cloud API (Meta Graph API). Espelha a EvolutionService,
 * mas fala com graph.facebook.com no número oficial. O http é criado lazy: o
 * token só é exigido na primeira chamada de envio, então o boot não quebra
 * enquanto WHATSAPP_CLOUD_ACCESS_TOKEN ainda não está setado.
 */
@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger(WhatsAppCloudService.name);
  private _http?: AxiosInstance;

  constructor(private readonly appConfig: AppConfigService) {}

  private get http(): AxiosInstance {
    if (!this._http) {
      this._http = axios.create({
        baseURL: `https://graph.facebook.com/${this.appConfig.getWhatsAppCloudApiVersion()}`,
        headers: {
          Authorization: `Bearer ${this.appConfig.getWhatsAppCloudAccessToken()}`,
        },
        timeout: 30_000,
      });
    }
    return this._http;
  }

  /** Normaliza pra dígitos puros (E.164 sem o "+") como a Graph API espera. */
  private cleanNumber(number: string): string {
    return (number.includes('@') ? (number.split('@')[0] ?? number) : number)
      .replace(/\D/g, '');
  }

  /** Mensagem de texto livre — só funciona dentro da janela de 24h. */
  async sendText(to: string, text: string): Promise<void> {
    const phoneNumberId = this.appConfig.getWhatsAppCloudPhoneNumberId();
    try {
      await this.http.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.cleanNumber(to),
        type: 'text',
        text: { preview_url: false, body: text },
      });
    } catch (error) {
      this.logError('sendText', error);
      throw new BadGatewayException('Erro ao enviar mensagem WhatsApp Cloud.');
    }
  }

  /**
   * Mensagem proativa via template aprovado (fora da janela de 24h).
   * `components` segue o formato da Graph API (ex: [{type:'body',parameters:[...]}]).
   */
  async sendTemplate(
    to: string,
    name: string,
    langCode: string,
    components?: TemplateComponent[],
  ): Promise<void> {
    const phoneNumberId = this.appConfig.getWhatsAppCloudPhoneNumberId();
    try {
      await this.http.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.cleanNumber(to),
        type: 'template',
        template: {
          name,
          language: { code: langCode },
          ...(components && components.length > 0 ? { components } : {}),
        },
      });
    } catch (error) {
      this.logError('sendTemplate', error);
      throw new BadGatewayException(
        'Erro ao enviar template WhatsApp Cloud.',
      );
    }
  }

  /**
   * Envia documento (PDF de relatório). A Graph API não aceita base64 inline:
   * faz upload em /media pra obter um media_id e depois manda a mensagem.
   */
  async sendDocument(
    to: string,
    params: {
      base64: string;
      fileName: string;
      mimetype: string;
      caption?: string;
    },
  ): Promise<void> {
    const phoneNumberId = this.appConfig.getWhatsAppCloudPhoneNumberId();
    try {
      const mediaId = await this.uploadMedia(
        params.base64,
        params.fileName,
        params.mimetype,
      );
      await this.http.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.cleanNumber(to),
        type: 'document',
        document: {
          id: mediaId,
          filename: params.fileName,
          ...(params.caption ? { caption: params.caption } : {}),
        },
      });
    } catch (error) {
      this.logError('sendDocument', error);
      throw new BadGatewayException('Erro ao enviar documento WhatsApp Cloud.');
    }
  }

  private async uploadMedia(
    base64: string,
    fileName: string,
    mimetype: string,
  ): Promise<string> {
    const phoneNumberId = this.appConfig.getWhatsAppCloudPhoneNumberId();
    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimetype);
    form.append('file', new Blob([buffer], { type: mimetype }), fileName);

    const { data } = await this.http.post<{ id?: string }>(
      `/${phoneNumberId}/media`,
      form,
    );
    if (!data.id) {
      throw new Error('Upload de mídia não retornou id');
    }
    return data.id;
  }

  /**
   * Baixa mídia recebida. Na Cloud API: GET /{mediaId} devolve uma URL
   * temporária, que precisa ser baixada com o mesmo Bearer token.
   */
  async getMedia(
    mediaId: string,
  ): Promise<{ base64: string; mimetype: string } | null> {
    if (!mediaId) return null;
    try {
      const { data: meta } = await this.http.get<{
        url?: string;
        mime_type?: string;
      }>(`/${mediaId}`);
      if (!meta.url) return null;

      const { data: bytes } = await this.http.get<ArrayBuffer>(meta.url, {
        responseType: 'arraybuffer',
      });
      return {
        base64: Buffer.from(bytes).toString('base64'),
        mimetype: meta.mime_type ?? 'application/octet-stream',
      };
    } catch (error) {
      this.logError('getMedia', error);
      return null;
    }
  }

  /**
   * Valida a assinatura HMAC-SHA256 do webhook (header x-hub-signature-256).
   * Se WHATSAPP_CLOUD_APP_SECRET não está setado, retorna true (não-bloqueante).
   */
  verifyWebhookSignature(rawBody: Buffer, signature?: string): boolean {
    const secret = this.appConfig.getWhatsAppCloudAppSecret();
    if (!secret) return true; // validação desativada
    if (!signature?.startsWith('sha256=')) return false;

    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const provided = signature.slice('sha256='.length);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private logError(method: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      const detail =
        (error.response?.data as { error?: { message?: string } })?.error
          ?.message ?? error.message;
      this.logger.error(
        `[${method}] HTTP ${String(error.response?.status ?? 'TIMEOUT')}: ${String(detail)}`,
      );
    } else if (error instanceof Error) {
      this.logger.error(`[${method}] ${error.message}`);
    }
  }
}
