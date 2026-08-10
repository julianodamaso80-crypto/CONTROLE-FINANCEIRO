import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
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

// Dono + 1 membro. A conta é compartilhada por duas pessoas que dividem as
// mesmas despesas (casal, pai e filha), não uma equipe.
const MAX_ACTIVE_USERS = 2;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnerId(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true },
    });
    return company?.ownerId ?? null;
  }

  async findAll(companyId: string) {
    const [users, ownerId] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId },
        select: userSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.getOwnerId(companyId),
    ]);

    return users.map((u) => ({ ...u, isOwner: u.id === ownerId }));
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
    const normalizedPhone = normalizePhone(dto.phone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
      );
    }

    const activeCount = await this.prisma.user.count({
      where: { companyId, isActive: true },
    });
    if (activeCount >= MAX_ACTIVE_USERS) {
      throw new BadRequestException(
        'Sua conta já tem 1 membro. Remova o membro atual para convidar outra pessoa.',
      );
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        'Este email já tem conta no Controlei. Use outro email para o membro.',
      );
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      throw new ConflictException(
        'Este WhatsApp já tem conta no Controlei. Use o número pessoal da pessoa que você quer convidar.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Role sempre USER: ADMIN é admin da plataforma inteira, e quem convida não
    // pode conceder isso. Senha é provisória — o membro troca no 1º login.
    return this.prisma.user.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: normalizedPhone,
        role: 'USER',
        mustChangePassword: true,
      },
      select: userSelect,
    });
  }

  /** Edição dos próprios dados — vale para o dono e para o membro convidado. */
  async updateSelf(companyId: string, userId: string, dto: UpdateSelfDto) {
    await this.findOne(companyId, userId);

    let normalizedPhone: string | undefined;
    if (dto.phone !== undefined) {
      const normalized = normalizePhone(dto.phone);
      if (!normalized) {
        throw new BadRequestException(
          'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
        );
      }
      const taken = await this.prisma.user.findFirst({
        where: { phone: normalized, id: { not: userId } },
      });
      if (taken) {
        throw new ConflictException('Este WhatsApp já está cadastrado');
      }
      normalizedPhone = normalized;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(normalizedPhone && { phone: normalizedPhone }),
      },
      select: userSelect,
    });
  }

  async update(companyId: string, id: string, dto: UpdateUserDto) {
    // Garante que o usuário pertence à empresa
    await this.findOne(companyId, id);

    // Nunca deixa a role ser alterada por aqui: ADMIN abre o painel da
    // plataforma inteira e só é concedida internamente.
    if ('role' in dto) {
      delete (dto as { role?: unknown }).role;
    }

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { companyId, email: dto.email, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          'Este email já está cadastrado nesta empresa',
        );
      }
    }

    let normalizedPhone: string | undefined;
    if (dto.phone !== undefined) {
      const normalized = normalizePhone(dto.phone);
      if (!normalized) {
        throw new BadRequestException(
          'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
        );
      }
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: normalized, id: { not: id } },
      });
      if (existingPhone) {
        throw new ConflictException('Este WhatsApp já está cadastrado');
      }
      normalizedPhone = normalized;
    }

    return this.prisma.user.update({
      where: { id },
      data: { ...dto, ...(normalizedPhone && { phone: normalizedPhone }) },
      select: userSelect,
    });
  }

  async remove(companyId: string, id: string) {
    // Soft delete: desativa o usuário
    await this.findOne(companyId, id);

    const ownerId = await this.getOwnerId(companyId);
    if (ownerId === id) {
      throw new BadRequestException(
        'O dono da conta não pode ser removido. Para encerrar, cancele o plano em Configurações.',
      );
    }

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
