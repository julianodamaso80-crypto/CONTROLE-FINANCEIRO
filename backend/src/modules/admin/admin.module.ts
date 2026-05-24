import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService],
})
export class AdminModule {}
