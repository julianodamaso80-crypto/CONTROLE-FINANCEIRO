import { Module } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { AiModule } from '../ai/ai.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SegmentsModule } from '../segments/segments.module';
import { CategoriesModule } from '../categories/categories.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
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
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
