import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verifica se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    let payload: {
      sub: string;
      companyId: string;
      role: string;
      email: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    // Valida que o usuário ainda existe e está ativo no banco.
    // Sem essa checagem, um JWT válido pode referenciar um user/company
    // que foi apagado (ex: após TRUNCATE), causando FK violations em inserts.
    const dbUser = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
      select: { id: true, companyId: true, role: true, email: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Usuário não encontrado ou desativado');
    }

    const user: RequestUser = {
      userId: dbUser.id,
      companyId: dbUser.companyId,
      role: dbUser.role as RequestUser['role'],
      email: dbUser.email,
    };

    request.user = user;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
