import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Verifica se o email já está em uso
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Cria empresa e usuário admin na mesma transação
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
          phone: dto.phone,
          role: 'ADMIN',
          isActive: true,
        },
      });

      return { company, user };
    });

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
    // Busca usuário pelo email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
