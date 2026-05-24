import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';

export type AdminActionType =
  | 'CREATE_USER'
  | 'UPDATE_USER_DATA'
  | 'GRANT_TRIAL'
  | 'GRANT_MONTHLY'
  | 'GRANT_ANNUAL'
  | 'GRANT_LIFETIME'
  | 'DELETE_USER';

export interface LogActionInput {
  req: Request;
  action: AdminActionType;
  targetType?: 'user' | 'company';
  targetId?: string;
  targetLabel?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogActionInput): Promise<void> {
    const user = input.req.user;
    if (!user) {
      this.logger.warn(`Skip audit: req.user vazio em action=${input.action}`);
      return;
    }

    // Busca nome do admin (o JWT só carrega email; pra timeline é melhor o nome)
    const admin = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true, email: true },
    });

    try {
      await this.prisma.adminAction.create({
        data: {
          adminId: user.userId,
          adminName: admin?.name ?? user.email,
          adminEmail: admin?.email ?? user.email,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          targetLabel: input.targetLabel,
          description: input.description,
          metadata: (input.metadata as never) ?? undefined,
          ipAddress: this.extractIp(input.req),
        },
      });
    } catch (err) {
      // Audit não pode quebrar a ação principal
      this.logger.error(
        `Falha ao gravar audit action=${input.action}: ${
          err instanceof Error ? err.message : 'erro'
        }`,
      );
    }
  }

  private extractIp(req: Request): string | undefined {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string') return fwd.split(',')[0]?.trim();
    if (Array.isArray(fwd)) return fwd[0];
    return req.ip;
  }

  async list(filters: {
    adminId?: string;
    action?: string;
    targetId?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = filters.offset ?? 0;

    const where = {
      ...(filters.adminId ? { adminId: filters.adminId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.targetId ? { targetId: filters.targetId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}
