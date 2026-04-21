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
    return this.getOptional('OPENROUTER_MODEL', 'google/gemini-2.5-flash');
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

  getAsaasApiKey(): string {
    return this.getRequired('ASAAS_API_KEY');
  }

  getAsaasBaseUrl(): string {
    return this.getOptional('ASAAS_BASE_URL', 'https://api.asaas.com/v3');
  }

  getAsaasWebhookToken(): string {
    return this.getRequired('ASAAS_WEBHOOK_TOKEN');
  }

  isAsaasConfigured(): boolean {
    return (
      !!this.config.get<string>('ASAAS_API_KEY') &&
      !!this.config.get<string>('ASAAS_WEBHOOK_TOKEN')
    );
  }

  /**
   * Vars necessárias para conectar/desconectar o WhatsApp (Evolution API).
   * Não inclui OpenRouter — IA só é exigida para interpretar mensagens recebidas.
   */
  getMissingEvolutionVars(): string[] {
    const required = [
      'EVOLUTION_API_URL',
      'EVOLUTION_API_KEY',
      'PUBLIC_WEBHOOK_URL',
    ];
    return required.filter((key) => !this.config.get<string>(key));
  }

  isEvolutionConfigured(): boolean {
    return this.getMissingEvolutionVars().length === 0;
  }

  isAiConfigured(): boolean {
    return !!this.config.get<string>('OPENROUTER_API_KEY');
  }

  /**
   * Mantido por compatibilidade: retorna true quando Evolution + IA estão configurados.
   * Para o fluxo de conexão (QR Code), use isEvolutionConfigured().
   */
  isWhatsAppConfigured(): boolean {
    return this.isEvolutionConfigured() && this.isAiConfigured();
  }
}
