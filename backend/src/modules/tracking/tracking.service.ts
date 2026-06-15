import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AppConfigService } from '../../common/config/app.config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrackEventDto } from './dto/track-event.dto';
import { TrackingDestination } from '@prisma/client';

/**
 * Mapa: evento interno Controlei → Meta standard event.
 * `Subscribe` é o evento dedicado pra SaaS recorrente (ASC/Advantage+ otimiza melhor).
 */
const META_EVENT_MAP: Record<string, string> = {
  page_view: 'PageView',
  lead_signup: 'Lead',
  trial_started: 'StartTrial',
  checkout_initiated: 'InitiateCheckout',
  subscribe: 'Subscribe',
  subscription_renewed: 'Subscribe',
  first_transaction: 'CompleteRegistration',
  whatsapp_click: 'Contact',
};

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

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
          event_source_url: 'https://controlei.ia.br/plano',
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
                item_name: 'Controlei Assinatura',
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

  /** SHA-256 de email (lowercase + trim) — formato exigido pelo Meta CAPI e Google EC */
  hashEmail(email: string): string {
    return this.sha256(email.trim().toLowerCase());
  }

  /** SHA-256 de phone (só dígitos, E.164 sem '+') — formato exigido pelo Meta CAPI */
  hashPhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    return this.sha256(digits);
  }

  // ============================================================
  // NOVOS MÉTODOS — pra POST /api/track (client-side dispatch)
  // ============================================================

  /**
   * Recebe evento vindo do client-side (lib/tracking.ts → /api/track).
   * Dispara Meta CAPI server-side com dedup via event_id.
   * Eventos sem companyId conhecido (page_view pré-signup) só vão pro CAPI sem persistir log.
   */
  async ingestClientEvent(
    dto: TrackEventDto,
    clientIp?: string,
    userAgent?: string,
  ): Promise<void> {
    const companyId = dto.user_id || dto.external_id || null;
    try {
      const res = await this.fireMetaCapiGeneric(dto, clientIp, userAgent);
      if (companyId && res) {
        await this.logConversion(
          companyId,
          'META_CAPI',
          dto.event_name,
          dto.event_id,
          dto,
          res,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro';
      if (companyId) {
        await this.logConversionError(
          companyId,
          'META_CAPI',
          dto.event_name,
          dto.event_id,
          dto,
          msg,
        );
      }
      this.logger.warn(`Meta CAPI client-event ${dto.event_name} falhou: ${msg}`);
    }
  }

  /**
   * Persiste a atribuição inicial do lead (1 linha por company).
   * Chamada no /auth/register, primeiro signup. Não sobrescreve em re-registros.
   */
  async upsertAttribution(
    companyId: string,
    userId: string,
    data: Partial<TrackEventDto> & {
      landing_page?: string;
      ip_address?: string;
      user_agent?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.utmAttribution.upsert({
        where: { companyId },
        create: {
          companyId,
          userId,
          eventId: data.event_id,
          externalId: data.external_id,
          gaClientId: data.ga_client_id,
          fbp: data.fbp,
          fbc: data.fbc,
          gclid: data.gclid,
          fbclid: data.fbclid,
          gbraid: data.gbraid,
          wbraid: data.wbraid,
          msclkid: data.msclkid,
          ttclid: data.ttclid,
          utmSource: data.utm_source,
          utmMedium: data.utm_medium,
          utmCampaign: data.utm_campaign,
          utmContent: data.utm_content,
          utmTerm: data.utm_term,
          landingPage: data.landing_page,
          referrer: data.page_referrer,
          ipAddress: data.ip_address,
          userAgent: data.user_agent,
        },
        update: {
          userId,
          // first-touch wins — não sobrescreve atribuição original
        },
      });
    } catch (err) {
      this.logger.warn(
        `upsertAttribution falhou: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }
  }

  /**
   * Versão genérica do fireMetaCapi pra qualquer event_name (não só Purchase).
   * Usa META_EVENT_MAP pra traduzir nomes internos pra standard events Meta.
   */
  private async fireMetaCapiGeneric(
    dto: TrackEventDto,
    clientIp?: string,
    userAgent?: string,
  ): Promise<{ status: number; body: string } | null> {
    const pixelId = this.appConfig.getMetaPixelId();
    const accessToken = this.appConfig.getMetaCapiAccessToken();
    if (!pixelId || !accessToken) return null;

    const testCode = this.appConfig.getMetaTestEventCode();
    const metaEvent = META_EVENT_MAP[dto.event_name] || dto.event_name;

    const event_time = dto.timestamp
      ? Math.floor(new Date(dto.timestamp).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    const user_data: Record<string, unknown> = {};
    if (dto.email_hash) user_data['em'] = [dto.email_hash];
    if (dto.phone_hash) user_data['ph'] = [dto.phone_hash];
    if (dto.external_id) user_data['external_id'] = [this.sha256(dto.external_id)];
    if (dto.fbp) user_data['fbp'] = dto.fbp;
    if (dto.fbc) user_data['fbc'] = dto.fbc;
    if (clientIp) user_data['client_ip_address'] = clientIp;
    if (userAgent) user_data['client_user_agent'] = userAgent;

    const custom_data: Record<string, unknown> = {};
    if (dto.value != null) custom_data['value'] = dto.value;
    if (dto.currency) custom_data['currency'] = dto.currency;
    if (dto.transaction_id) custom_data['order_id'] = dto.transaction_id;
    if (dto.plan_type) custom_data['content_name'] = dto.plan_type;

    const body = {
      data: [
        {
          event_name: metaEvent,
          event_time,
          event_id: dto.event_id,
          event_source_url: dto.page_url,
          action_source: 'website',
          user_data,
          custom_data,
        },
      ],
      ...(testCode ? { test_event_code: testCode } : {}),
    };

    const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Meta CAPI ${res.status}: ${text.slice(0, 300)}`);
    }
    return { status: res.status, body: text.slice(0, 4000) };
  }

  // ============================================================
  // Logging em conversion_event_log
  // ============================================================
  private async logConversion(
    companyId: string,
    destino: TrackingDestination,
    eventName: string,
    eventId: string,
    payload: unknown,
    response: { status: number; body: string },
  ): Promise<void> {
    try {
      await this.prisma.conversionEventLog.create({
        data: {
          companyId,
          destino,
          eventName,
          eventId,
          payload: payload as never,
          responseStatus: response.status,
          responseBody: response.body,
          success: response.status >= 200 && response.status < 300,
        },
      });
    } catch (err) {
      this.logger.warn(
        `logConversion falhou: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }
  }

  private async logConversionError(
    companyId: string,
    destino: TrackingDestination,
    eventName: string,
    eventId: string,
    payload: unknown,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.prisma.conversionEventLog.create({
        data: {
          companyId,
          destino,
          eventName,
          eventId,
          payload: payload as never,
          success: false,
          errorMessage: errorMessage.slice(0, 4000),
        },
      });
    } catch {
      // log de erro não pode quebrar
    }
  }
}
