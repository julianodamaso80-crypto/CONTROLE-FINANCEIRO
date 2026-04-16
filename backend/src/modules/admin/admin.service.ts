import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
      this.prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      this.prisma.user.count({
        where: { role: { not: 'SUPER_ADMIN' }, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.user.count({
        where: { role: { not: 'SUPER_ADMIN' }, createdAt: { gte: startOfWeek } },
      }),
      this.prisma.whatsAppMessage.count(),
      this.prisma.whatsAppMessage.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Últimos 10 clientes cadastrados (excluindo sistema e admin)
      this.prisma.user.findMany({
        where: { role: { not: 'SUPER_ADMIN' } },
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
    const monthly = await this.prisma.subscription.count({
      where: { status: 'ACTIVE', plan: 'MONTHLY' },
    });
    const annual = await this.prisma.subscription.count({
      where: { status: 'ACTIVE', plan: 'ANNUAL' },
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

  async updateUserAccess(
    userId: string,
    accessType: 'TRIAL' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

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
      return { message: 'Acesso vitalício concedido' };
    }

    if (accessType === 'TRIAL') {
      // Reset trial: 7 days
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

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
      return { message: 'Trial de 7 dias concedido' };
    }

    // MONTHLY or ANNUAL — activate subscription
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

    return {
      message: `Plano ${accessType === 'MONTHLY' ? 'mensal' : 'anual'} ativado`,
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, role: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === 'SUPER_ADMIN') {
      throw new NotFoundException('Não é possível excluir o SUPER_ADMIN');
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

    return { message: 'Usuário e empresa excluídos' };
  }
}
