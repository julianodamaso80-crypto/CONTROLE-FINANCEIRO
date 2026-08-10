import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Libera a ação apenas para o dono da conta (quem fez o cadastro) ou para um
 * admin da plataforma.
 *
 * Existe porque `RolesGuard` + `@Roles(ADMIN)` misturavam dois conceitos: a role
 * ADMIN é a que abre o painel /admin com TODAS as empresas. Usá-la para liberar
 * "gerenciar a própria conta" obrigaria a promover clientes a admin da
 * plataforma. Aqui a permissão vem de `companies.owner_id`, não da role.
 */
@Injectable()
export class AccountOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Você não tem permissão para executar esta ação');
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { ownerId: true },
    });

    if (company?.ownerId === user.userId) {
      return true;
    }

    throw new ForbiddenException(
      'Só o dono da conta pode fazer isso. Peça para quem criou a conta.',
    );
  }
}
