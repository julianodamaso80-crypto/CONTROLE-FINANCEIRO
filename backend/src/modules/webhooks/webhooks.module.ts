import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TrackingModule } from '../tracking/tracking.module';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { KirvanoWebhookController } from './kirvano-webhook.controller';
import { WhatsAppCloudWebhookController } from './whatsapp-cloud-webhook.controller';

@Module({
  imports: [SubscriptionsModule, TrackingModule],
  controllers: [
    AsaasWebhookController,
    KirvanoWebhookController,
    WhatsAppCloudWebhookController,
  ],
})
export class WebhooksModule {}
