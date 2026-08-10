import { Module } from '@nestjs/common';
import { AsaasModule } from '../asaas/asaas.module';
import { WhatsAppCloudModule } from '../whatsapp-cloud/whatsapp-cloud.module';
import { SubscriptionReconcilerService } from './subscription-reconciler.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [AsaasModule, WhatsAppCloudModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionReconcilerService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
