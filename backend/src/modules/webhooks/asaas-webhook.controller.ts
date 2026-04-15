import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../../common/config/app.config';
import { Public } from '../../common/decorators/public.decorator';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

interface AsaasWebhookEvent {
  id?: string;
  event: string;
  dateCreated?: string;
  payment?: {
    id: string;
    subscription?: string;
    customer: string;
    status: string;
    value: number;
  };
  subscription?: {
    id: string;
    customer: string;
    status: string;
  };
}

@Controller('webhooks/asaas')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Public()
  @SkipThrottle()
  @Post()
  @HttpCode(200)
  async handle(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: AsaasWebhookEvent,
  ) {
    // Valida o token que configuramos no painel do Asaas
    if (this.appConfig.isAsaasConfigured()) {
      const expected = this.appConfig.getAsaasWebhookToken();
      if (!token || token !== expected) {
        this.logger.warn(
          `Webhook Asaas com token inválido: ${token?.slice(0, 10) ?? 'ausente'}`,
        );
        throw new UnauthorizedException('Token inválido');
      }
    }

    const event = body.event;
    this.logger.log(`Asaas webhook: ${event}`);

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await this.subscriptions.handlePaymentReceived(
          body.payment?.id ?? '',
          body.payment?.subscription,
        );
        break;

      case 'PAYMENT_OVERDUE':
        await this.subscriptions.handlePaymentOverdue(
          body.payment?.subscription,
        );
        break;

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_DELETED':
        await this.subscriptions.handlePaymentRefunded(
          body.payment?.subscription,
        );
        break;

      case 'SUBSCRIPTION_DELETED':
        if (body.subscription?.id) {
          await this.subscriptions.handleSubscriptionDeleted(
            body.subscription.id,
          );
        }
        break;

      case 'SUBSCRIPTION_INACTIVATED':
        if (body.subscription?.id) {
          await this.subscriptions.handleSubscriptionInactivated(
            body.subscription.id,
          );
        }
        break;

      case 'PAYMENT_CREATED':
      case 'PAYMENT_UPDATED':
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_UPDATED':
        // Eventos informativos — só logamos
        break;

      default:
        this.logger.debug(`Evento não tratado: ${event}`);
    }

    return { received: true };
  }
}
