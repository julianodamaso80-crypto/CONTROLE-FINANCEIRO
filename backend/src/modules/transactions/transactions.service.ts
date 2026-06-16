import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { MarkAsPaidDto } from './dto/mark-as-paid.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

// Includes padrão para retornar dados relacionados
const transactionIncludes = {
  category: { select: { id: true, name: true, color: true, icon: true, type: true } },
  client: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  segment: { select: { id: true, name: true, color: true, icon: true } },
  accountTransactions: {
    include: {
      bankAccount: { select: { id: true, name: true, type: true, bankCode: true } },
    },
  },
} as const;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankAccountsService: BankAccountsService,
  ) {}

  async findAll(companyId: string, filters: FilterTransactionsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'desc';

    const where: Prisma.TransactionWhereInput = { companyId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.segmentId) where.segmentId = filters.segmentId;
    if (filters.bankAccountId) {
      where.accountTransactions = {
        some: { accountId: filters.bankAccountId },
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    // Busca textual inteligente: ignora acentos E maiúsculas/minúsculas.
    // Como o Prisma não expõe unaccent(), filtramos via SQL os IDs que batem
    // e restringimos o where a eles. Ex.: buscar "hidraulica" acha "hidráulica".
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM transactions
        WHERE company_id = ${companyId}::uuid
          AND (
            unaccent(description) ILIKE unaccent(${term})
            OR unaccent(coalesce(notes, '')) ILIKE unaccent(${term})
          )
      `;
      where.id = { in: matches.map((m) => m.id) };
    }

    const [data, total, sums] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: transactionIncludes,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(
      sums.find((s) => s.type === 'INCOME')?._sum.amount ?? 0,
    );
    const totalExpense = Number(
      sums.find((s) => s.type === 'EXPENSE')?._sum.amount ?? 0,
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      // Totais do conjunto filtrado inteiro (não só da página) — usado pra
      // mostrar quanto foi gasto/recebido com o termo pesquisado.
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        count: total,
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, companyId },
      include: transactionIncludes,
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }

    return transaction;
  }

  async create(companyId: string, userId: string, dto: CreateTransactionDto) {
    await this.validateReferences(companyId, dto);

    let paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : undefined;
    const status = dto.status ?? 'PENDING';

    if (status === 'PAID' && !paymentDate) {
      paymentDate = new Date();
    }

    if (paymentDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (paymentDate > tomorrow) {
        throw new BadRequestException(
          'Data de pagamento não pode estar no futuro',
        );
      }
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          companyId,
          userId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          date: new Date(dto.date),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          paymentDate,
          status,
          categoryId: dto.categoryId,
          clientId: dto.clientId,
          supplierId: dto.supplierId,
          segmentId: dto.segmentId,
          tags: dto.tags ?? [],
          notes: dto.notes,
        },
      });

      if (dto.bankAccountId) {
        await tx.accountTransaction.create({
          data: {
            transactionId: created.id,
            accountId: dto.bankAccountId,
          },
        });
      }

      return created;
    });

    // Recalcula saldo da conta vinculada se a transação já está paga
    if (dto.bankAccountId && status === 'PAID') {
      await this.bankAccountsService.recalculateBalance(
        companyId,
        dto.bankAccountId,
      );
    }

    return this.findOne(companyId, transaction.id);
  }

  async update(companyId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(companyId, id);

    await this.validateReferences(companyId, dto);

    if (dto.paymentDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (new Date(dto.paymentDate) > tomorrow) {
        throw new BadRequestException(
          'Data de pagamento não pode estar no futuro',
        );
      }
    }

    // Guarda as contas antigas para recalcular depois
    const oldAccountIds = existing.accountTransactions.map(
      (at) => at.bankAccount.id,
    );

    // Se for transação de cartão e o valor mudou, ajusta o totalAmount da fatura
    const existingFull = await this.prisma.transaction.findUnique({
      where: { id },
      select: { invoiceId: true, amount: true, isRefund: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: {
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.date !== undefined && { date: new Date(dto.date) }),
          ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
          ...(dto.paymentDate !== undefined && { paymentDate: new Date(dto.paymentDate) }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.clientId !== undefined && { clientId: dto.clientId }),
          ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
          ...(dto.segmentId !== undefined && { segmentId: dto.segmentId }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      });

      // Ajusta totalAmount da fatura quando o valor mudou
      if (
        existingFull?.invoiceId &&
        dto.amount !== undefined &&
        Number(dto.amount) !== Number(existingFull.amount)
      ) {
        const sign = existingFull.isRefund ? -1 : 1;
        const oldVal = Number(existingFull.amount) * sign;
        const newVal = Number(dto.amount) * sign;
        await tx.invoice.update({
          where: { id: existingFull.invoiceId },
          data: { totalAmount: { increment: newVal - oldVal } },
        });
      }

      if (dto.bankAccountId !== undefined) {
        await tx.accountTransaction.deleteMany({
          where: { transactionId: id },
        });
        if (dto.bankAccountId) {
          await tx.accountTransaction.create({
            data: {
              transactionId: id,
              accountId: dto.bankAccountId,
            },
          });
        }
      }
    });

    // Recalcula saldo das contas afetadas (antigas e nova)
    const newAccountIds = dto.bankAccountId ? [dto.bankAccountId] : [];
    const allAccountIds = [...new Set([...oldAccountIds, ...newAccountIds])];
    for (const accountId of allAccountIds) {
      await this.bankAccountsService.recalculateBalance(companyId, accountId);
    }

    return this.findOne(companyId, existing.id);
  }

  async remove(companyId: string, id: string) {
    const transaction = await this.findOne(companyId, id);

    // Guarda as contas vinculadas antes de deletar (cascade remove os AccountTransaction)
    const accountIds = transaction.accountTransactions.map(
      (at) => at.bankAccount.id,
    );

    // Busca a transação completa pra pegar dados de parcelamento/fatura
    const full = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        installmentGroupId: true,
        invoiceId: true,
        amount: true,
        isRefund: true,
      },
    });

    // Se faz parte de um grupo de parcelas, deleta TODAS as parcelas e
    // ajusta o totalAmount de cada fatura impactada
    if (full?.installmentGroupId) {
      const siblings = await this.prisma.transaction.findMany({
        where: {
          companyId,
          installmentGroupId: full.installmentGroupId,
        },
        select: { id: true, invoiceId: true, amount: true, isRefund: true },
      });

      await this.prisma.$transaction(async (tx) => {
        // Decrementa o totalAmount de cada fatura envolvida
        const byInvoice = new Map<string, number>();
        for (const s of siblings) {
          if (!s.invoiceId) continue;
          const value = Number(s.amount) * (s.isRefund ? -1 : 1);
          byInvoice.set(s.invoiceId, (byInvoice.get(s.invoiceId) ?? 0) + value);
        }
        for (const [invoiceId, delta] of byInvoice.entries()) {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { totalAmount: { decrement: delta } },
          });
        }
        await tx.transaction.deleteMany({
          where: {
            companyId,
            installmentGroupId: full.installmentGroupId!,
          },
        });
      });
    } else if (full?.invoiceId) {
      // Lançamento avulso de cartão (sem parcelas) — ajusta a fatura também
      const delta = Number(full.amount) * (full.isRefund ? -1 : 1);
      await this.prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: full.invoiceId! },
          data: { totalAmount: { decrement: delta } },
        });
        await tx.transaction.delete({ where: { id } });
      });
    } else {
      await this.prisma.transaction.delete({ where: { id } });
    }

    // Recalcula saldo das contas que estavam vinculadas
    for (const accountId of accountIds) {
      await this.bankAccountsService.recalculateBalance(companyId, accountId);
    }

    const wasGroup = !!full?.installmentGroupId;
    return {
      message: wasGroup
        ? 'Lançamento e parcelas excluídos com sucesso'
        : 'Transação excluída com sucesso',
    };
  }

  async markAsPaid(companyId: string, id: string, dto: MarkAsPaidDto) {
    const transaction = await this.findOne(companyId, id);

    if (transaction.status === 'PAID') {
      throw new BadRequestException('Transação já está marcada como paga');
    }

    if (transaction.status === 'CANCELLED') {
      throw new BadRequestException(
        'Não é possível pagar uma transação cancelada',
      );
    }

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    // Se informou bankAccountId, valida e cria/atualiza AccountTransaction
    if (dto.bankAccountId) {
      const bankAccount = await this.prisma.bankAccount.findFirst({
        where: { id: dto.bankAccountId, companyId },
      });
      if (!bankAccount) {
        throw new BadRequestException('Conta bancária não encontrada');
      }

      // Remove vínculos antigos e cria novo
      await this.prisma.accountTransaction.deleteMany({
        where: { transactionId: id },
      });
      await this.prisma.accountTransaction.create({
        data: { transactionId: id, accountId: dto.bankAccountId },
      });
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { status: 'PAID', paymentDate },
      include: transactionIncludes,
    });

    // Recalcula saldo das contas vinculadas
    const accountTxns = await this.prisma.accountTransaction.findMany({
      where: { transactionId: id },
      select: { accountId: true },
    });
    for (const at of accountTxns) {
      await this.bankAccountsService.recalculateBalance(companyId, at.accountId);
    }

    return updated;
  }

  async cancel(companyId: string, id: string) {
    const transaction = await this.findOne(companyId, id);

    if (transaction.status === 'CANCELLED') {
      throw new BadRequestException('Transação já está cancelada');
    }

    if (transaction.status === 'PAID') {
      throw new BadRequestException(
        'Não é possível cancelar uma transação paga',
      );
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: transactionIncludes,
    });

    // Recalcula saldo das contas vinculadas (transação não é mais PAID)
    const accountTxns = await this.prisma.accountTransaction.findMany({
      where: { transactionId: id },
      select: { accountId: true },
    });
    for (const at of accountTxns) {
      await this.bankAccountsService.recalculateBalance(companyId, at.accountId);
    }

    return updated;
  }

  /** Valida que os IDs referenciados pertencem à mesma empresa */
  private async validateReferences(
    companyId: string,
    dto: Partial<
      Pick<
        CreateTransactionDto,
        'categoryId' | 'clientId' | 'supplierId' | 'segmentId' | 'bankAccountId'
      >
    >,
  ) {
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId },
      });
      if (!category) throw new BadRequestException('Categoria não encontrada');
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, companyId },
      });
      if (!client) throw new BadRequestException('Cliente não encontrado');
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId },
      });
      if (!supplier) throw new BadRequestException('Fornecedor não encontrado');
    }

    if (dto.segmentId) {
      const segment = await this.prisma.segment.findFirst({
        where: { id: dto.segmentId, companyId },
      });
      if (!segment) throw new BadRequestException('Segmento não encontrado');
    }

    if (dto.bankAccountId) {
      const account = await this.prisma.bankAccount.findFirst({
        where: { id: dto.bankAccountId, companyId },
      });
      if (!account) throw new BadRequestException('Conta bancária não encontrada');
    }
  }
}
