import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  type Subscription,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfigService } from '../../common/config/app.config';
import { AsaasService } from '../asaas/asaas.service';

const TRIAL_DAYS = 3;
const PLAN_VALUES: Record<SubscriptionPlan, number> = {
  MONTHLY: 19.9,
  ANNUAL: 199.9,
};
const PLAN_CYCLE: Record<SubscriptionPlan, 'MONTHLY' | 'YEARLY'> = {
  MONTHLY: 'MONTHLY',
  ANNUAL: 'YEARLY',
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Cria a subscription inicial logo após o signup.
   * Tenta criar customer + subscription no Asaas. Se falhar, grava no
   * banco local com trial mesmo assim (pra não travar o signup) e deixa
   * last_error preenchido pra retry manual.
   */
  async createInitialSubscription(input: {
    companyId: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
  }): Promise<Subscription> {
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    // Se Asaas não tá configurado, cria só o registro local
    if (!this.appConfig.isAsaasConfigured()) {
      this.logger.warn(
        'Asaas não configurado — criando subscription local only',
      );
      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          trialEndsAt,
          lastError: 'Asaas não configurado no ambiente',
        },
      });
    }

    // Tenta criar customer + subscription no Asaas
    try {
      const customer = await this.asaas.createCustomer({
        name: input.name,
        email: input.email,
        phone: input.phone,
        externalReference: input.companyId,
      });

      // Primeiro pagamento = fim do trial de 3 dias
      const nextDueDate = trialEndsAt.toISOString().slice(0, 10);

      const asaasSub = await this.asaas.createSubscription({
        customerId: customer.id,
        value: PLAN_VALUES.MONTHLY,
        cycle: PLAN_CYCLE.MONTHLY,
        nextDueDate,
        billingType: 'UNDEFINED',
        externalReference: input.companyId,
      });

      // Pega link de pagamento
      const paymentUrl = await this.asaas.getNextPaymentUrl(asaasSub.id);

      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          asaasCustomerId: customer.id,
          asaasSubscriptionId: asaasSub.id,
          asaasPaymentUrl: paymentUrl,
          trialEndsAt,
          nextPaymentAt: trialEndsAt,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido';
      this.logger.error(`Falha ao criar subscription Asaas: ${msg}`);
      // Fallback: cria local com trial e lastError
      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          trialEndsAt,
          lastError: msg,
        },
      });
    }
  }

  async getByCompanyId(companyId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { companyId } });
  }

  /**
   * Retorna true se o company pode usar o sistema agora.
   * Se o company não tem subscription (cliente antigo, pré-planos),
   * cria automaticamente com trial de 7 dias.
   */
  async isAccessAllowed(companyId: string): Promise<boolean> {
    let sub = await this.getByCompanyId(companyId);

    // Auto-provision pra clientes existentes que não tinham subscription
    if (!sub) {
      sub = await this.autoProvisionTrial(companyId);
      if (!sub) return false;
    }

    const now = new Date();

    if (sub.status === 'ACTIVE') return true;

    if (sub.status === 'TRIALING') {
      if (sub.trialEndsAt > now) return true;
      // Trial expirado — marca como EXPIRED (fire-and-forget)
      this.prisma.subscription
        .update({ where: { id: sub.id }, data: { status: 'EXPIRED' } })
        .catch(() => {});
      return false;
    }

    return false;
  }

  /**
   * Cria subscription com trial de 7 dias pra empresa existente que
   * não tem registro (migração de clientes pré-planos). Tenta criar
   * customer + subscription no Asaas se configurado.
   */
  private async autoProvisionTrial(
    companyId: string,
  ): Promise<Subscription | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
    if (!company || company.users.length === 0) return null;

    const user = company.users[0]!;
    const LEGACY_TRIAL_DAYS = 3;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + LEGACY_TRIAL_DAYS);

    this.logger.log(
      `Auto-provisioning subscription for legacy company ${companyId} (user ${user.name})`,
    );

    try {
      if (this.appConfig.isAsaasConfigured()) {
        const customer = await this.asaas.createCustomer({
          name: user.name,
          email: user.email,
          phone: user.phone,
          externalReference: companyId,
        });

        const nextDueDate = trialEndsAt.toISOString().slice(0, 10);
        const asaasSub = await this.asaas.createSubscription({
          customerId: customer.id,
          value: PLAN_VALUES.MONTHLY,
          cycle: PLAN_CYCLE.MONTHLY,
          nextDueDate,
          billingType: 'UNDEFINED',
          externalReference: companyId,
        });

        const paymentUrl = await this.asaas.getNextPaymentUrl(asaasSub.id);

        return this.prisma.subscription.create({
          data: {
            companyId,
            userId: user.id,
            plan: 'MONTHLY',
            status: 'TRIALING',
            asaasCustomerId: customer.id,
            asaasSubscriptionId: asaasSub.id,
            asaasPaymentUrl: paymentUrl,
            trialEndsAt,
            nextPaymentAt: trialEndsAt,
          },
        });
      }

      return this.prisma.subscription.create({
        data: {
          companyId,
          userId: user.id,
          plan: 'MONTHLY',
          status: 'TRIALING',
          trialEndsAt,
          lastError: 'Asaas não configurado — trial local',
        },
      });
    } catch (err) {
      this.logger.error(
        `Auto-provision failed: ${err instanceof Error ? err.message : 'erro'}`,
      );
      // Cria local com trial mesmo se Asaas falhar
      return this.prisma.subscription
        .create({
          data: {
            companyId,
            userId: user.id,
            plan: 'MONTHLY',
            status: 'TRIALING',
            trialEndsAt,
            lastError: err instanceof Error ? err.message : 'erro',
          },
        })
        .catch(() => null);
    }
  }

  async changePlan(
    companyId: string,
    newPlan: SubscriptionPlan,
  ): Promise<Subscription> {
    const sub = await this.getByCompanyId(companyId);
    if (!sub) throw new NotFoundException('Assinatura não encontrada');
    if (sub.plan === newPlan) {
      throw new BadRequestException('Você já está neste plano');
    }

    if (sub.asaasSubscriptionId) {
      await this.asaas.updateSubscription(sub.asaasSubscriptionId, {
        value: PLAN_VALUES[newPlan],
        cycle: PLAN_CYCLE[newPlan],
      });
    }

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { plan: newPlan },
    });
  }

  async cancel(companyId: string): Promise<Subscription> {
    const sub = await this.getByCompanyId(companyId);
    if (!sub) throw new NotFoundException('Assinatura não encontrada');

    if (sub.asaasSubscriptionId) {
      await this.asaas.deleteSubscription(sub.asaasSubscriptionId);
    }

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED' },
    });
  }

  async refreshPaymentUrl(companyId: string): Promise<string | null> {
    const sub = await this.getByCompanyId(companyId);
    if (!sub?.asaasSubscriptionId) return null;
    const url = await this.asaas.getNextPaymentUrl(sub.asaasSubscriptionId);
    if (url && url !== sub.asaasPaymentUrl) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { asaasPaymentUrl: url },
      });
    }
    return url;
  }

  /**
   * Pega (ou cria) o link de checkout pra um plano específico.
   * - Exige CPF ou CNPJ (Asaas não cria cobrança sem isso). Se já está
   *   salvo em Company.document, usa esse. Senão, exige no parâmetro.
   * - Se a sub não tem customer/asaasSubscriptionId, cria no Asaas on-demand.
   * - Se o plano pedido é diferente do atual, troca no Asaas + DB.
   * - Retorna sempre o link de pagamento mais atual.
   */
  async getCheckoutUrl(
    companyId: string,
    plan: SubscriptionPlan,
    cpfCnpjInput?: string,
  ): Promise<string | null> {
    if (!this.appConfig.isAsaasConfigured()) {
      throw new BadRequestException('Asaas não configurado no ambiente');
    }

    let sub = await this.getByCompanyId(companyId);
    if (!sub) {
      sub = await this.autoProvisionTrial(companyId);
    }
    if (!sub) throw new NotFoundException('Assinatura não encontrada');

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    // Asaas exige CPF/CNPJ pra gerar a cobrança. Pega o salvo ou o que
    // veio agora; se nenhum, devolve erro com code pro frontend abrir o modal.
    const cpfCnpj = cpfCnpjInput?.replace(/\D/g, '') || company.document;
    if (!cpfCnpj) {
      throw new BadRequestException({
        code: 'CPF_OR_CNPJ_REQUIRED',
        message:
          'Informe seu CPF ou CNPJ pra gerar a cobrança (exigido pelo Asaas).',
      });
    }
    // Se veio um novo (ou ainda não tinha salvo), persiste
    if (cpfCnpj !== company.document) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: { document: cpfCnpj },
      });
    }

    // Se ainda não tem customer/sub no Asaas, cria agora
    if (!sub.asaasSubscriptionId || !sub.asaasCustomerId) {
      const user = company.users[0];
      if (!user) throw new NotFoundException('Usuário ativo não encontrado');

      // Reusa customer se já existe; senão cria novo já com cpfCnpj
      let customerId = sub.asaasCustomerId;
      if (!customerId) {
        const customer = await this.asaas.createCustomer({
          name: user.name,
          email: user.email,
          phone: user.phone,
          cpfCnpj,
          externalReference: companyId,
        });
        customerId = customer.id;
      } else {
        // Customer existe mas sub não — atualiza cpfCnpj caso falte
        await this.asaas.updateCustomer(customerId, { cpfCnpj });
      }

      const nextDueDate = (sub.trialEndsAt > new Date()
        ? sub.trialEndsAt
        : new Date()
      )
        .toISOString()
        .slice(0, 10);

      const asaasSub = await this.asaas.createSubscription({
        customerId,
        value: PLAN_VALUES[plan],
        cycle: PLAN_CYCLE[plan],
        nextDueDate,
        billingType: 'UNDEFINED',
        externalReference: companyId,
      });

      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          plan,
          asaasCustomerId: customerId,
          asaasSubscriptionId: asaasSub.id,
          lastError: null,
        },
      });
    } else if (sub.plan !== plan) {
      // Troca de plano no Asaas
      await this.asaas.updateSubscription(sub.asaasSubscriptionId, {
        value: PLAN_VALUES[plan],
        cycle: PLAN_CYCLE[plan],
      });
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { plan },
      });
    }

    const url = await this.asaas.getNextPaymentUrl(sub.asaasSubscriptionId!);
    if (url && url !== sub.asaasPaymentUrl) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { asaasPaymentUrl: url },
      });
    }
    return url;
  }

  /** Retorna todos os valores dos planos (pra mostrar no frontend). */
  getPlanValues() {
    return PLAN_VALUES;
  }

  // ============================================================
  // Webhook handlers — chamados pelo WebhookController
  // ============================================================

  async handlePaymentReceived(asaasPaymentId: string, subscriptionId?: string) {
    if (!subscriptionId) return;
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
    });
    if (!sub) return;

    // Calcula próxima data de cobrança baseado no plano
    const now = new Date();
    const nextPeriodEnd = new Date(now);
    if (sub.plan === 'MONTHLY') {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    } else {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    }

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        lastPaymentAt: now,
        currentPeriodEnd: nextPeriodEnd,
        nextPaymentAt: nextPeriodEnd,
        lastError: null,
      },
    });
    this.logger.log(
      `Payment ${asaasPaymentId} received — sub ${sub.id} → ACTIVE`,
    );
  }

  async handlePaymentOverdue(subscriptionId?: string) {
    if (!subscriptionId) return;
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    });
    this.logger.log(`Sub ${sub.id} → PAST_DUE`);
  }

  async handlePaymentRefunded(subscriptionId?: string) {
    if (!subscriptionId) return;
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED' },
    });
    this.logger.log(`Sub ${sub.id} → CANCELED (refunded)`);
  }

  async handleSubscriptionDeleted(subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED' },
    });
    this.logger.log(`Sub ${sub.id} → CANCELED (asaas deleted)`);
  }

  async handleSubscriptionInactivated(subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: subscriptionId },
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    });
    this.logger.log(`Sub ${sub.id} → EXPIRED (asaas inactivated)`);
  }

  /** Retorna status útil pro frontend. Auto-provisiona se não existe.
   * Empresas com plano BUSINESS (vitalício / sócio) retornam status especial. */
  async getStatusDto(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });

    if (company?.plan === 'BUSINESS') {
      return {
        id: null,
        plan: 'LIFETIME' as const,
        status: 'LIFETIME' as const,
        trialing: false,
        trialActive: false,
        trialDaysLeft: 0,
        trialEndsAt: null,
        currentPeriodEnd: null,
        nextPaymentAt: null,
        lastPaymentAt: null,
        paymentUrl: null,
        blocked: false,
        lifetime: true,
        planValues: PLAN_VALUES,
      };
    }

    let sub = await this.getByCompanyId(companyId);
    if (!sub) {
      sub = await this.autoProvisionTrial(companyId);
    }
    if (!sub) return null;

    const now = new Date();
    const trialing = sub.status === 'TRIALING';
    const trialActive = trialing && sub.trialEndsAt > now;
    const trialDaysLeft = trialing
      ? Math.max(
          0,
          Math.ceil(
            (sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      trialing,
      trialActive,
      trialDaysLeft,
      trialEndsAt: sub.trialEndsAt.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      nextPaymentAt: sub.nextPaymentAt?.toISOString() ?? null,
      lastPaymentAt: sub.lastPaymentAt?.toISOString() ?? null,
      paymentUrl: sub.asaasPaymentUrl,
      blocked: !(sub.status === 'ACTIVE' || trialActive),
      lifetime: false,
      planValues: PLAN_VALUES,
    };
  }
}
