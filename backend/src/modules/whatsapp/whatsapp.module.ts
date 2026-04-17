import { Module, forwardRef } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { AiModule } from '../ai/ai.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SegmentsModule } from '../segments/segments.module';
import { CategoriesModule } from '../categories/categories.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ReportsModule } from '../reports/reports.module';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  imports: [
    EvolutionModule,
    AiModule,
    TransactionsModule,
    SegmentsModule,
    CategoriesModule,
    BankAccountsModule,
    ReportsModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
