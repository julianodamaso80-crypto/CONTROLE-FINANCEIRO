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

  /** Busca segmento por nome — case-insensitive + tolerante a espaços extras */
  async findByName(companyId: string, name: string) {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const target = norm(name);
    const all = await this.prisma.segment.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, color: true, description: true, companyId: true, isActive: true, createdAt: true, updatedAt: true },
    });
    return all.find((s) => norm(s.name) === target) ?? null;
  }
}
