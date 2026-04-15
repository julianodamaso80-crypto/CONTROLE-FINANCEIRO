import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly whatsapp: WhatsAppService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedPhone = normalizePhone(dto.phone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
      );
    }

    const existingCompany = await this.prisma.company.findUnique({
      where: { email: dto.email },
    });
    if (existingCompany) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      throw new ConflictException('Este WhatsApp já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          document: dto.companyDocument,
          email: dto.email,
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: dto.name,
          email: dto.email,
          passwordHash,
          phone: normalizedPhone,
          role: 'ADMIN',
          isActive: true,
        },
      });

      return { company, user };
    });

    // Cria subscription com trial de 1 dia (cria customer + subscription no Asaas)
    await this.subscriptions
      .createInitialSubscription({
        companyId: result.company.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: normalizedPhone,
      })
      .catch((err) =>
        this.logger.error(
          `Falha ao criar subscription: ${err instanceof Error ? err.message : 'erro'}`,
        ),
      );

    this.whatsapp
      .sendWelcomeMessage(normalizedPhone, result.user.name)
      .catch((err) =>
        this.logger.warn(
          `Falha ao enviar boas-vindas para ${normalizedPhone}: ${
            err instanceof Error ? err.message : 'erro desconhecido'
          }`,
        ),
      );

    const accessToken = this.generateToken({
      sub: result.user.id,
      companyId: result.company.id,
      role: result.user.role,
      email: result.user.email,
    });

    return {
      accessToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.company.id,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
      },
    };
  }

  async login(dto: LoginDto) {
    // Com email único por empresa (multi-tenant), usa findFirst.
    // Pega o primeiro usuário ativo com esse email — se uma pessoa tiver
    // conta em múltiplas empresas, precisaremos de um seletor de empresa
    // em etapa futura
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Usuário desativado, entre em contato com o administrador',
      );
    }

    const accessToken = this.generateToken({
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
      },
    };
  }

  /**
   * Gera um código de 6 dígitos e envia via WhatsApp para o número informado.
   * Por segurança, sempre retorna sucesso (não revela se o número existe).
   */
  async requestPasswordReset(dto: ForgotPasswordDto) {
    const normalizedPhone = normalizePhone(dto.phone);
    if (!normalizedPhone) {
      throw new BadRequestException(
        'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (user && user.isActive) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Invalida códigos anteriores não usados
      await this.prisma.passwordResetCode.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await this.prisma.passwordResetCode.create({
        data: { userId: user.id, code, expiresAt },
      });

      this.whatsapp.sendPasswordResetCode(normalizedPhone, code).catch((err) =>
        this.logger.warn(
          `Falha ao enviar código de reset: ${err instanceof Error ? err.message : 'erro'}`,
        ),
      );
    }

    return {
      message:
        'Se este WhatsApp estiver cadastrado, você receberá um código em instantes.',
    };
  }

  /**
   * Valida código + atualiza senha. Marca o código como usado.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const normalizedPhone = normalizePhone(dto.phone);
    if (!normalizedPhone) {
      throw new BadRequestException('WhatsApp inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const resetCode = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        code: dto.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetCode) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Senha alterada com sucesso. Faça login com a nova senha.' };
  }

  private generateToken(payload: {
    sub: string;
    companyId: string;
    role: string;
    email: string;
  }): string {
    return this.jwtService.sign(payload);
  }
}
