import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { parseOfx, OfxStatement } from './ofx-parser';

export interface OfxPreviewItem {
  index: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: Date;
  description: string;
  fitId: string;
  duplicate: boolean;
}

export interface OfxPreviewResult {
  bankId?: string;
  accountId?: string;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
  balance?: number;
  totalCount: number;
  duplicateCount: number;
  items: OfxPreviewItem[];
}

export interface OfxImportItemInput {
  index: number;
  bankAccountId?: string;
  categoryId?: string;
  segmentId?: string;
}

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async previewOfx(companyId: string, fileBuffer: Buffer): Promise<OfxPreviewResult> {
    const content = fileBuffer.toString('utf-8');
    const parsed = parseOfx(content);
    if (parsed.transactions.length === 0) {
      throw new BadRequestException('Nenhuma transação encontrada no OFX');
    }

    // Detecta duplicatas: tx existente com mesma data + mesmo amount + descrição parecida
    const items: OfxPreviewItem[] = [];
    for (let i = 0; i < parsed.transactions.length; i++) {
      const t = parsed.transactions[i]!;
      const existing = await this.prisma.transaction.findFirst({
        where: {
          companyId,
          amount: t.amount,
          type: t.type,
          date: { gte: this.startOfDay(t.date), lte: this.endOfDay(t.date) },
        },
        select: { id: true },
      });
      items.push({
        index: i,
        type: t.type,
        amount: t.amount,
        date: t.date,
        description: t.description,
        fitId: t.fitId,
        duplicate: !!existing,
      });
    }

    return {
      bankId: parsed.bankId,
      accountId: parsed.accountId,
      currency: parsed.currency,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      balance: parsed.balance,
      totalCount: items.length,
      duplicateCount: items.filter((i) => i.duplicate).length,
      items,
    };
  }

  async importOfx(
    companyId: string,
    userId: string,
    fileBuffer: Buffer,
    selections: OfxImportItemInput[],
  ): Promise<{ imported: number; skipped: number }> {
    const content = fileBuffer.toString('utf-8');
    const parsed = parseOfx(content);

    const byIndex = new Map(selections.map((s) => [s.index, s]));
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < parsed.transactions.length; i++) {
      const sel = byIndex.get(i);
      if (!sel) {
        skipped++;
        continue;
      }
      const t = parsed.transactions[i]!;

      // Pula duplicata
      const existing = await this.prisma.transaction.findFirst({
        where: {
          companyId,
          amount: t.amount,
          type: t.type,
          date: { gte: this.startOfDay(t.date), lte: this.endOfDay(t.date) },
        },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Valida bank account
      if (sel.bankAccountId) {
        const acc = await this.prisma.bankAccount.findFirst({
          where: { id: sel.bankAccountId, companyId },
        });
        if (!acc) throw new NotFoundException('Conta bancária inválida');
      }

      const tx = await this.prisma.transaction.create({
        data: {
          companyId,
          userId,
          type: t.type,
          amount: t.amount,
          description: t.description,
          date: t.date,
          paymentDate: t.date,
          status: 'PAID',
          categoryId: sel.categoryId,
          segmentId: sel.segmentId,
          tags: [`ofx:${t.fitId}`],
          source: 'IMPORT',
        },
      });

      if (sel.bankAccountId) {
        await this.prisma.accountTransaction.create({
          data: { transactionId: tx.id, accountId: sel.bankAccountId },
        });
      }
      imported++;
    }

    return { imported, skipped };
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }
}
