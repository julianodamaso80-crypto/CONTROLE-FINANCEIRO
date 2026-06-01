import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfigService } from '../../common/config/app.config';
import { EvolutionService } from '../evolution/evolution.service';
import { WhatsAppCloudService } from '../whatsapp-cloud/whatsapp-cloud.service';

/** Antecedências (em dias) em que avisamos o cliente do vencimento. */
const OFFSETS: Array<{ days: number; label: string }> = [
  { days: 3, label: 'em 3 dias' },
  { days: 1, label: 'amanhã' },
];

interface PendingBill {
  id: string;
  description: string;
  amount: unknown;
}

@Injectable()
export class BillRemindersService {
  private readonly logger = new Logger(BillRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly evolution: EvolutionService,
    private readonly cloud: WhatsAppCloudService,
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

    let totalSent = 0;
    const companiesHit = new Set<string>();

    // Dispara em D-3 e D-1: pra cada antecedência, varre vencimentos naquele dia.
    for (const offset of OFFSETS) {
      const target = new Date(Date.UTC(y, m - 1, d + offset.days));
      const ty = target.getUTCFullYear();
      const tm = target.getUTCMonth();
      const td = target.getUTCDate();
      const dayStart = new Date(Date.UTC(ty, tm, td, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(ty, tm, td, 23, 59, 59, 999));
      const dueDateBR = `${String(td).padStart(2, '0')}/${String(tm + 1).padStart(2, '0')}/${ty}`;

      const pending = await this.prisma.transaction.findMany({
        where: {
          status: 'PENDING',
          dueDate: { gte: dayStart, lte: dayEnd },
        },
        select: {
          id: true,
          description: true,
          amount: true,
          companyId: true,
        },
        orderBy: { amount: 'desc' },
      });

      // Agrupa por empresa.
      const byCompany = new Map<string, PendingBill[]>();
      for (const t of pending) {
        const list = byCompany.get(t.companyId) ?? [];
        list.push(t);
        byCompany.set(t.companyId, list);
      }

      for (const [companyId, bills] of byCompany) {
        const sent = await this.sendForCompany(
          companyId,
          bills,
          offset.label,
          dueDateBR,
        );
        if (sent > 0) {
          totalSent += sent;
          companiesHit.add(companyId);
        }
      }
    }

    this.logger.log(
      `Reminders do dia ${ymd}: ${totalSent} boletos em ${companiesHit.size} empresas`,
    );
    return { sent: totalSent, companies: companiesHit.size };
  }

  /**
   * Envia o lembrete de uma empresa pelo transporte dela:
   * CLOUD → template `lembrete_vencimento` pro telefone do dono;
   * EVOLUTION → texto rico pela instância conectada da empresa.
   * Retorna quantos boletos foram cobertos (0 se não enviou).
   */
  private async sendForCompany(
    companyId: string,
    bills: PendingBill[],
    prazoLabel: string,
    dueDateBR: string,
  ): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { whatsappTransport: true },
    });
    if (!company) return 0;

    const total = bills.reduce((acc, t) => acc + Number(t.amount), 0);
    const totalFmt = this.brl(total);

    if (company.whatsappTransport === 'CLOUD') {
      if (!this.appConfig.isWhatsAppCloudConfigured()) return 0;

      const owner = await this.prisma.user.findFirst({
        where: { companyId, isActive: true },
        orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
        select: { name: true, phone: true },
      });
      if (!owner?.phone) return 0;

      const firstName = owner.name.split(' ')[0] ?? owner.name;
      const resumo =
        bills.length === 1
          ? `${bills[0]!.description} (${this.brl(Number(bills[0]!.amount))})`
          : `${bills.length} boletos (${totalFmt})`;

      try {
        await this.cloud.sendTemplate(owner.phone, 'lembrete_vencimento', 'pt_BR', [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: firstName },
              { type: 'text', text: resumo },
              { type: 'text', text: prazoLabel },
            ],
          },
        ]);
        this.logger.log(
          `Reminder (cloud) enviado: company=${companyId} boletos=${bills.length} prazo=${prazoLabel}`,
        );
        return bills.length;
      } catch (err) {
        this.logger.error(
          `Falha reminder cloud company=${companyId}: ${err instanceof Error ? err.message : String(err)}`,
        );
        return 0;
      }
    }

    // EVOLUTION: precisa de instância conectada com número.
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { companyId, status: 'CONNECTED', phoneNumber: { not: null } },
      select: { instanceName: true, phoneNumber: true },
    });
    if (!instance?.phoneNumber) return 0;

    const message = this.buildEvolutionMessage(bills, prazoLabel, dueDateBR, totalFmt);
    try {
      await this.evolution.sendTextMessage(
        instance.instanceName,
        instance.phoneNumber,
        message,
      );
      this.logger.log(
        `Reminder enviado: company=${companyId} boletos=${bills.length} prazo=${prazoLabel}`,
      );
      return bills.length;
    } catch (err) {
      this.logger.error(
        `Falha ao enviar reminder para company=${companyId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 0;
    }
  }

  private buildEvolutionMessage(
    bills: PendingBill[],
    prazoLabel: string,
    dueDateBR: string,
    totalFmt: string,
  ): string {
    if (bills.length === 1) {
      const t = bills[0]!;
      let message = `🔔 *Lembrete de Boleto*\n`;
      message += `━━━━━━━━━━━━━━━\n\n`;
      message += `📅 *Vence ${prazoLabel}* (${dueDateBR})\n\n`;
      message += `📝 ${t.description}\n`;
      message += `💵 *${this.brl(Number(t.amount))}*\n\n`;
      message += `💸 _Não esqueça de pagar!_`;
      return message;
    }

    let message = `🔔 *Lembrete de Boletos*\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `📅 *${bills.length} boletos vencem ${prazoLabel}* (${dueDateBR})\n\n`;
    for (const t of bills) {
      message += `▫️ ${t.description}\n   💵 *${this.brl(Number(t.amount))}*\n`;
    }
    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `💰 *Total:* ${totalFmt}\n\n`;
    message += `💸 _Não esqueça de pagar!_`;
    return message;
  }

  private brl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
