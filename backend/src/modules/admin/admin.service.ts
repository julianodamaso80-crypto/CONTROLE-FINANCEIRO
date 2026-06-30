import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { seedDefaultCategories } from '../categories/categories-seed';
import { CommissionService } from '../influencers/commission.service';
import { InfluencersService } from '../influencers/influencers.service';
import { AdminAuditService, AdminActionType } from './admin-audit.service';

type AccessType = 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
type AccountRole = 'USER' | 'ADMIN' | 'INFLUENCER';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly influencers: InfluencersService,
    private readonly commissions: CommissionService,
  ) {}

  // Taxa USD → BRL (atualizar periodicamente)
  private readonly USD_TO_BRL = 5.5;

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalClients,
      clientsThisMonth,
      clientsThisWeek,
      totalMessages,
      messagesThisMonth,
      recentClients,
      subscriptionStats,
      llmCostAgg,
      activeClients,
    ] = await Promise.all([
      // Clientes = users que NÃO são SUPER_ADMIN
      this.prisma.user.count({ where: { role: { notIn: ['ADMIN', 'INFLUENCER'] } } }),
      this.prisma.user.count({
        where: { role: { notIn: ['ADMIN', 'INFLUENCER'] }, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.user.count({
        where: { role: { notIn: ['ADMIN', 'INFLUENCER'] }, createdAt: { gte: startOfWeek } },
      }),
      this.prisma.whatsAppMessage.count(),
      this.prisma.whatsAppMessage.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Últimos 10 clientes cadastrados (excluindo sistema e admin)
      this.prisma.user.findMany({
        where: { role: { notIn: ['ADMIN', 'INFLUENCER'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          company: {
            select: {
              name: true,
              plan: true,
              subscription: {
                select: { status: true, plan: true, trialEndsAt: true },
              },
            },
          },
        },
      }),
      this.getSubscriptionStats(),
      this.prisma.whatsAppMessage.aggregate({
        _sum: { llmCostUsd: true, promptTokens: true, completionTokens: true },
      }),
      // Clientes que usaram o bot nos últimos 7 dias
      this.prisma.whatsAppMessage.groupBy({
        by: ['companyId'],
        where: {
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          companyId: { not: null },
        },
      }),
    ]);

    const totalCostUsd = llmCostAgg._sum.llmCostUsd ?? 0;

    // MRR estimado: (mensal * 19.90) + (anual * 199.90 / 12)
    const mrr =
      subscriptionStats.monthly * 19.9 +
      subscriptionStats.annual * (199.9 / 12);

    return {
      clients: {
        total: totalClients,
        thisMonth: clientsThisMonth,
        thisWeek: clientsThisWeek,
        activeLastWeek: activeClients.length,
      },
      messages: {
        total: totalMessages,
        thisMonth: messagesThisMonth,
      },
      revenue: {
        mrr,
      },
      llmCost: {
        totalUsd: totalCostUsd,
        totalBrl: totalCostUsd * this.USD_TO_BRL,
        totalTokens:
          (llmCostAgg._sum.promptTokens ?? 0) +
          (llmCostAgg._sum.completionTokens ?? 0),
      },
      subscriptionStats,
      recentClients: recentClients.map((u) => {
        const sub = u.company.subscription;
        let status = 'Sem plano';
        if (u.company.plan === 'BUSINESS') status = 'Vitalício';
        else if (sub?.status === 'ACTIVE')
          status = sub.plan === 'ANNUAL' ? 'Anual' : 'Mensal';
        else if (sub?.status === 'TRIALING') status = 'Trial';
        else if (sub?.status === 'PAST_DUE') status = 'Pendente';
        else if (sub?.status === 'CANCELED') status = 'Cancelado';

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          companyName: u.company.name,
          status,
          createdAt: u.createdAt,
        };
      }),
    };
  }

  private async getSubscriptionStats() {
    const [trialing, active, pastDue, canceled, lifetime] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'TRIALING' } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELED' } }),
      this.prisma.company.count({ where: { plan: 'BUSINESS' } }),
    ]);
    // Vitalício (BUSINESS) não paga — excluir do MRR
    const monthly = await this.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        plan: 'MONTHLY',
        company: { plan: { not: 'BUSINESS' } },
      },
    });
    const annual = await this.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        plan: 'ANNUAL',
        company: { plan: { not: 'BUSINESS' } },
      },
    });

    return { trialing, active, pastDue, canceled, lifetime, monthly, annual };
  }

  async listCompanies() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        phone: true,
        plan: true,
        whatsappNumber: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            transactions: true,
          },
        },
      },
    });
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: { not: 'INFLUENCER' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            plan: true,
            _count: { select: { transactions: true } },
            subscription: {
              select: {
                plan: true,
                status: true,
                trialEndsAt: true,
                currentPeriodEnd: true,
                nextPaymentAt: true,
                lastPaymentAt: true,
              },
            },
          },
        },
      },
    });

    // Per-company LLM cost aggregation
    const llmAgg = await this.prisma.whatsAppMessage.groupBy({
      by: ['companyId'],
      _sum: { llmCostUsd: true, promptTokens: true, completionTokens: true },
      _count: true,
    });
    const llmByCompany = new Map(
      llmAgg.map((r) => [
        r.companyId,
        {
          messages: r._count,
          costUsd: r._sum.llmCostUsd ?? 0,
          tokens: (r._sum.promptTokens ?? 0) + (r._sum.completionTokens ?? 0),
        },
      ]),
    );

    return users.map((u) => {
      const sub = u.company.subscription;
      const llm = llmByCompany.get(u.companyId) ?? {
        messages: 0,
        costUsd: 0,
        tokens: 0,
      };
      let accessLabel = 'Sem assinatura';
      if (u.company.plan === 'BUSINESS') {
        accessLabel = 'Vitalício';
      } else if (sub) {
        if (sub.status === 'TRIALING') {
          const daysLeft = Math.max(
            0,
            Math.ceil(
              (new Date(sub.trialEndsAt).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          accessLabel = `Trial (${daysLeft}d restante)`;
        } else if (sub.status === 'ACTIVE') {
          accessLabel =
            sub.plan === 'MONTHLY' ? 'Mensal ativo' : 'Anual ativo';
        } else if (sub.status === 'PAST_DUE') {
          accessLabel = 'Pagamento pendente';
        } else if (sub.status === 'CANCELED') {
          accessLabel = 'Cancelado';
        } else if (sub.status === 'EXPIRED') {
          accessLabel = 'Expirado';
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        companyName: u.company.name,
        companyPlan: u.company.plan,
        subscriptionStatus: sub?.status ?? null,
        subscriptionPlan: sub?.plan ?? null,
        trialEndsAt: sub?.trialEndsAt ?? null,
        currentPeriodEnd: sub?.currentPeriodEnd ?? null,
        lastPaymentAt: sub?.lastPaymentAt ?? null,
        accessLabel,
        totalTransactions: u.company._count.transactions,
        totalMessages: llm.messages,
        llmCostUsd: llm.costUsd,
        llmCostBrl: llm.costUsd * this.USD_TO_BRL,
        totalTokens: llm.tokens,
      };
    });
  }

  /**
   * Cria um cliente manualmente pelo painel admin. Cria company + user +
   * categorias padrão e aplica o plano inicial escolhido. Não valida se o
   * número tem WhatsApp ativo (admin é quem cadastra, pode usar número de
   * teste) e não envia mensagem de boas-vindas.
   */
  async createUser(
    input: {
      name: string;
      email: string;
      phone: string;
      password: string;
      accessType: AccessType;
      // Tipo de conta. Default USER (cliente). ADMIN = admin da plataforma.
      // INFLUENCER = afiliado com área e comissões.
      role?: AccountRole;
      // Influencer indicador (id) — só pra contas USER, atribuição manual.
      referredByInfluencerId?: string;
      // Dados do influencer — só quando role = INFLUENCER.
      influencer?: {
        refCode?: string;
        saleCommissionPct?: number;
        recurringCommissionPct?: number;
        pixKey?: string;
        notes?: string;
      };
    },
    req: Request,
  ) {
    const name = input.name?.trim();
    if (!name || name.length < 2) {
      throw new BadRequestException('Nome deve ter no mínimo 2 caracteres');
    }

    const email = input.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email inválido');
    }

    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new BadRequestException(
        'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
      );
    }

    if (!input.password || input.password.length < 6) {
      throw new BadRequestException('Senha deve ter no mínimo 6 caracteres');
    }

    const role: AccountRole = input.role ?? 'USER';
    const validRoles: AccountRole[] = ['USER', 'ADMIN', 'INFLUENCER'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('Tipo de conta inválido');
    }

    // Influencer que JÁ tem conta (mesmo WhatsApp): anexa o perfil de influencer
    // à conta existente em vez de criar uma conta nova. Acumula os papéis —
    // a pessoa segue cliente E vira afiliada, com o mesmo login e número.
    if (role === 'INFLUENCER') {
      const existing = await this.prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          role: true,
          influencer: { select: { id: true } },
        },
      });
      if (existing) {
        if (existing.influencer) {
          throw new ConflictException('Essa conta já é influencer');
        }
        await this.influencers.createProfile(existing.id, {
          ...(input.influencer ?? {}),
          fallbackName: existing.name,
        });
        await this.audit.log({
          req,
          action: 'CREATE_INFLUENCER',
          targetType: 'user',
          targetId: existing.id,
          targetLabel: `${existing.name} (${existing.email})`,
          description: `Tornou ${existing.name} (${existing.email}) influencer — perfil anexado à conta existente`,
          metadata: {
            role: existing.role,
            attachedToExisting: true,
            companyId: existing.companyId,
            phone,
          },
        });
        return {
          message: `${existing.name} agora também é influencer (perfil anexado à conta existente).`,
          user: {
            id: existing.id,
            name: existing.name,
            email: existing.email,
            phone,
            role: existing.role,
            companyId: existing.companyId,
          },
        };
      }
    }

    // accessType só importa pra cliente (USER).
    if (role === 'USER') {
      const validAccess: AccessType[] = [
        'TRIAL',
        'MONTHLY',
        'ANNUAL',
        'LIFETIME',
      ];
      if (!validAccess.includes(input.accessType)) {
        throw new BadRequestException('Tipo de acesso inválido');
      }
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existingPhone) {
      throw new ConflictException('Este WhatsApp já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name, email },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name,
          email,
          passwordHash,
          phone,
          role,
          isActive: true,
        },
      });

      // Perfil de influencer criado na mesma transação (refCode único).
      if (role === 'INFLUENCER') {
        await this.influencers.createProfile(
          user.id,
          { ...(input.influencer ?? {}), fallbackName: name },
          tx,
        );
      }

      // Atribuição manual de indicador (só pra cliente).
      if (role === 'USER' && input.referredByInfluencerId) {
        await this.influencers.attachReferral(
          company.id,
          input.referredByInfluencerId,
          tx,
        );
      }

      return { company, user };
    });

    // Categorias padrão só pra cliente (USER).
    if (role === 'USER') {
      seedDefaultCategories(this.prisma as never, result.company.id).catch(
        (err) =>
          this.logger.warn(
            `Falha ao criar categorias padrão: ${err instanceof Error ? err.message : 'erro'}`,
          ),
      );
      await this.updateUserAccess(result.user.id, input.accessType, req);
    }

    const roleLabel =
      role === 'ADMIN'
        ? 'administrador'
        : role === 'INFLUENCER'
          ? 'influencer'
          : 'cliente';
    const accessSuffix =
      role === 'USER'
        ? ` com acesso ${this.accessTypeLabel(input.accessType)}`
        : '';

    await this.audit.log({
      req,
      action:
        role === 'INFLUENCER'
          ? 'CREATE_INFLUENCER'
          : role === 'ADMIN'
            ? 'CREATE_ADMIN'
            : 'CREATE_USER',
      targetType: 'user',
      targetId: result.user.id,
      targetLabel: `${result.user.name} (${result.user.email})`,
      description: `Criou o ${roleLabel} ${result.user.name} (${result.user.email})${accessSuffix}`,
      metadata: {
        role,
        accessType: role === 'USER' ? input.accessType : undefined,
        companyId: result.company.id,
        phone: result.user.phone,
      },
    });

    return {
      message: `${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)} criado com sucesso`,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role,
        companyId: result.company.id,
      },
    };
  }

  private accessTypeLabel(t: AccessType): string {
    return t === 'TRIAL'
      ? 'TRIAL (3 dias)'
      : t === 'MONTHLY'
        ? 'MENSAL'
        : t === 'ANNUAL'
          ? 'ANUAL'
          : 'VITALÍCIO';
  }

  private accessTypeAction(t: AccessType): AdminActionType {
    return t === 'TRIAL'
      ? 'GRANT_TRIAL'
      : t === 'MONTHLY'
        ? 'GRANT_MONTHLY'
        : t === 'ANNUAL'
          ? 'GRANT_ANNUAL'
          : 'GRANT_LIFETIME';
  }

  async updateUserAccess(
    userId: string,
    accessType: AccessType,
    req?: Request,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    let resultMessage: string;

    if (accessType === 'LIFETIME') {
      // Set company plan to BUSINESS (used as lifetime flag)
      await this.prisma.company.update({
        where: { id: user.companyId },
        data: { plan: 'BUSINESS' },
      });
      // If subscription exists, mark ACTIVE
      await this.prisma.subscription.updateMany({
        where: { companyId: user.companyId },
        data: { status: 'ACTIVE' },
      });
      resultMessage = 'Acesso vitalício concedido';
    } else if (accessType === 'TRIAL') {
      // Reset trial: 3 days
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3);

      await this.prisma.company.update({
        where: { id: user.companyId },
        data: { plan: 'FREE' },
      });

      const existing = await this.prisma.subscription.findUnique({
        where: { companyId: user.companyId },
      });
      if (existing) {
        await this.prisma.subscription.update({
          where: { companyId: user.companyId },
          data: { status: 'TRIALING', trialEndsAt: trialEnd },
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            plan: 'MONTHLY',
            status: 'TRIALING',
            trialEndsAt: trialEnd,
          },
        });
      }
      resultMessage = 'Trial de 3 dias concedido';
    } else {
      const plan = accessType === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL';
      const periodEnd = new Date();
      if (accessType === 'MONTHLY') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      await this.prisma.company.update({
        where: { id: user.companyId },
        data: { plan: 'STARTER' },
      });

      const existing = await this.prisma.subscription.findUnique({
        where: { companyId: user.companyId },
      });
      if (existing) {
        await this.prisma.subscription.update({
          where: { companyId: user.companyId },
          data: {
            plan,
            status: 'ACTIVE',
            currentPeriodEnd: periodEnd,
            lastPaymentAt: new Date(),
          },
        });
      } else {
        await this.prisma.subscription.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            plan,
            status: 'ACTIVE',
            trialEndsAt: new Date(),
            currentPeriodEnd: periodEnd,
            lastPaymentAt: new Date(),
          },
        });
      }
      resultMessage = `Plano ${accessType === 'MONTHLY' ? 'mensal' : 'anual'} ativado`;
    }

    // Venda de plano pago → gera comissão se a empresa foi indicada por um
    // influencer (primeira venda = SALE, renovações = RECURRING). Só mensal e
    // anual comissionam — vitalício não tem preço fixo.
    if (accessType === 'MONTHLY' || accessType === 'ANNUAL') {
      await this.commissions.recordPlanSale(user.companyId, accessType);
    }

    if (req) {
      await this.audit.log({
        req,
        action: this.accessTypeAction(accessType),
        targetType: 'user',
        targetId: user.id,
        targetLabel: `${user.name} (${user.email})`,
        description: `Deu acesso ${this.accessTypeLabel(accessType)} pro cliente ${user.name} (${user.email})`,
        metadata: { accessType, companyId: user.companyId },
      });
    }

    return { message: resultMessage };
  }

  /**
   * Atualiza dados básicos do user (nome, email, phone). Phone é normalizado
   * automaticamente pro formato JID (55+DDD+número).
   */
  async updateUserData(
    userId: string,
    input: { name?: string; email?: string; phone?: string },
    req: Request,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true, phone: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const data: { name?: string; email?: string; phone?: string } = {};

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length < 2) {
        throw new BadRequestException('Nome deve ter no mínimo 2 caracteres');
      }
      data.name = trimmed;
    }

    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Email inválido');
      }
      const existing = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true },
      });
      if (existing) throw new ConflictException('Este email já está em uso');
      data.email = email;
    }

    if (input.phone !== undefined) {
      const normalized = normalizePhone(input.phone);
      if (!normalized) {
        throw new BadRequestException(
          'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
        );
      }
      const existing = await this.prisma.user.findFirst({
        where: { phone: normalized, id: { not: userId } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Este WhatsApp já está em uso');
      }
      data.phone = normalized;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhum campo enviado pra atualizar');
    }

    await this.prisma.user.update({ where: { id: userId }, data });

    const changes: string[] = [];
    if (data.name && data.name !== user.name) changes.push(`nome: "${user.name}" → "${data.name}"`);
    if (data.email && data.email !== user.email) changes.push(`email: "${user.email}" → "${data.email}"`);
    if (data.phone && data.phone !== user.phone) changes.push(`whatsapp: "${user.phone}" → "${data.phone}"`);

    await this.audit.log({
      req,
      action: 'UPDATE_USER_DATA',
      targetType: 'user',
      targetId: user.id,
      targetLabel: `${data.name ?? user.name} (${data.email ?? user.email})`,
      description: `Editou dados do cliente ${user.name} (${user.email}) — ${changes.join(', ') || 'sem mudanças efetivas'}`,
      metadata: {
        before: { name: user.name, email: user.email, phone: user.phone },
        after: data,
      },
    });

    return { message: 'Dados atualizados' };
  }

  async deleteUser(userId: string, req: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, role: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === 'ADMIN') {
      throw new NotFoundException('Não é possível excluir o administrador');
    }

    // Delete all related data for the user's company
    await this.prisma.$transaction([
      this.prisma.whatsAppMessage.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.whatsAppInstance.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.accountTransaction.deleteMany({
        where: {
          transaction: { companyId: user.companyId },
        },
      }),
      this.prisma.transaction.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.passwordResetCode.deleteMany({
        where: { userId: user.id },
      }),
      this.prisma.subscription.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.bankAccount.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.category.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.segment.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.client.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.supplier.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.budget.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.alert.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.investment.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.user.deleteMany({
        where: { companyId: user.companyId },
      }),
      this.prisma.company.delete({
        where: { id: user.companyId },
      }),
    ]);

    await this.audit.log({
      req,
      action: 'DELETE_USER',
      targetType: 'user',
      targetId: user.id,
      targetLabel: `${user.name} (${user.email})`,
      description: `Excluiu o cliente ${user.name} (${user.email}) e todos os dados da empresa`,
      metadata: { companyId: user.companyId },
    });

    return { message: 'Usuário e empresa excluídos' };
  }
}
