import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.category.findMany({
      where: { companyId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, type: true, color: true, icon: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, type: true, color: true, icon: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async create(companyId: string, dto: CreateCategoryDto) {
    // Valida categoria pai, se informada
    if (dto.parentCategoryId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentCategoryId, companyId },
      });

      if (!parent) {
        throw new BadRequestException('Categoria pai não encontrada');
      }
    }

    return this.prisma.category.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        color: dto.color,
        icon: dto.icon,
        parentCategoryId: dto.parentCategoryId,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(companyId, id);

    if (dto.parentCategoryId) {
      // Não pode ser pai de si mesma
      if (dto.parentCategoryId === id) {
        throw new BadRequestException(
          'Uma categoria não pode ser pai de si mesma',
        );
      }

      // Verifica se a categoria pai pertence à mesma empresa
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentCategoryId, companyId },
      });

      if (!parent) {
        throw new BadRequestException('Categoria pai não encontrada');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    // Verifica se possui subcategorias
    const childrenCount = await this.prisma.category.count({
      where: { parentCategoryId: id, companyId },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma categoria que possui subcategorias',
      );
    }

    // Verifica se há transações vinculadas
    const transactionsCount = await this.prisma.transaction.count({
      where: { categoryId: id, companyId },
    });

    if (transactionsCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma categoria com transações vinculadas',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
