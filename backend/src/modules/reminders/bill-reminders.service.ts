import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class BillRemindersService {
  private readonly logger = new Logger(BillRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'America/Sao_Paulo' })
  async sendDailyReminders(): Promise<void> {
    await this.runForDate(this.todaySaoPaulo());
  }

  async runForDate(ymd: string): Promise<{ sent: number; companies: number }> {
    const [y, m, d] = ymd.split('-').map((n) => Number(n));
    if (!y || !m || !d) {
      this.logger.warn(`runForDate recebeu data inválida: ${ymd}`);
      return { sent: 0, companies: 0 };
    }

    const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

    const instances = await this.prisma.whatsAppInstance.findMany({
      where: {
        status: 'CONNECTED',
        phoneNumber: { not: null },
      },
      select: {
        companyId: true,
        instanceName: true,
        phoneNumber: true,
      },
    });

    let totalSent = 0;
    let companiesHit = 0;

    for (const inst of instances) {
      if (!inst.phoneNumber) continue;

      const pending = await this.prisma.transaction.findMany({
        where: {
          companyId: inst.companyId,
          status: 'PENDING',
          dueDate: { gte: dayStart, lte: dayEnd },
        },
        select: {
          id: true,
          description: true,
          amount: true,
          type: true,
        },
        orderBy: { amount: 'desc' },
      });

      if (pending.length === 0) continue;
      companiesHit += 1;

      const dueDateBR = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      const total = pending.reduce((acc, t) => acc + Number(t.amount), 0);
      const totalFmt = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

      let message: string;
      if (pending.length === 1) {
        const t = pending[0]!;
        const valor = Number(t.amount).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        message = `🔔 *Lembrete de Boleto*\n\n`;
        message += `Você tem um boleto que vence *hoje* (${dueDateBR}):\n\n`;
        message += `• ${t.description}\n`;
        message += `• Valor: *${valor}*\n\n`;
        message += `Não esqueça de pagar! 💸`;
      } else {
        message = `🔔 *Lembrete de Boletos*\n\n`;
        message += `Você tem *${pending.length} boletos* vencendo *hoje* (${dueDateBR}):\n\n`;
        for (const t of pending) {
          const valor = Number(t.amount).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });
          message += `• ${t.description} — *${valor}*\n`;
        }
        message += `\nTotal: *${totalFmt}*\n\n`;
        message += `Não esqueça de pagar! 💸`;
      }

      try {
        await this.evolution.sendTextMessage(
          inst.instanceName,
          inst.phoneNumber,
          message,
        );
        totalSent += pending.length;
        this.logger.log(
          `Reminder enviado: company=${inst.companyId} boletos=${pending.length}`,
        );
      } catch (err) {
        this.logger.error(
          `Falha ao enviar reminder para company=${inst.companyId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `Reminders do dia ${ymd}: ${totalSent} boletos em ${companiesHit} empresas`,
    );
    return { sent: totalSent, companies: companiesHit };
  }

  private todaySaoPaulo(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
