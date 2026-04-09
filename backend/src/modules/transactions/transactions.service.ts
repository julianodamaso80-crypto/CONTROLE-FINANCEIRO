import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
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
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filters: FilterTransactionsDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'desc';

    // Monta o where com companyId obrigatório
    const where: Prisma.TransactionWhereInput = { companyId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.segmentId) {
      where.segmentId = filters.segmentId;
    }
    if (filters.bankAccountId) {
      where.accountTransactions = {
        some: { accountId: filters.bankAccountId },
      };
    }

    // Filtro por intervalo de datas
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }

    // Busca textual em descrição e notas
    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Executa query de dados e contagem em paralelo
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
    // Valida referências opcionais
    await this.validateReferences(companyId, dto);

    // Se status PAID e paymentDate não informado, seta data atual
    let paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : undefined;
    const status = dto.status ?? 'PENDING';

    if (status === 'PAID' && !paymentDate) {
      paymentDate = new Date();
    }

    // Valida que paymentDate não está no futuro (tolerância de 1 dia)
    if (paymentDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (paymentDate > tomorrow) {
        throw new BadRequestException(
          'Data de pagamento não pode estar no futuro',
        );
      }
    }

    // Cria transação e AccountTransaction (se bankAccountId informado) na mesma transação
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

      // Vincula à conta bancária se informada
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

    // Retorna com todos os includes
    return this.findOne(companyId, transaction.id);
  }

  async update(companyId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(companyId, id);

    // Valida referências opcionais (só as que foram informadas)
    await this.validateReferences(companyId, dto);

    // Valida paymentDate se informado
    if (dto.paymentDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (new Date(dto.paymentDate) > tomorrow) {
        throw new BadRequestException(
          'Data de pagamento não pode estar no futuro',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Atualiza a transaction
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

      // Se mudou bankAccountId, remove o antigo e cria o novo
      if (dto.bankAccountId !== undefined) {
        // Remove vinculação anterior
        await tx.accountTransaction.deleteMany({
          where: { transactionId: id },
        });

        // Cria nova vinculação se informado (pode ser null pra desvincular)
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

    return this.findOne(companyId, existing.id);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    // AccountTransactions são removidos por cascade (onDelete: Cascade no schema)
    await this.prisma.transaction.delete({ where: { id } });

    return { message: 'Transação excluída com sucesso' };
  }

  async markAsPaid(companyId: string, id: string, paymentDate?: string) {
    const transaction = await this.findOne(companyId, id);

    if (transaction.status === 'PAID') {
      throw new BadRequestException('Transação já está marcada como paga');
    }

    if (transaction.status === 'CANCELLED') {
      throw new BadRequestException(
        'Não é possível pagar uma transação cancelada',
      );
    }

    const resolvedDate = paymentDate ? new Date(paymentDate) : new Date();

    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentDate: resolvedDate,
      },
      include: transactionIncludes,
    });
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

    return this.prisma.transaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: transactionIncludes,
    });
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
      if (!category) {
        throw new BadRequestException('Categoria não encontrada');
      }
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, companyId },
      });
      if (!client) {
        throw new BadRequestException('Cliente não encontrado');
      }
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId },
      });
      if (!supplier) {
        throw new BadRequestException('Fornecedor não encontrado');
      }
    }

    if (dto.segmentId) {
      const segment = await this.prisma.segment.findFirst({
        where: { id: dto.segmentId, companyId },
      });
      if (!segment) {
        throw new BadRequestException('Segmento não encontrado');
      }
    }

    if (dto.bankAccountId) {
      const account = await this.prisma.bankAccount.findFirst({
        where: { id: dto.bankAccountId, companyId },
      });
      if (!account) {
        throw new BadRequestException('Conta bancária não encontrada');
      }
    }
  }
}
