import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    companyId: string,
    search?: string,
    includeInactive?: boolean,
  ) {
    const where: Prisma.SupplierWhereInput = { companyId };

    // Por padrão mostra apenas ativos
    if (!includeInactive) {
      where.isActive = true;
    }

    // Filtro de busca por nome ou documento
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    return supplier;
  }

  async create(companyId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateSupplierDto) {
    await this.findOne(companyId, id);

    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
