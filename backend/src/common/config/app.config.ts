import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  private getRequired(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(
        `Variável de ambiente ${key} não configurada. Verifique seu arquivo .env`,
      );
    }
    return value;
  }

  private getOptional(key: string, fallback: string): string {
    return this.config.get<string>(key) ?? fallback;
  }

  getEvolutionApiUrl(): string {
    return this.getRequired('EVOLUTION_API_URL');
  }

  getEvolutionApiKey(): string {
    return this.getRequired('EVOLUTION_API_KEY');
  }

  getEvolutionInstancePrefix(): string {
    return this.getOptional('EVOLUTION_INSTANCE_PREFIX', 'meucaixa_');
  }

  getOpenRouterApiKey(): string {
    return this.getRequired('OPENROUTER_API_KEY');
  }

  getOpenRouterModel(): string {
    return this.getOptional('OPENROUTER_MODEL', 'openai/gpt-4o-mini');
  }

  getOpenRouterBaseUrl(): string {
    return this.getOptional(
      'OPENROUTER_BASE_URL',
      'https://openrouter.ai/api/v1',
    );
  }

  getPublicWebhookUrl(): string {
    return this.getRequired('PUBLIC_WEBHOOK_URL');
  }

  /**
   * Retorna true apenas quando TODAS as env vars obrigatórias
   * do WhatsApp estão presentes. Permite ao backend iniciar normalmente
   * e bloquear apenas os endpoints do WhatsApp quando não configurado.
   */
  isWhatsAppConfigured(): boolean {
    return (
      !!this.config.get<string>('EVOLUTION_API_URL') &&
      !!this.config.get<string>('EVOLUTION_API_KEY') &&
      !!this.config.get<string>('OPENROUTER_API_KEY') &&
      !!this.config.get<string>('PUBLIC_WEBHOOK_URL')
    );
  }
}
