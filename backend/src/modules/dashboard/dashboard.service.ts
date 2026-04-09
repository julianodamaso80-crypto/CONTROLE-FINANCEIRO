import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

export interface ChartByDay {
  date: string;
  income: number;
  expense: number;
}

export interface ChartByCategory {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

export interface ChartBySegment {
  segmentId: string | null;
  segmentName: string;
  segmentColor: string;
  income: number;
  expense: number;
  balance: number;
}

export interface DashboardKpis {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  overdueCount: number;
  transactionCount: number;
}

export interface DashboardResponse {
  period: { from: Date; to: Date };
  kpis: DashboardKpis;
  chartByDay: ChartByDay[];
  chartByCategory: ChartByCategory[];
  chartBySegment: ChartBySegment[];
  recentTransactions: unknown[];
  upcomingDue: unknown[];
}

// Converte Decimal do Prisma para number
function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(
    companyId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardResponse> {
    // Calcula período — default: mês corrente
    const now = new Date();
    const from = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = query.dateTo
      ? new Date(query.dateTo)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filtro base compartilhado por todas as queries
    const baseWhere: Prisma.TransactionWhereInput = {
      companyId,
      ...(query.segmentId ? { segmentId: query.segmentId } : {}),
    };

    // Filtro com período
    const periodWhere: Prisma.TransactionWhereInput = {
      ...baseWhere,
      date: { gte: from, lte: to },
    };

    const transactionIncludes = {
      category: { select: { id: true, name: true, color: true, icon: true } },
      client: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      segment: { select: { id: true, name: true, color: true } },
      accountTransactions: {
        include: {
          bankAccount: { select: { id: true, name: true, type: true } },
        },
      },
    };

    // Executa todas as queries em paralelo
    const [
      incomeAgg,
      expenseAgg,
      pendingIncomeAgg,
      pendingExpenseAgg,
      overdueCount,
      transactionCount,
      paidTransactions,
      expenseByCategory,
      transactionsBySegment,
      recentTransactions,
      upcomingDue,
    ] = await Promise.all([
      // KPI: receitas pagas no período
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...periodWhere, type: 'INCOME', status: 'PAID' },
      }),
      // KPI: despesas pagas no período
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...periodWhere, type: 'EXPENSE', status: 'PAID' },
      }),
      // KPI: receitas pendentes com vencimento no período
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          ...baseWhere,
          type: 'INCOME',
          status: 'PENDING',
          dueDate: { gte: from, lte: to },
        },
      }),
      // KPI: despesas pendentes com vencimento no período
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          ...baseWhere,
          type: 'EXPENSE',
          status: 'PENDING',
          dueDate: { gte: from, lte: to },
        },
      }),
      // KPI: transações em atraso (vencidas)
      this.prisma.transaction.count({
        where: {
          ...baseWhere,
          status: 'OVERDUE',
          dueDate: { lt: now },
        },
      }),
      // KPI: total de transações no período
      this.prisma.transaction.count({ where: periodWhere }),
      // Chart by day: transações pagas no período pra montar o gráfico diário
      this.prisma.transaction.findMany({
        where: { ...periodWhere, status: 'PAID' },
        select: { date: true, type: true, amount: true },
      }),
      // Chart by category: despesas pagas agrupadas por categoria
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: { ...periodWhere, type: 'EXPENSE', status: 'PAID' },
        orderBy: { _sum: { amount: 'desc' } },
        take: 8,
      }),
      // Chart by segment: agrupamento por segmento
      this.prisma.transaction.groupBy({
        by: ['segmentId', 'type'],
        _sum: { amount: true },
        where: { ...periodWhere, status: 'PAID' },
      }),
      // Últimas 10 transações criadas
      this.prisma.transaction.findMany({
        where: baseWhere,
        include: transactionIncludes,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Próximas 5 contas a vencer
      this.prisma.transaction.findMany({
        where: {
          ...baseWhere,
          status: 'PENDING',
          dueDate: { gte: now },
        },
        include: transactionIncludes,
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    // Monta KPIs
    const totalIncome = decimalToNumber(incomeAgg._sum.amount);
    const totalExpense = decimalToNumber(expenseAgg._sum.amount);

    const kpis: DashboardKpis = {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      pendingIncome: decimalToNumber(pendingIncomeAgg._sum.amount),
      pendingExpense: decimalToNumber(pendingExpenseAgg._sum.amount),
      overdueCount,
      transactionCount,
    };

    // Monta chart by day
    const chartByDay = this.buildChartByDay(from, to, paidTransactions);

    // Monta chart by category — busca nomes das categorias
    const chartByCategory = await this.buildChartByCategory(
      companyId,
      expenseByCategory,
      totalExpense,
    );

    // Monta chart by segment
    const chartBySegment = await this.buildChartBySegment(
      companyId,
      transactionsBySegment,
    );

    return {
      period: { from, to },
      kpis,
      chartByDay,
      chartByCategory,
      chartBySegment,
      recentTransactions,
      upcomingDue,
    };
  }

  /** Constrói o array de receita/despesa por dia do período */
  private buildChartByDay(
    from: Date,
    to: Date,
    transactions: Array<{ date: Date; type: string; amount: Prisma.Decimal }>,
  ): ChartByDay[] {
    // Mapa de dia -> { income, expense }
    const dayMap = new Map<string, { income: number; expense: number }>();

    // Inicializa todos os dias do período
    const current = new Date(from);
    while (current <= to) {
      const key = current.toISOString().slice(0, 10);
      dayMap.set(key, { income: 0, expense: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Preenche com os dados reais
    for (const tx of transactions) {
      const key = tx.date.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        const amount = decimalToNumber(tx.amount);
        if (tx.type === 'INCOME') {
          entry.income += amount;
        } else {
          entry.expense += amount;
        }
      }
    }

    // Converte pra array ordenado
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        income: Math.round(values.income * 100) / 100,
        expense: Math.round(values.expense * 100) / 100,
      }));
  }

  /** Constrói o gráfico de pizza por categoria de despesa */
  private async buildChartByCategory(
    companyId: string,
    grouped: Array<{
      categoryId: string | null;
      _sum: { amount: Prisma.Decimal | null };
    }>,
    totalExpense: number,
  ): Promise<ChartByCategory[]> {
    // Busca dados das categorias referenciadas
    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);

    const categories =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: categoryIds }, companyId },
            select: { id: true, name: true, color: true },
          })
        : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return grouped.map((g) => {
      const total = decimalToNumber(g._sum.amount);
      const cat = g.categoryId ? categoryMap.get(g.categoryId) : undefined;

      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? 'Sem categoria',
        categoryColor: cat?.color ?? '#9ca3af',
        total: Math.round(total * 100) / 100,
        percentage:
          totalExpense > 0
            ? Math.round((total / totalExpense) * 10000) / 100
            : 0,
      };
    });
  }

  /** Constrói o agrupamento por segmento */
  private async buildChartBySegment(
    companyId: string,
    grouped: Array<{
      segmentId: string | null;
      type: string;
      _sum: { amount: Prisma.Decimal | null };
    }>,
  ): Promise<ChartBySegment[]> {
    // Agrupa por segmentId somando income e expense
    const segmentMap = new Map<
      string | null,
      { income: number; expense: number }
    >();

    for (const g of grouped) {
      const key = g.segmentId;
      const existing = segmentMap.get(key) ?? { income: 0, expense: 0 };
      const amount = decimalToNumber(g._sum.amount);

      if (g.type === 'INCOME') {
        existing.income += amount;
      } else {
        existing.expense += amount;
      }

      segmentMap.set(key, existing);
    }

    // Busca dados dos segmentos
    const segmentIds = Array.from(segmentMap.keys()).filter(
      (id): id is string => id !== null,
    );

    const segments =
      segmentIds.length > 0
        ? await this.prisma.segment.findMany({
            where: { id: { in: segmentIds }, companyId },
            select: { id: true, name: true, color: true },
          })
        : [];

    const segmentLookup = new Map(segments.map((s) => [s.id, s]));

    return Array.from(segmentMap.entries()).map(([segId, values]) => {
      const seg = segId ? segmentLookup.get(segId) : undefined;
      return {
        segmentId: segId,
        segmentName: seg?.name ?? 'Sem segmento',
        segmentColor: seg?.color ?? '#9ca3af',
        income: Math.round(values.income * 100) / 100,
        expense: Math.round(values.expense * 100) / 100,
        balance: Math.round((values.income - values.expense) * 100) / 100,
      };
    });
  }
}
