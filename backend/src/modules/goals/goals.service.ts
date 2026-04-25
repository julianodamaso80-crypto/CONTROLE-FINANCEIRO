import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { companyId },
      include: {
        _count: { select: { contributions: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      const daysLeft = g.targetDate ? this.daysBetween(new Date(), g.targetDate) : null;
      return {
        ...g,
        targetAmount: target,
        currentAmount: current,
        progress: Math.round(progress * 100) / 100,
        remaining: Math.max(0, target - current),
        daysLeft,
      };
    });
  }

  async findOne(companyId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, companyId },
      include: {
        contributions: { orderBy: { date: 'desc' } },
      },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    const target = Number(goal.targetAmount);
    const current = Number(goal.currentAmount);
    return {
      ...goal,
      targetAmount: target,
      currentAmount: current,
      progress: target > 0 ? Math.min(100, (current / target) * 100) : 0,
      remaining: Math.max(0, target - current),
      daysLeft: goal.targetDate ? this.daysBetween(new Date(), goal.targetDate) : null,
      contributions: goal.contributions.map((c) => ({ ...c, amount: Number(c.amount) })),
    };
  }

  async create(companyId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount ?? 0,
        targetDate: dto.targetDate,
        color: dto.color ?? '#22C55E',
        icon: dto.icon ?? 'target',
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(companyId, id);
    return this.prisma.goal.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.goal.delete({ where: { id } });
    return { message: 'Meta removida' };
  }

  async contribute(companyId: string, id: string, dto: ContributeGoalDto) {
    const goal = await this.findOne(companyId, id);
    const date = dto.date ?? new Date();

    const contribution = await this.prisma.goalContribution.create({
      data: {
        goalId: goal.id,
        amount: dto.amount,
        date,
        notes: dto.notes,
      },
    });

    const newAmount = Number(goal.currentAmount) + dto.amount;
    const target = Number(goal.targetAmount);
    const reachedTarget = newAmount >= target;

    await this.prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentAmount: newAmount,
        ...(reachedTarget && goal.status === 'ACTIVE' ? { status: 'COMPLETED' } : {}),
      },
    });

    return contribution;
  }

  async removeContribution(companyId: string, goalId: string, contributionId: string) {
    const goal = await this.findOne(companyId, goalId);
    const contrib = await this.prisma.goalContribution.findFirst({
      where: { id: contributionId, goalId: goal.id },
    });
    if (!contrib) throw new NotFoundException('Contribuição não encontrada');

    await this.prisma.goalContribution.delete({ where: { id: contributionId } });
    const newAmount = Math.max(0, Number(goal.currentAmount) - Number(contrib.amount));
    await this.prisma.goal.update({
      where: { id: goal.id },
      data: { currentAmount: newAmount },
    });
    return { message: 'Contribuição removida' };
  }

  private daysBetween(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }
}
