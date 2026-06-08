import { Module } from '@nestjs/common';
import { AdminInfluencersController } from './admin-influencers.controller';
import { CommissionService } from './commission.service';
import { InfluencerController } from './influencer.controller';
import { InfluencersService } from './influencers.service';

@Module({
  controllers: [AdminInfluencersController, InfluencerController],
  providers: [InfluencersService, CommissionService],
  exports: [InfluencersService, CommissionService],
})
export class InfluencersModule {}
