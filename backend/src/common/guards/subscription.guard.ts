import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../decorators/skip-subscription-check.decorator';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rotas públicas (login, register, forgot-password, webhooks) são sempre permitidas
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Rotas marcadas com @SkipSubscriptionCheck (ex: /subscriptions/me, /plano)
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user?.companyId) return true; // JwtAuthGuard já cuidou disso

    // ADMIN (dono da plataforma) sempre permitido
    if (user.role === 'ADMIN') return true;

    const allowed = await this.subscriptions.isAccessAllowed(user.companyId);
    if (!allowed) {
      throw new ForbiddenException(
        'Sua assinatura expirou ou não está ativa. Renove em https://meucaixa.store/plano',
      );
    }

    return true;
  }
}
