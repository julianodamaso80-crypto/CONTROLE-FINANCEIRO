import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommissionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Preço-base de cada plano pago usado pra calcular a comissão do influencer.
 * Espelha o PLAN_VALUES de subscriptions.service. Só mensal e anual geram
 * comissão (vitalício não tem preço fixo, então não comissiona).
 */
export const PLAN_PRICES: Record<'MONTHLY' | 'ANNUAL', number> = {
  MONTHLY: 19.9,
  ANNUAL: 199.9,
};

type PaidPlan = 'MONTHLY' | 'ANNUAL';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  /**
   * Registra a comissão de uma venda de plano pago, se a empresa foi indicada
   * por um influencer ativo. A primeira venda da empresa gera SALE; as
   * seguintes geram RECURRING. O % e o valor são congelados no momento da
   * geração (não mudam se o admin alterar os percentuais depois).
   *
   * Fire-and-forget seguro: nunca lança — só loga em caso de falha, pra não
   * quebrar a concessão de plano.
   */
  async recordPlanSale(companyId: string, plan: PaidPlan): Promise<void> {
    try {
      const referral = await this.prisma.referral.findUnique({
        where: { companyId },
        include: { influencer: true },
      });
      if (!referral || !referral.influencer.isActive) return;

      const base = PLAN_PRICES[plan];
      if (!base || base <= 0) return;

      // SALE = primeira venda da empresa (sem comissão SALE válida ainda).
      const priorSales = await this.prisma.commission.count({
        where: { companyId, type: 'SALE', status: { not: 'CANCELED' } },
      });
      const type: CommissionType = priorSales > 0 ? 'RECURRING' : 'SALE';

      const pct =
        type === 'SALE'
          ? referral.influencer.saleCommissionPct
          : referral.influencer.recurringCommissionPct;
      const pctNum = Number(pct);
      const amount = this.round2((base * pctNum) / 100);
      if (amount <= 0) return;

      const planLabel = plan === 'MONTHLY' ? 'Mensal' : 'Anual';

      await this.prisma.commission.create({
        data: {
          influencerId: referral.influencerId,
          companyId,
          type,
          baseAmount: new Prisma.Decimal(base),
          percentage: pct,
          amount: new Prisma.Decimal(amount),
          description: `${type === 'SALE' ? 'Venda' : 'Renovação'} — plano ${planLabel}`,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao registrar comissão (company=${companyId}, plan=${plan}): ${
          err instanceof Error ? err.message : 'erro'
        }`,
      );
    }
  }

  async markPaid(commissionId: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id: commissionId },
    });
    if (!commission) throw new NotFoundException('Comissão não encontrada');
    if (commission.status === 'PAID') {
      return { message: 'Comissão já estava marcada como paga' };
    }
    await this.prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    return { message: 'Comissão marcada como paga' };
  }

  async cancel(commissionId: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id: commissionId },
    });
    if (!commission) throw new NotFoundException('Comissão não encontrada');
    await this.prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'CANCELED', paidAt: null },
    });
    return { message: 'Comissão cancelada' };
  }
}
