import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AppConfigService } from '../../common/config/app.config';

export interface PurchaseEvent {
  /** ID único da transação — usado pra dedup com pixel client-side */
  transactionId: string;
  /** Valor em BRL */
  value: number;
  currency: 'BRL';
  /** Email do comprador (em texto, será hasheado pra Meta) */
  email?: string;
  /** Telefone E.164 (5521...) ou raw, será normalizado */
  phone?: string;
  firstName?: string;
  lastName?: string;
  /** IP do cliente no momento da compra (Kirvano envia) */
  clientIp?: string;
  userAgent?: string;
  /** UTMs preservados do checkout */
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** fbp/fbc do navegador (Kirvano envia se conseguir capturar) */
  fbp?: string;
  fbc?: string;
  /** ga client_id (cid) do navegador — opcional */
  gaClientId?: string;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  /** Dispara um evento Purchase em todos os providers configurados. */
  async firePurchase(event: PurchaseEvent): Promise<void> {
    await Promise.allSettled([
      this.fireMetaCapi(event),
      this.fireGa4MeasurementProtocol(event),
    ]);
  }

  /** Meta Conversions API — server-side Purchase. */
  private async fireMetaCapi(event: PurchaseEvent): Promise<void> {
    const pixelId = this.appConfig.getMetaPixelId();
    const accessToken = this.appConfig.getMetaCapiAccessToken();
    if (!pixelId || !accessToken) return;

    const testEventCode = this.appConfig.getMetaTestEventCode();

    const userData: Record<string, unknown> = {};
    if (event.email) userData['em'] = [this.sha256(event.email.toLowerCase().trim())];
    if (event.phone) {
      const digits = event.phone.replace(/\D/g, '');
      if (digits) userData['ph'] = [this.sha256(digits)];
    }
    if (event.firstName) userData['fn'] = [this.sha256(event.firstName.toLowerCase().trim())];
    if (event.lastName) userData['ln'] = [this.sha256(event.lastName.toLowerCase().trim())];
    if (event.clientIp) userData['client_ip_address'] = event.clientIp;
    if (event.userAgent) userData['client_user_agent'] = event.userAgent;
    if (event.fbp) userData['fbp'] = event.fbp;
    if (event.fbc) userData['fbc'] = event.fbc;

    const body = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: event.transactionId,
          action_source: 'website',
          event_source_url: 'https://meucaixa.store/plano',
          user_data: userData,
          custom_data: {
            currency: event.currency,
            value: event.value,
            content_type: 'product',
            content_ids: ['meucaixa_subscription'],
          },
        },
      ],
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Meta CAPI ${res.status}: ${text.slice(0, 300)}`);
        return;
      }
      this.logger.log(`Meta CAPI Purchase ok — txid=${event.transactionId}`);
    } catch (err) {
      this.logger.warn(
        `Meta CAPI falhou: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }
  }

  /** GA4 Measurement Protocol — purchase event. Se contas linkadas, exporta pra Google Ads. */
  private async fireGa4MeasurementProtocol(event: PurchaseEvent): Promise<void> {
    const measurementId = this.appConfig.getGa4MeasurementId();
    const apiSecret = this.appConfig.getGa4ApiSecret();
    if (!measurementId || !apiSecret) return;

    // GA4 requer client_id; usa o do navegador se veio, senão gera anônimo.
    const clientId = event.gaClientId ?? `${Date.now()}.${randomUUID().slice(0, 8)}`;

    const body = {
      client_id: clientId,
      user_id: event.email ? this.sha256(event.email.toLowerCase().trim()) : undefined,
      events: [
        {
          name: 'purchase',
          params: {
            currency: event.currency,
            value: event.value,
            transaction_id: event.transactionId,
            items: [
              {
                item_id: 'meucaixa_subscription',
                item_name: 'MeuCaixa Assinatura',
                price: event.value,
                quantity: 1,
              },
            ],
            ...(event.utmSource ? { source: event.utmSource } : {}),
            ...(event.utmMedium ? { medium: event.utmMedium } : {}),
            ...(event.utmCampaign ? { campaign: event.utmCampaign } : {}),
          },
        },
      ],
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`GA4 MP ${res.status}: ${text.slice(0, 300)}`);
        return;
      }
      this.logger.log(`GA4 MP purchase ok — txid=${event.transactionId}`);
    } catch (err) {
      this.logger.warn(
        `GA4 MP falhou: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }
  }

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
