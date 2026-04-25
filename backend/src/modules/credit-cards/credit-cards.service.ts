import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';
import { CreateCardExpenseDto } from './dto/create-card-expense.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Cards =====

  async findAll(companyId: string, includeInactive = false) {
    const cards = await this.prisma.creditCard.findMany({
      where: {
        companyId,
        ...(!includeInactive ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    });

    // Calcula limite usado de cada cartão (faturas OPEN)
    return Promise.all(
      cards.map(async (card) => {
        const openTotal = await this.prisma.invoice.aggregate({
          where: { creditCardId: card.id, status: { in: ['OPEN', 'CLOSED'] } },
          _sum: { totalAmount: true, paidAmount: true },
        });
        const used = Number(openTotal._sum.totalAmount ?? 0) - Number(openTotal._sum.paidAmount ?? 0);
        const limit = Number(card.creditLimit);
        return {
          ...card,
          creditLimit: limit,
          usedAmount: used,
          availableLimit: Math.max(0, limit - used),
          usagePct: limit > 0 ? Math.round((used / limit) * 10000) / 100 : 0,
        };
      }),
    );
  }

  async findOne(companyId: string, id: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id, companyId },
    });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    return card;
  }

  async create(companyId: string, dto: CreateCreditCardDto) {
    if (dto.dueDay <= dto.closingDay - 25) {
      // sanity check leve — geralmente fechamento e vencimento são meses adjacentes
    }
    try {
      return await this.prisma.creditCard.create({
        data: {
          companyId,
          name: dto.name,
          brand: dto.brand ?? 'OUTRO',
          lastDigits: dto.lastDigits,
          creditLimit: dto.creditLimit ?? 0,
          closingDay: dto.closingDay,
          dueDay: dto.dueDay,
          color: dto.color ?? '#0EA5E9',
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um cartão com esse nome');
      }
      throw e;
    }
  }

  async update(companyId: string, id: string, dto: UpdateCreditCardDto) {
    await this.findOne(companyId, id);
    return this.prisma.creditCard.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    // Soft delete pra não quebrar histórico
    await this.prisma.creditCard.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Cartão desativado' };
  }

  // ===== Expenses (gera/usa Invoice automaticamente) =====

  async addExpense(companyId: string, userId: string, cardId: string, dto: CreateCardExpenseDto) {
    const card = await this.findOne(companyId, cardId);

    const totalInstallments = dto.totalInstallments && dto.totalInstallments > 1 ? dto.totalInstallments : 1;
    const installmentAmount = Math.round((dto.amount / totalInstallments) * 100) / 100;
    const groupId = totalInstallments > 1 ? this.makeUuid() : undefined;

    const created: Array<{ id: string; invoiceId: string; date: Date; amount: number }> = [];

    for (let i = 0; i < totalInstallments; i++) {
      const installmentDate = new Date(dto.date);
      installmentDate.setMonth(installmentDate.getMonth() + i);

      const invoice = await this.ensureInvoiceForDate(companyId, card.id, card.closingDay, card.dueDay, installmentDate);

      const tx = await this.prisma.transaction.create({
        data: {
          companyId,
          userId,
          type: dto.isRefund ? 'INCOME' : 'EXPENSE',
          amount: installmentAmount,
          description: totalInstallments > 1
            ? `${dto.description} (${i + 1}/${totalInstallments})`
            : dto.description,
          date: installmentDate,
          dueDate: invoice.dueDate,
          status: 'PENDING',
          categoryId: dto.categoryId,
          segmentId: dto.segmentId,
          creditCardId: card.id,
          invoiceId: invoice.id,
          isRefund: dto.isRefund ?? false,
          installmentNumber: totalInstallments > 1 ? i + 1 : null,
          totalInstallments: totalInstallments > 1 ? totalInstallments : null,
          installmentGroupId: groupId,
          tags: [],
          source: 'MANUAL',
        },
      });

      // Atualiza total da fatura (estornos subtraem)
      const delta = dto.isRefund ? -installmentAmount : installmentAmount;
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { totalAmount: { increment: delta } },
      });

      created.push({ id: tx.id, invoiceId: invoice.id, date: installmentDate, amount: installmentAmount });
    }

    return { transactions: created, totalInstallments };
  }

  // ===== Invoices =====

  async listInvoices(companyId: string, cardId: string) {
    const card = await this.findOne(companyId, cardId);
    const invoices = await this.prisma.invoice.findMany({
      where: { creditCardId: card.id },
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
    });
    return invoices.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      remainingAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
    }));
  }

  async getInvoiceDetail(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        creditCard: { select: { id: true, name: true, brand: true, color: true, lastDigits: true } },
        transactions: {
          orderBy: { date: 'asc' },
          include: {
            category: { select: { id: true, name: true, color: true, icon: true } },
            segment: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    return {
      ...invoice,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      remainingAmount: Number(invoice.totalAmount) - Number(invoice.paidAmount),
      transactions: invoice.transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    };
  }

  async payInvoice(companyId: string, invoiceId: string, paidAmount?: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');

    const totalAmount = Number(invoice.totalAmount);
    const newPaidAmount = paidAmount ?? totalAmount;
    if (newPaidAmount < 0) throw new BadRequestException('Valor inválido');

    const fullyPaid = newPaidAmount >= totalAmount;

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: fullyPaid ? 'PAID' : invoice.status,
        paidAt: fullyPaid ? new Date() : invoice.paidAt,
      },
    });

    if (fullyPaid) {
      await this.prisma.transaction.updateMany({
        where: { invoiceId },
        data: { status: 'PAID', paymentDate: new Date() },
      });
    }

    return updated;
  }

  // ===== Helpers =====

  /**
   * Encontra (ou cria) a fatura correspondente à data da despesa, considerando dia de fechamento.
   * Se a data da despesa <= dia de fechamento do mês, vai pra fatura desse mês de referência.
   * Se for depois, vai pra fatura do mês seguinte.
   */
  private async ensureInvoiceForDate(
    companyId: string,
    cardId: string,
    closingDay: number,
    dueDay: number,
    date: Date,
  ) {
    let referenceYear = date.getFullYear();
    let referenceMonth = date.getMonth() + 1; // 1..12
    if (date.getDate() > closingDay) {
      referenceMonth += 1;
      if (referenceMonth > 12) {
        referenceMonth = 1;
        referenceYear += 1;
      }
    }

    const existing = await this.prisma.invoice.findUnique({
      where: {
        creditCardId_referenceYear_referenceMonth: {
          creditCardId: cardId,
          referenceYear,
          referenceMonth,
        },
      },
    });
    if (existing) return existing;

    const closingDate = new Date(referenceYear, referenceMonth - 1, Math.min(closingDay, this.lastDayOfMonth(referenceYear, referenceMonth)));
    let dueY = referenceYear;
    let dueM = referenceMonth;
    if (dueDay < closingDay) {
      dueM += 1;
      if (dueM > 12) {
        dueM = 1;
        dueY += 1;
      }
    }
    const dueDate = new Date(dueY, dueM - 1, Math.min(dueDay, this.lastDayOfMonth(dueY, dueM)));

    return this.prisma.invoice.create({
      data: {
        companyId,
        creditCardId: cardId,
        referenceMonth,
        referenceYear,
        closingDate,
        dueDate,
        totalAmount: 0,
        paidAmount: 0,
        status: 'OPEN',
      },
    });
  }

  private lastDayOfMonth(year: number, month1to12: number): number {
    return new Date(year, month1to12, 0).getDate();
  }

  private makeUuid(): string {
    // UUID v4 simples sem dependência extra
    const c = (n: number) => n.toString(16).padStart(2, '0');
    const bytes = new Array(16).fill(0).map(() => Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = bytes.map(c).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
