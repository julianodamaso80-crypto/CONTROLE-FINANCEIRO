import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { companyId },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula gasto atual de cada budget no período
    return Promise.all(
      budgets.map(async (b) => {
        const spent = await this.computeSpent(companyId, b.categoryId, b.startDate, b.endDate);
        const amount = Number(b.amount);
        const usedPct = amount > 0 ? (spent / amount) * 100 : 0;
        const alertReached = usedPct >= b.alertThreshold;
        const exceeded = spent > amount;
        return {
          ...b,
          amount,
          spent,
          remaining: amount - spent,
          usedPct: Math.round(usedPct * 100) / 100,
          alertReached,
          exceeded,
        };
      }),
    );
  }

  async findOne(companyId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, companyId },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true, type: true } },
      },
    });
    if (!budget) throw new NotFoundException('Orçamento não encontrado');
    const spent = await this.computeSpent(companyId, budget.categoryId, budget.startDate, budget.endDate);
    const amount = Number(budget.amount);
    return {
      ...budget,
      amount,
      spent,
      remaining: amount - spent,
      usedPct: Math.round((amount > 0 ? (spent / amount) * 100 : 0) * 100) / 100,
    };
  }

  async create(companyId: string, dto: CreateBudgetDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, companyId },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('Data final deve ser posterior à inicial');
    }
    return this.prisma.budget.create({
      data: {
        companyId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        period: dto.period,
        startDate: dto.startDate,
        endDate: dto.endDate,
        alertThreshold: dto.alertThreshold ?? 80,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(companyId, id);
    if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('Data final deve ser posterior à inicial');
    }
    return this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.period ? { period: dto.period } : {}),
        ...(dto.startDate ? { startDate: dto.startDate } : {}),
        ...(dto.endDate ? { endDate: dto.endDate } : {}),
        ...(dto.alertThreshold !== undefined ? { alertThreshold: dto.alertThreshold } : {}),
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Orçamento removido' };
  }

  private async computeSpent(companyId: string, categoryId: string, start: Date, end: Date): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        companyId,
        categoryId,
        type: 'EXPENSE',
        status: { in: ['PAID', 'PENDING', 'OVERDUE'] },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }
}
