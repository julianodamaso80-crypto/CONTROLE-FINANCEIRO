import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Campos retornados nas queries — nunca expõe passwordHash
const userSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: userSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async create(companyId: string, dto: CreateUserDto) {
    // Verifica se o email já está em uso DENTRO dessa empresa
    const existing = await this.prisma.user.findFirst({
      where: { companyId, email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        'Este email já está cadastrado nesta empresa',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        role: dto.role,
      },
      select: userSelect,
    });
  }

  async update(companyId: string, id: string, dto: UpdateUserDto) {
    // Garante que o usuário pertence à empresa
    await this.findOne(companyId, id);

    if (dto.email) {
      // Verifica duplicidade do email dentro da mesma empresa
      const existing = await this.prisma.user.findFirst({
        where: { companyId, email: dto.email, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          'Este email já está cadastrado nesta empresa',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: userSelect,
    });
  }

  async remove(companyId: string, id: string) {
    // Soft delete: desativa o usuário
    await this.findOne(companyId, id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: userSelect,
    });
  }

  async changePassword(
    companyId: string,
    userId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
