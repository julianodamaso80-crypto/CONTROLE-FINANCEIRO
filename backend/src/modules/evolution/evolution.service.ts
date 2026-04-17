import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance } from 'axios';
import { AppConfigService } from '../../common/config/app.config';

interface CreateInstanceResponse {
  instance: { instanceName: string; status: string };
  hash: string;
  qrcode?: { base64?: string };
}

interface FetchQrCodeResponse {
  base64?: string;
  code?: string;
}

interface ConnectionStateResponse {
  instance?: { state?: string };
  state?: string;
}

interface InstanceData {
  instance?: {
    instanceName?: string;
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
  ownerJid?: string;
  profileName?: string;
  profilePicUrl?: string;
  profilePictureUrl?: string;
}

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly appConfig: AppConfigService) {
    this.http = axios.create({
      baseURL: this.appConfig.getEvolutionApiUrl(),
      headers: { apikey: this.appConfig.getEvolutionApiKey() },
      timeout: 30_000,
    });
  }

  async createInstance(
    instanceName: string,
    webhookUrl: string,
  ): Promise<{
    instanceName: string;
    token: string;
    qrCodeBase64: string | null;
  }> {
    try {
      const { data } = await this.http.post<CreateInstanceResponse>(
        '/instance/create',
        {
          instanceName,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          groupsIgnore: true,
          rejectCall: true,
          msgCall: 'Não aceito chamadas, envie mensagem de texto.',
          alwaysOnline: false,
          readMessages: false,
          syncFullHistory: false,
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
            ],
          },
        },
      );

      return {
        instanceName,
        token: data.hash,
        qrCodeBase64: data.qrcode?.base64 ?? null,
      };
    } catch (error) {
      this.logError('createInstance', error);
      throw new BadGatewayException(
        'Erro ao comunicar com WhatsApp. Tente novamente.',
      );
    }
  }

  async fetchQrCode(instanceName: string): Promise<string | null> {
    try {
      const { data } = await this.http.get<FetchQrCodeResponse>(
        `/instance/connect/${instanceName}`,
      );
      return data.base64 ?? null;
    } catch (error) {
      this.logError('fetchQrCode', error);
      return null;
    }
  }

  async fetchInstanceState(
    instanceName: string,
  ): Promise<'open' | 'connecting' | 'close'> {
    try {
      const { data } = await this.http.get<ConnectionStateResponse>(
        `/instance/connectionState/${instanceName}`,
      );
      const state = data.instance?.state ?? data.state ?? 'close';
      if (state === 'open' || state === 'connecting') {
        return state;
      }
      return 'close';
    } catch (error) {
      this.logError('fetchInstanceState', error);
      return 'close';
    }
  }

  async fetchInstance(
    instanceName: string,
  ): Promise<{
    ownerJid: string | null;
    profileName: string | null;
    profilePicUrl: string | null;
  }> {
    try {
      const { data } = await this.http.get<InstanceData[]>(
        '/instance/fetchInstances',
        { params: { instanceName } },
      );

      const instance = data[0];
      if (!instance) {
        return { ownerJid: null, profileName: null, profilePicUrl: null };
      }

      const ownerJid =
        instance.ownerJid ?? instance.instance?.owner ?? null;
      const profileName =
        instance.profileName ?? instance.instance?.profileName ?? null;
      const profilePicUrl =
        instance.profilePicUrl ??
        instance.profilePictureUrl ??
        instance.instance?.profilePictureUrl ??
        null;

      return { ownerJid, profileName, profilePicUrl };
    } catch (error) {
      this.logError('fetchInstance', error);
      return { ownerJid: null, profileName: null, profilePicUrl: null };
    }
  }

  async logoutInstance(instanceName: string): Promise<void> {
    try {
      await this.http.delete(`/instance/logout/${instanceName}`);
    } catch (error) {
      this.logError('logoutInstance', error);
    }
  }

  async deleteInstance(instanceName: string): Promise<void> {
    try {
      await this.http.delete(`/instance/delete/${instanceName}`);
    } catch (error) {
      this.logError('deleteInstance', error);
    }
  }

  /**
   * Baixa a mídia de uma mensagem recebida como base64.
   * Usado pra extrair imagens/áudios de webhooks messages.upsert.
   */
  async getMediaBase64(
    instanceName: string,
    messageKey: { id?: string; remoteJid?: string; fromMe?: boolean },
  ): Promise<{ base64: string; mimetype: string } | null> {
    try {
      const { data } = await this.http.post<{
        base64?: string;
        mimetype?: string;
      }>(`/chat/getBase64FromMediaMessage/${instanceName}`, {
        message: { key: messageKey },
        convertToMp4: false,
      });
      if (!data.base64) return null;
      return {
        base64: data.base64,
        mimetype: data.mimetype ?? 'application/octet-stream',
      };
    } catch (error) {
      this.logError('getMediaBase64', error);
      return null;
    }
  }

  async sendTextMessage(
    instanceName: string,
    number: string,
    text: string,
  ): Promise<void> {
    const cleanNumber = number.includes('@')
      ? number.split('@')[0] ?? number
      : number;

    try {
      await this.http.post(`/message/sendText/${instanceName}`, {
        number: cleanNumber,
        text,
        delay: 1000,
      });
    } catch (error) {
      this.logError('sendTextMessage', error);
      throw new BadGatewayException(
        'Erro ao enviar mensagem WhatsApp. Tente novamente.',
      );
    }
  }

  async sendDocumentMessage(
    instanceName: string,
    number: string,
    params: {
      base64: string;
      fileName: string;
      mimetype: string;
      caption?: string;
    },
  ): Promise<void> {
    const cleanNumber = number.includes('@')
      ? number.split('@')[0] ?? number
      : number;

    try {
      await this.http.post(`/message/sendMedia/${instanceName}`, {
        number: cleanNumber,
        mediatype: 'document',
        mimetype: params.mimetype,
        media: params.base64,
        fileName: params.fileName,
        caption: params.caption,
        delay: 1000,
      });
    } catch (error) {
      this.logError('sendDocumentMessage', error);
      throw new BadGatewayException(
        'Erro ao enviar documento WhatsApp. Tente novamente.',
      );
    }
  }

  private logError(method: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      this.logger.error(
        `[${method}] HTTP ${String(error.response?.status ?? 'TIMEOUT')}: ${String(error.response?.data?.message ?? error.message)}`,
      );
    } else if (error instanceof Error) {
      this.logger.error(`[${method}] ${error.message}`);
    }
  }
}
