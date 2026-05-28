import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AppConfigModule } from '../../common/config/app-config.module';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [PrismaModule, AppConfigModule],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
