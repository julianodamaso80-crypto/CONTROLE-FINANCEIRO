import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toMoney, subtractMoney } from '../../common/utils/money.util';
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
      // Chart by day: transações pagas no período
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

    // Monta KPIs com precisão decimal
    const totalIncome = toMoney(incomeAgg._sum.amount);
    const totalExpense = toMoney(expenseAgg._sum.amount);

    const kpis: DashboardKpis = {
      totalIncome,
      totalExpense,
      balance: subtractMoney(totalIncome, totalExpense),
      pendingIncome: toMoney(pendingIncomeAgg._sum.amount),
      pendingExpense: toMoney(pendingExpenseAgg._sum.amount),
      overdueCount,
      transactionCount,
    };

    const chartByDay = this.buildChartByDay(from, to, paidTransactions);

    const chartByCategory = await this.buildChartByCategory(
      companyId,
      expenseByCategory,
      totalExpense,
    );

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
    // Mapa de dia -> acumuladores Decimal
    const dayMap = new Map<
      string,
      { income: Decimal; expense: Decimal }
    >();

    // Inicializa todos os dias do período
    const current = new Date(from);
    while (current <= to) {
      const key = current.toISOString().slice(0, 10);
      dayMap.set(key, { income: new Decimal(0), expense: new Decimal(0) });
      current.setDate(current.getDate() + 1);
    }

    // Preenche com os dados reais usando Decimal pra precisão
    for (const tx of transactions) {
      const key = tx.date.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        const amount = new Decimal(tx.amount.toString());
        if (tx.type === 'INCOME') {
          entry.income = entry.income.plus(amount);
        } else {
          entry.expense = entry.expense.plus(amount);
        }
      }
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        income: toMoney(values.income),
        expense: toMoney(values.expense),
      }));
  }

  /**
   * Constrói o gráfico de pizza por CATEGORIA PAI de despesa.
   * Se uma transação usa uma subcategoria, soma no pai.
   * Isso dá uma visão mais limpa no gráfico.
   */
  private async buildChartByCategory(
    companyId: string,
    grouped: Array<{
      categoryId: string | null;
      _sum: { amount: Prisma.Decimal | null };
    }>,
    totalExpense: number,
  ): Promise<ChartByCategory[]> {
    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);

    const categories =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: categoryIds }, companyId },
            select: {
              id: true,
              name: true,
              color: true,
              parentCategoryId: true,
              parent: { select: { id: true, name: true, color: true } },
            },
          })
        : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // Agrupa por categoria pai (ou por ela mesma se não tem pai)
    const byParent = new Map<
      string,
      { name: string; color: string; total: number }
    >();

    for (const g of grouped) {
      const total = toMoney(g._sum.amount);
      const cat = g.categoryId ? categoryMap.get(g.categoryId) : undefined;
      const parent = cat?.parent ?? cat;
      const key = parent?.id ?? '__none__';
      const existing = byParent.get(key);

      if (existing) {
        existing.total += total;
      } else {
        byParent.set(key, {
          name: parent?.name ?? 'Sem categoria',
          color: parent?.color ?? '#9ca3af',
          total,
        });
      }
    }

    return Array.from(byParent.entries()).map(([id, item]) => ({
      categoryId: id === '__none__' ? null : id,
      categoryName: item.name,
      categoryColor: item.color,
      total: item.total,
      percentage:
        totalExpense > 0
          ? Number(
              new Decimal(item.total)
                .div(new Decimal(totalExpense))
                .mul(100)
                .toFixed(2),
            )
          : 0,
    }));
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
    // Agrupa por segmentId usando Decimal pra precisão
    const segmentMap = new Map<
      string | null,
      { income: Decimal; expense: Decimal }
    >();

    for (const g of grouped) {
      const key = g.segmentId;
      const existing = segmentMap.get(key) ?? {
        income: new Decimal(0),
        expense: new Decimal(0),
      };
      const amount = new Decimal((g._sum.amount ?? 0).toString());

      if (g.type === 'INCOME') {
        existing.income = existing.income.plus(amount);
      } else {
        existing.expense = existing.expense.plus(amount);
      }

      segmentMap.set(key, existing);
    }

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
        income: toMoney(values.income),
        expense: toMoney(values.expense),
        balance: subtractMoney(values.income, values.expense),
      };
    });
  }
}
