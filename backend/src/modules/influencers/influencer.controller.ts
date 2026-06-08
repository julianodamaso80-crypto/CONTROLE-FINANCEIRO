import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { InfluencersService } from './influencers.service';

/**
 * Área do próprio influencer. Protegida por role INFLUENCER e isenta do
 * SubscriptionGuard (influencer não tem assinatura paga).
 */
@Controller('influencer')
@UseGuards(RolesGuard)
@Roles(UserRole.INFLUENCER)
@SkipSubscriptionCheck()
export class InfluencerController {
  constructor(private readonly influencers: InfluencersService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.influencers.getDashboard(user.userId);
  }
}
