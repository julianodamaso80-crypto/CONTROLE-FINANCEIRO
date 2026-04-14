import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalCompanies,
      totalUsers,
      totalTransactions,
      incomeAgg,
      expenseAgg,
      recentCompanies,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'INCOME', status: 'PAID' },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'EXPENSE', status: 'PAID' },
      }),
      this.prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          createdAt: true,
          _count: { select: { users: true, transactions: true } },
        },
      }),
    ]);

    return {
      totals: {
        companies: totalCompanies,
        users: totalUsers,
        transactions: totalTransactions,
        totalIncome: incomeAgg._sum.amount?.toString() ?? '0',
        totalExpense: expenseAgg._sum.amount?.toString() ?? '0',
      },
      recentCompanies,
    };
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
}
