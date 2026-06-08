import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InfluencersService {
  private readonly logger = new Logger(InfluencersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Normaliza um texto livre num refCode (slug): minúsculo, sem acento, só a-z0-9. */
  normalizeRefCode(raw: string): string {
    return (raw || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /** Gera um refCode único a partir de uma base (ex: nome do influencer). */
  async generateUniqueRefCode(base: string): Promise<string> {
    let slug = this.normalizeRefCode(base).slice(0, 20);
    if (slug.length < 3) slug = `inf${slug}`;
    let candidate = slug;
    let n = 1;
    // Colisão rara — sufixa número até achar livre.
    while (
      await this.prisma.influencer.findUnique({
        where: { refCode: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${slug}${n++}`;
    }
    return candidate;
  }

  /**
   * Cria o perfil de influencer pra um user já existente (chamado dentro da
   * criação de cliente no admin). Valida e garante refCode único.
   */
  async createProfile(
    userId: string,
    input: {
      refCode?: string;
      saleCommissionPct?: number;
      recurringCommissionPct?: number;
      pixKey?: string;
      notes?: string;
      fallbackName: string;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const salePct = this.validatePct(input.saleCommissionPct ?? 30, 'venda');
    const recPct = this.validatePct(
      input.recurringCommissionPct ?? 10,
      'recorrência',
    );

    let refCode = input.refCode
      ? this.normalizeRefCode(input.refCode)
      : this.normalizeRefCode(input.fallbackName).slice(0, 20);
    if (refCode.length < 3) {
      refCode = await this.generateUniqueRefCode(input.fallbackName);
    } else {
      const taken = await tx.influencer.findUnique({
        where: { refCode },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException(
          `O código de indicação "${refCode}" já está em uso`,
        );
      }
    }

    return tx.influencer.create({
      data: {
        userId,
        refCode,
        saleCommissionPct: new Prisma.Decimal(salePct),
        recurringCommissionPct: new Prisma.Decimal(recPct),
        pixKey: input.pixKey?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
  }

  private validatePct(value: number, label: string): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new BadRequestException(`Percentual de ${label} inválido`);
    }
    if (value < 0 || value > 100) {
      throw new BadRequestException(
        `Percentual de ${label} deve estar entre 0 e 100`,
      );
    }
    return Math.round(value * 100) / 100;
  }

  /**
   * Carimba uma empresa com o influencer dono do refCode (usado no signup ?ref).
   * Silencioso: se o código não existir/estiver inativo, não faz nada.
   */
  async attachReferralByCode(
    companyId: string,
    refCode: string,
  ): Promise<boolean> {
    const code = this.normalizeRefCode(refCode);
    if (!code) return false;
    const influencer = await this.prisma.influencer.findUnique({
      where: { refCode: code },
      select: { id: true, isActive: true },
    });
    if (!influencer || !influencer.isActive) return false;
    return this.attachReferral(companyId, influencer.id);
  }

  /** Vincula uma empresa a um influencer (1 empresa = 1 influencer). */
  async attachReferral(
    companyId: string,
    influencerId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    const existing = await tx.referral.findUnique({
      where: { companyId },
      select: { id: true },
    });
    if (existing) return false; // já indicada — não sobrescreve
    await tx.referral.create({ data: { companyId, influencerId } });
    return true;
  }

  // ===================== ÁREA ADMIN =====================

  /** Lista influencers com totais de indicações e comissões pro painel admin. */
  async listForAdmin() {
    const influencers = await this.prisma.influencer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { referrals: true } },
      },
    });

    const grouped = await this.prisma.commission.groupBy({
      by: ['influencerId', 'status'],
      _sum: { amount: true },
    });

    const sumsByInfluencer = new Map<
      string,
      { pending: number; paid: number; canceled: number }
    >();
    for (const g of grouped) {
      const cur = sumsByInfluencer.get(g.influencerId) ?? {
        pending: 0,
        paid: 0,
        canceled: 0,
      };
      const amt = Number(g._sum.amount ?? 0);
      if (g.status === 'PENDING') cur.pending += amt;
      else if (g.status === 'PAID') cur.paid += amt;
      else cur.canceled += amt;
      sumsByInfluencer.set(g.influencerId, cur);
    }

    return influencers.map((inf) => {
      const sums = sumsByInfluencer.get(inf.id) ?? {
        pending: 0,
        paid: 0,
        canceled: 0,
      };
      return {
        id: inf.id,
        userId: inf.userId,
        name: inf.user.name,
        email: inf.user.email,
        phone: inf.user.phone,
        refCode: inf.refCode,
        saleCommissionPct: Number(inf.saleCommissionPct),
        recurringCommissionPct: Number(inf.recurringCommissionPct),
        pixKey: inf.pixKey,
        notes: inf.notes,
        isActive: inf.isActive,
        createdAt: inf.createdAt,
        totalReferrals: inf._count.referrals,
        pendingCommission: sums.pending,
        paidCommission: sums.paid,
        totalCommission: sums.pending + sums.paid,
      };
    });
  }

  /** Lista simplificada (id + nome + código) pra dropdown "indicado por". */
  async listSimple() {
    const influencers = await this.prisma.influencer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    return influencers.map((inf) => ({
      id: inf.id,
      name: inf.user.name,
      refCode: inf.refCode,
    }));
  }

  async updateProfile(
    influencerId: string,
    input: {
      refCode?: string;
      saleCommissionPct?: number;
      recurringCommissionPct?: number;
      pixKey?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { id: influencerId },
    });
    if (!influencer) throw new NotFoundException('Influencer não encontrado');

    const data: Prisma.InfluencerUpdateInput = {};

    if (input.refCode !== undefined) {
      const code = this.normalizeRefCode(input.refCode);
      if (code.length < 3) {
        throw new BadRequestException(
          'Código de indicação deve ter ao menos 3 caracteres (letras/números)',
        );
      }
      if (code !== influencer.refCode) {
        const taken = await this.prisma.influencer.findUnique({
          where: { refCode: code },
          select: { id: true },
        });
        if (taken) throw new ConflictException('Esse código já está em uso');
        data.refCode = code;
      }
    }
    if (input.saleCommissionPct !== undefined) {
      data.saleCommissionPct = new Prisma.Decimal(
        this.validatePct(input.saleCommissionPct, 'venda'),
      );
    }
    if (input.recurringCommissionPct !== undefined) {
      data.recurringCommissionPct = new Prisma.Decimal(
        this.validatePct(input.recurringCommissionPct, 'recorrência'),
      );
    }
    if (input.pixKey !== undefined) data.pixKey = input.pixKey.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes.trim() || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhum campo enviado pra atualizar');
    }

    await this.prisma.influencer.update({
      where: { id: influencerId },
      data,
    });
    return { message: 'Influencer atualizado' };
  }

  /** Comissões de um influencer (pro painel admin, com nome da empresa). */
  async listCommissionsForAdmin(influencerId?: string) {
    return this.prisma.commission.findMany({
      where: influencerId ? { influencerId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        company: { select: { name: true } },
        influencer: { select: { user: { select: { name: true } } } },
      },
    });
  }

  // ===================== ÁREA DO INFLUENCER =====================

  /** Painel do próprio influencer (perfil + totais + indicados + comissões). */
  async getDashboard(userId: string) {
    const influencer = await this.prisma.influencer.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!influencer) {
      throw new NotFoundException('Perfil de influencer não encontrado');
    }

    const [grouped, referrals, commissions] = await Promise.all([
      this.prisma.commission.groupBy({
        by: ['status'],
        where: { influencerId: influencer.id },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.referral.findMany({
        where: { influencerId: influencer.id },
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              name: true,
              plan: true,
              createdAt: true,
              subscription: { select: { status: true, plan: true } },
            },
          },
        },
      }),
      this.prisma.commission.findMany({
        where: { influencerId: influencer.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { company: { select: { name: true } } },
      }),
    ]);

    let pending = 0;
    let paid = 0;
    let salesCount = 0;
    for (const g of grouped) {
      const amt = Number(g._sum.amount ?? 0);
      if (g.status === 'PENDING') pending += amt;
      else if (g.status === 'PAID') paid += amt;
    }
    salesCount = await this.prisma.commission.count({
      where: { influencerId: influencer.id, status: { not: 'CANCELED' } },
    });

    return {
      profile: {
        name: influencer.user.name,
        email: influencer.user.email,
        refCode: influencer.refCode,
        saleCommissionPct: Number(influencer.saleCommissionPct),
        recurringCommissionPct: Number(influencer.recurringCommissionPct),
        pixKey: influencer.pixKey,
        isActive: influencer.isActive,
      },
      totals: {
        referrals: referrals.length,
        salesCount,
        pendingCommission: pending,
        paidCommission: paid,
        totalCommission: pending + paid,
      },
      referrals: referrals.map((r) => {
        const sub = r.company.subscription;
        let status = 'Sem plano';
        if (r.company.plan === 'BUSINESS') status = 'Vitalício';
        else if (sub?.status === 'ACTIVE')
          status = sub.plan === 'ANNUAL' ? 'Anual' : 'Mensal';
        else if (sub?.status === 'TRIALING') status = 'Trial';
        return {
          companyName: r.company.name,
          status,
          createdAt: r.createdAt,
        };
      }),
      commissions: commissions.map((c) => ({
        id: c.id,
        companyName: c.company.name,
        type: c.type,
        baseAmount: Number(c.baseAmount),
        percentage: Number(c.percentage),
        amount: Number(c.amount),
        status: c.status,
        description: c.description,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
      })),
    };
  }
}
