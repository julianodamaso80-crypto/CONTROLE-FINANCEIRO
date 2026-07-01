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
import { seedDefaultCategories } from '../categories/categories-seed';
import { InfluencersService } from '../influencers/influencers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrackingService } from '../tracking/tracking.service';
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
    private readonly tracking: TrackingService,
    private readonly influencers: InfluencersService,
  ) {}

  async register(
    dto: RegisterDto,
    requestContext?: { ip?: string; userAgent?: string },
  ) {
    const inputPhone = normalizePhone(dto.phone);
    if (!inputPhone) {
      throw new BadRequestException(
        'WhatsApp inválido. Use DDD + número, ex: 21 98021-4882',
      );
    }

    // Valida que o número TEM WhatsApp ativo. Se o WhatsApp corrigir o "9
    // extra" (a mais ou a menos), usa o JID real retornado.
    const verification = await this.whatsapp.verifyPhoneHasWhatsApp(inputPhone);
    if (!verification.ok) {
      throw new BadRequestException(
        'WhatsApp não encontrado nesse número. Confira se digitou certo (DDD + 9 + número do celular).',
      );
    }
    const normalizedPhone = verification.correctedPhone ?? inputPhone;

    // Checa duplicidade por email (no user, não na company)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingUser) {
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
      // Company criada automaticamente com nome do user (sem campo de empresa no signup)
      const company = await tx.company.create({
        data: {
          name: dto.name,
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
          role: 'USER',
          isActive: true,
        },
      });

      return { company, user };
    });

    // Atribuição de indicação (link ?ref do influencer) — silenciosa se inválida
    if (dto.ref) {
      await this.influencers
        .attachReferralByCode(result.company.id, dto.ref)
        .catch((err) =>
          this.logger.warn(
            `Falha ao vincular indicação (ref=${dto.ref}): ${err instanceof Error ? err.message : 'erro'}`,
          ),
        );
    }

    // Seed de categorias padrão pra empresa nova
    seedDefaultCategories(this.prisma as never, result.company.id).catch(
      (err) =>
        this.logger.warn(
          `Falha ao criar categorias padrão: ${err instanceof Error ? err.message : 'erro'}`,
        ),
    );

    // Cria subscription com trial de 3 dias (cria customer + subscription no Asaas)
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

    // === TRACKING: atribuição + lead_signup + trial_started ===
    // Persiste a atribuição do lead (first-touch) e dispara eventos pra ads.
    // Tudo fire-and-forget — não bloqueia o response do signup.
    void this.fireRegistrationTracking(
      result.company.id,
      result.user.id,
      result.user.email,
      normalizedPhone,
      dto.tracking,
      requestContext,
    );

    this.whatsapp
      .sendWelcomeMessage(normalizedPhone, result.user.name, result.company.id)
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
        isInfluencer: false,
        mustChangePassword: false,
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
      include: {
        company: true,
        influencer: { select: { isActive: true } },
      },
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
        isInfluencer: !!user.influencer?.isActive,
        mustChangePassword: user.mustChangePassword,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
      },
    };
  }

  /**
   * Troca de senha do usuário autenticado. Usado no fluxo de senha provisória
   * (1º login obrigatório) e também numa troca voluntária. Limpa o flag
   * mustChangePassword no banco.
   */
  async changePassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('A nova senha deve ter no mínimo 6 caracteres');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { message: 'Senha alterada com sucesso' };
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

  /**
   * Dispara tracking pós-signup:
   *  1. Persiste atribuição (UTMs + click IDs) na tabela utm_attribution
   *  2. Envia `lead_signup` ao Meta CAPI (com email/phone hashed)
   *  3. Envia `trial_started` ao Meta CAPI
   *
   * Tudo fire-and-forget — falhas só logam, nunca quebram signup.
   */
  private async fireRegistrationTracking(
    companyId: string,
    userId: string,
    email: string,
    phone: string,
    trackingData: RegisterDto['tracking'],
    requestContext?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    try {
      // 1) Salva atribuição do lead (first-touch)
      await this.tracking.upsertAttribution(companyId, userId, {
        ...(trackingData || {}),
        ip_address: requestContext?.ip,
        user_agent: requestContext?.userAgent,
      });
    } catch (err) {
      this.logger.warn(
        `upsertAttribution falhou: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }

    // 2 + 3) Dispara eventos pra Meta CAPI (e logs)
    const emailHash = this.tracking.hashEmail(email);
    const phoneHash = this.tracking.hashPhone(phone);
    const baseEvent = {
      event_id: trackingData?.event_id || `${companyId}-signup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      email_hash: emailHash,
      phone_hash: phoneHash,
      external_id: companyId,
      user_id: companyId,
      fbp: trackingData?.fbp,
      fbc: trackingData?.fbc,
      ga_client_id: trackingData?.ga_client_id,
      gclid: trackingData?.gclid,
      fbclid: trackingData?.fbclid,
      utm_source: trackingData?.utm_source,
      utm_medium: trackingData?.utm_medium,
      utm_campaign: trackingData?.utm_campaign,
      utm_content: trackingData?.utm_content,
      utm_term: trackingData?.utm_term,
      page_url: trackingData?.landing_page,
      page_referrer: trackingData?.page_referrer,
    };

    // lead_signup → Meta "Lead"
    await this.tracking
      .ingestClientEvent(
        { ...baseEvent, event_name: 'lead_signup' },
        requestContext?.ip,
        requestContext?.userAgent,
      )
      .catch((err) =>
        this.logger.warn(
          `lead_signup CAPI falhou: ${err instanceof Error ? err.message : 'erro'}`,
        ),
      );

    // trial_started → Meta "StartTrial"
    await this.tracking
      .ingestClientEvent(
        {
          ...baseEvent,
          event_id: `${baseEvent.event_id}-trial`,
          event_name: 'trial_started',
        },
        requestContext?.ip,
        requestContext?.userAgent,
      )
      .catch((err) =>
        this.logger.warn(
          `trial_started CAPI falhou: ${err instanceof Error ? err.message : 'erro'}`,
        ),
      );
  }
}
