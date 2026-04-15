import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { SubscriptionsService } from './subscriptions.service';

class ChangePlanDto {
  @IsEnum(SubscriptionPlan, {
    message: 'Plano inválido. Use MONTHLY ou ANNUAL.',
  })
  plan!: SubscriptionPlan;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @SkipSubscriptionCheck()
  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return this.service.getStatusDto(user.companyId);
  }

  @SkipSubscriptionCheck()
  @Post('change-plan')
  async changePlan(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePlanDto,
  ) {
    return this.service.changePlan(user.companyId, dto.plan);
  }

  @SkipSubscriptionCheck()
  @Delete('cancel')
  async cancel(@CurrentUser() user: RequestUser) {
    return this.service.cancel(user.companyId);
  }

  @SkipSubscriptionCheck()
  @Get('payment-url')
  async getPaymentUrl(@CurrentUser() user: RequestUser) {
    const url = await this.service.refreshPaymentUrl(user.companyId);
    return { url };
  }
}
