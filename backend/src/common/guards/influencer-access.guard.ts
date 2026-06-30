import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Libera a área do influencer pra QUALQUER usuário que tenha um perfil de
 * influencer ativo — independente do role. Assim um cliente (role USER) que
 * também é afiliado acessa o painel sem precisar de uma segunda conta.
 */
@Injectable()
export class InfluencerAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Você não tem acesso à área de influencer');
    }

    const profile = await this.prisma.influencer.findUnique({
      where: { userId },
      select: { isActive: true },
    });

    if (!profile?.isActive) {
      throw new ForbiddenException('Você não tem acesso à área de influencer');
    }

    return true;
  }
}
