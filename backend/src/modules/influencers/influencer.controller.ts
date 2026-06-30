import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { InfluencerAccessGuard } from '../../common/guards/influencer-access.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { InfluencersService } from './influencers.service';

/**
 * Área do próprio influencer. Liberada pra quem tem um perfil de influencer
 * ativo (cliente que também é afiliado OU influencer puro) e isenta do
 * SubscriptionGuard (o influencer puro não tem assinatura paga).
 */
@Controller('influencer')
@UseGuards(InfluencerAccessGuard)
@SkipSubscriptionCheck()
export class InfluencerController {
  constructor(private readonly influencers: InfluencersService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.influencers.getDashboard(user.userId);
  }
}
