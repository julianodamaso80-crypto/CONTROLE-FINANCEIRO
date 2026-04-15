import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AsaasWebhookController } from './asaas-webhook.controller';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AsaasWebhookController],
})
export class WebhooksModule {}
