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

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: transactionIncludes,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    await this.prisma.transaction.delete({ where: { id } });

    // Recalcula saldo das contas que estavam vinculadas
    for (const accountId of accountIds) {
      await this.bankAccountsService.recalculateBalance(companyId, accountId);
    }

    return { message: 'Transação excluída com sucesso' };
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
