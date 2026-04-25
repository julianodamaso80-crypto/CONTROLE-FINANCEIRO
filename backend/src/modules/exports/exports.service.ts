import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTransactionsCsv(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      include: {
        category: { select: { name: true } },
        client: { select: { name: true } },
        supplier: { select: { name: true } },
        segment: { select: { name: true } },
        creditCard: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const headers = [
      'Data',
      'Tipo',
      'Descrição',
      'Valor',
      'Status',
      'Categoria',
      'Segmento',
      'Cliente',
      'Fornecedor',
      'Cartão',
      'Vencimento',
      'Pagamento',
      'Parcela',
      'Estorno',
      'Origem',
      'Observações',
    ];

    const rows = transactions.map((t) => [
      this.fmtDate(t.date),
      t.type === 'INCOME' ? 'Receita' : 'Despesa',
      this.csvEscape(t.description),
      Number(t.amount).toFixed(2).replace('.', ','),
      this.statusLabel(t.status),
      this.csvEscape(t.category?.name ?? ''),
      this.csvEscape(t.segment?.name ?? ''),
      this.csvEscape(t.client?.name ?? ''),
      this.csvEscape(t.supplier?.name ?? ''),
      this.csvEscape(t.creditCard?.name ?? ''),
      t.dueDate ? this.fmtDate(t.dueDate) : '',
      t.paymentDate ? this.fmtDate(t.paymentDate) : '',
      t.totalInstallments
        ? `${t.installmentNumber}/${t.totalInstallments}`
        : '',
      t.isRefund ? 'Sim' : 'Não',
      t.source,
      this.csvEscape(t.notes ?? ''),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.join(';'))
      .join('\r\n');

    // BOM pra Excel reconhecer UTF-8
    return '﻿' + csv;
  }

  private csvEscape(s: string): string {
    if (!s) return '';
    if (/[";\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private fmtDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().slice(0, 10).split('-').reverse().join('/');
  }

  private statusLabel(s: string): string {
    const map: Record<string, string> = {
      PAID: 'Pago',
      PENDING: 'Pendente',
      OVERDUE: 'Vencido',
      CANCELLED: 'Cancelado',
    };
    return map[s] ?? s;
  }
}
