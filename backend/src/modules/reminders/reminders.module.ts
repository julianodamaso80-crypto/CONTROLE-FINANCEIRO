import { Module } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { BillRemindersService } from './bill-reminders.service';
import { BudgetAlertsService } from './budget-alerts.service';

@Module({
  imports: [EvolutionModule],
  providers: [BillRemindersService, BudgetAlertsService],
  exports: [BillRemindersService, BudgetAlertsService],
})
export class RemindersModule {}
