import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../../common/config/app.config';
import { Public } from '../../common/decorators/public.decorator';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrackingService } from '../tracking/tracking.service';

/**
 * Eventos Kirvano usados (vindos do payload do webhook).
 * Fonte: help.kirvano.com — Configurando integração via webhook.
 */
interface KirvanoWebhookEvent {
  event: string;
  /** ID da venda ou do checkout */
  sale_id?: string;
  checkout_id?: string;
  /** Status humano-legível em alguns eventos */
  status?: string;
  payment_method?: string;
  /** Total em centavos OU em reais — Kirvano envia em reais (number) */
  total_price?: number | string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
    ip?: string;
  };
  utm?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  /** Em assinaturas */
  plan?: {
    name?: string;
    charge_frequency?: string;
    next_charge_date?: string;
  };
  /** Pixels enviados pelo cliente (Kirvano captura no checkout) */
  tracking?: {
    fbp?: string;
    fbc?: string;
    ga_client_id?: string;
  };
}

@Controller('webhooks/kirvano')
export class KirvanoWebhookController {
  private readonly logger = new Logger(KirvanoWebhookController.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly tracking: TrackingService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Public()
  @SkipThrottle()
  @Post()
  @HttpCode(200)
  async handle(
    @Headers('x-kirvano-token') headerToken: string | undefined,
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: KirvanoWebhookEvent,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    if (this.appConfig.isKirvanoConfigured()) {
      const expected = this.appConfig.getKirvanoWebhookToken();
      // Kirvano não documentou o header exato — aceita variações usuais.
      const provided =
        headerToken ?? authHeader?.replace(/^Bearer\s+/i, '') ?? undefined;
      if (!provided || provided !== expected) {
        this.logger.warn(
          `Webhook Kirvano com token inválido: ${provided?.slice(0, 10) ?? 'ausente'}`,
        );
        throw new UnauthorizedException('Token inválido');
      }
    }

    const event = (body.event ?? '').toUpperCase();
    this.logger.log(`Kirvano webhook: ${event}`);

    const companyId = body.utm?.utm_content;
    const checkoutId = body.sale_id ?? body.checkout_id ?? '';
    const customerEmail = body.customer?.email?.toLowerCase();
    const customerName = body.customer?.name;
    const clientIp = body.customer?.ip ?? req.ip;
    const userAgent = this.normalizeHeader(req.headers['user-agent']);

    switch (event) {
      case 'SALE_APPROVED':
      case 'SUBSCRIPTION_RENEWED':
      case 'COMPRA_APROVADA': {
        const updated = await this.subscriptions.handleKirvanoSaleApproved({
          companyId,
          checkoutId,
          customerEmail,
          customerName,
          nextChargeDate: body.plan?.next_charge_date,
          chargeFrequency: body.plan?.charge_frequency,
        });

        if (updated && event === 'SALE_APPROVED') {
          // Dispara tracking server-side só na primeira venda (não em renovações).
          const value = this.parseValue(body.total_price);
          await this.tracking
            .firePurchase({
              transactionId: checkoutId || updated.id,
              value: value ?? 19.9,
              currency: 'BRL',
              email: customerEmail,
              phone: body.customer?.phone,
              firstName: customerName?.split(' ')[0],
              lastName: customerName?.split(' ').slice(1).join(' ') || undefined,
              clientIp,
              userAgent,
              utmSource: body.utm?.utm_source,
              utmMedium: body.utm?.utm_medium,
              utmCampaign: body.utm?.utm_campaign,
              utmContent: body.utm?.utm_content,
              utmTerm: body.utm?.utm_term,
              fbp: body.tracking?.fbp,
              fbc: body.tracking?.fbc,
              gaClientId: body.tracking?.ga_client_id,
            })
            .catch((err) =>
              this.logger.warn(
                `Tracking firePurchase falhou: ${err instanceof Error ? err.message : 'erro'}`,
              ),
            );
        }
        break;
      }

      case 'SALE_REFUSED':
      case 'COMPRA_RECUSADA':
        await this.subscriptions.handleKirvanoSaleRefused({
          companyId,
          checkoutId,
          customerEmail,
        });
        break;

      case 'SALE_CHARGEBACK':
      case 'CHARGEBACK':
        await this.subscriptions.handleKirvanoChargeback({
          companyId,
          checkoutId,
          customerEmail,
        });
        break;

      case 'SUBSCRIPTION_CANCELED':
      case 'ASSINATURA_CANCELADA':
        await this.subscriptions.handleKirvanoSubscriptionCanceled({
          companyId,
          checkoutId,
          customerEmail,
        });
        break;

      // Eventos informativos — só loga.
      case 'BANK_SLIP_GENERATED':
      case 'BANK_SLIP_EXPIRED':
      case 'PIX_GENERATED':
      case 'PIX_EXPIRED':
        break;

      default:
        this.logger.debug(`Evento Kirvano não tratado: ${event}`);
    }

    return { received: true };
  }

  private parseValue(raw: number | string | undefined): number | null {
    if (raw == null) return null;
    if (typeof raw === 'number') return raw;
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  private normalizeHeader(v: string | string[] | undefined): string | undefined {
    if (!v) return undefined;
    return Array.isArray(v) ? v[0] : v;
  }
}
