import { Module } from '@nestjs/common';
import { EvolutionModule } from '../evolution/evolution.module';
import { BillRemindersService } from './bill-reminders.service';

@Module({
  imports: [EvolutionModule],
  providers: [BillRemindersService],
  exports: [BillRemindersService],
})
export class RemindersModule {}
