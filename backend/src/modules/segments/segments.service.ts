import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, includeInactive?: boolean) {
    return this.prisma.segment.findMany({
      where: {
        companyId,
        ...(!includeInactive ? { isActive: true } : {}),
      },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const segment = await this.prisma.segment.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!segment) {
      throw new NotFoundException('Segmento não encontrado');
    }

    return segment;
  }

  async create(companyId: string, dto: CreateSegmentDto) {
    return this.prisma.segment.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        color: dto.color ?? '#8DFF6B',
        icon: dto.icon ?? 'tag',
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateSegmentDto) {
    await this.findOne(companyId, id);

    return this.prisma.segment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    // Soft delete para não quebrar transações antigas
    await this.findOne(companyId, id);

    await this.prisma.segment.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Segmento desativado com sucesso' };
  }

  /** Busca segmento por nome (case-insensitive) — usado pelo módulo WhatsApp no futuro */
  async findByName(companyId: string, name: string) {
    return this.prisma.segment.findFirst({
      where: {
        companyId,
        name: { equals: name, mode: 'insensitive' },
        isActive: true,
      },
    });
  }
}
