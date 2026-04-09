import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.bankAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada');
    }

    return account;
  }

  async create(companyId: string, dto: CreateBankAccountDto) {
    // Verifica limite de contas ativas por empresa
    const activeCount = await this.prisma.bankAccount.count({
      where: { companyId, isActive: true },
    });

    if (activeCount >= 20) {
      throw new BadRequestException(
        'Limite de 20 contas bancárias por empresa atingido',
      );
    }

    const initialBalance = dto.initialBalance ?? 0;

    return this.prisma.bankAccount.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        bankCode: dto.bankCode,
        initialBalance,
        currentBalance: initialBalance,
        currency: dto.currency ?? 'BRL',
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateBankAccountDto) {
    await this.findOne(companyId, id);

    return this.prisma.bankAccount.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    // Verifica se há transações vinculadas
    const transactionsCount = await this.prisma.accountTransaction.count({
      where: { accountId: id },
    });

    if (transactionsCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma conta com transações vinculadas. Desative-a em vez disso.',
      );
    }

    return this.prisma.bankAccount.delete({
      where: { id },
    });
  }
}
