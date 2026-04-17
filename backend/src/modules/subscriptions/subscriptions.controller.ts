import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
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

class CheckoutUrlDto {
  @IsEnum(SubscriptionPlan, {
    message: 'Plano inválido. Use MONTHLY ou ANNUAL.',
  })
  plan!: SubscriptionPlan;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.',
  })
  cpfCnpj?: string;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @SkipSubscriptionCheck()
  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    // Admin da plataforma não tem plano próprio
    if (user.role === 'ADMIN') return null;
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

  @SkipSubscriptionCheck()
  @Post('checkout-url')
  async getCheckoutUrl(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckoutUrlDto,
  ) {
    const url = await this.service.getCheckoutUrl(
      user.companyId,
      dto.plan,
      dto.cpfCnpj,
    );
    return { url };
  }
}
