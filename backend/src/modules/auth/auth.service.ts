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
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly whatsapp: WhatsAppService,
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

  private generateToken(payload: {
    sub: string;
    companyId: string;
    role: string;
    email: string;
  }): string {
    return this.jwtService.sign(payload);
  }
}
