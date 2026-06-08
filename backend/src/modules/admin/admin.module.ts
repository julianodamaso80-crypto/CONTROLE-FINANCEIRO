import { Module } from '@nestjs/common';
import { InfluencersModule } from '../influencers/influencers.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [InfluencersModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService],
})
export class AdminModule {}
