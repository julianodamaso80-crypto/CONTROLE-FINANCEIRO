import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class BudgetAlertsService {
  private readonly logger = new Logger(BudgetAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  /** Roda diariamente às 8h SP, ANTES do bill reminder. */
  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendDailyAlerts(): Promise<void> {
    const today = new Date();
    await this.runForDate(today);
  }

  async runForDate(date: Date): Promise<{ alerts: number; companies: number }> {
    const instances = await this.prisma.whatsAppInstance.findMany({
      where: { status: 'CONNECTED', phoneNumber: { not: null } },
      select: { companyId: true, instanceName: true, phoneNumber: true },
    });

    let totalAlerts = 0;
    let companies = 0;

    for (const inst of instances) {
      if (!inst.phoneNumber) continue;

      const budgets = await this.prisma.budget.findMany({
        where: {
          companyId: inst.companyId,
          startDate: { lte: date },
          endDate: { gte: date },
        },
        include: { category: { select: { name: true } } },
      });
      if (budgets.length === 0) continue;

      const triggers: string[] = [];
      for (const b of budgets) {
        const spent = await this.prisma.transaction.aggregate({
          where: {
            companyId: inst.companyId,
            categoryId: b.categoryId,
            type: 'EXPENSE',
            status: { in: ['PAID', 'PENDING', 'OVERDUE'] },
            date: { gte: b.startDate, lte: b.endDate },
          },
          _sum: { amount: true },
        });
        const spentNum = Number(spent._sum.amount ?? 0);
        const amount = Number(b.amount);
        if (amount <= 0) continue;
        const pct = (spentNum / amount) * 100;

        if (pct >= 100) {
          triggers.push(
            `🚨 *${b.category.name}* — orçamento *ESTOURADO* (${this.fmt(spentNum)} de ${this.fmt(amount)} — ${pct.toFixed(0)}%)`,
          );
        } else if (pct >= b.alertThreshold) {
          triggers.push(
            `⚠️ *${b.category.name}* — usou ${pct.toFixed(0)}% do orçamento (${this.fmt(spentNum)} de ${this.fmt(amount)})`,
          );
        }
      }

      if (triggers.length === 0) continue;
      companies++;

      const message =
        `📊 *Alerta de Orçamentos*\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `${triggers.join('\n\n')}\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🌐 _Ajuste seus limites no painel_`;
      try {
        await this.evolution.sendTextMessage(inst.instanceName, inst.phoneNumber, message);
        totalAlerts += triggers.length;
      } catch (err) {
        this.logger.error(
          `Falha ao enviar alerta de budget company=${inst.companyId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(`Budget alerts: ${totalAlerts} alertas em ${companies} empresas`);
    return { alerts: totalAlerts, companies };
  }

  private fmt(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
