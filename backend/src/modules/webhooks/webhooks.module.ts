import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TrackingModule } from '../tracking/tracking.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppCloudModule } from '../whatsapp-cloud/whatsapp-cloud.module';
import { AsaasWebhookController } from './asaas-webhook.controller';
import { KirvanoWebhookController } from './kirvano-webhook.controller';
import { WhatsAppCloudWebhookController } from './whatsapp-cloud-webhook.controller';

@Module({
  imports: [
    SubscriptionsModule,
    TrackingModule,
    WhatsAppModule,
    WhatsAppCloudModule,
  ],
  controllers: [
    AsaasWebhookController,
    KirvanoWebhookController,
    WhatsAppCloudWebhookController,
  ],
})
export class WebhooksModule {}
