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
import { WhatsAppCloudService } from '../whatsapp-cloud/whatsapp-cloud.service';

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
    private readonly cloud: WhatsAppCloudService,
  ) {}

  /**
   * Cria a subscription inicial logo após o signup.
   *
   * Provider default = Kirvano: só grava trial local (3 dias), sem chamar API
   * externa. Kirvano não tem API de subscription — cliente paga no checkout
   * dela quando trial vence e o webhook ativa a sub.
   *
   * Provider asaas: mantido como fallback/legado.
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

    const provider = this.appConfig.getDefaultProvider();

    // Caminho Kirvano (atual): trial só no banco, sem API externa.
    if (provider === 'kirvano') {
      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          provider: 'kirvano',
          kirvanoCustomerEmail: input.email,
          trialEndsAt,
          nextPaymentAt: trialEndsAt,
        },
      });
    }

    // Caminho Asaas (legado/fallback)
    if (!this.appConfig.isAsaasConfigured()) {
      this.logger.warn(
        'Nenhum gateway configurado — criando subscription local only',
      );
      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          provider: 'asaas',
          trialEndsAt,
          lastError: 'Nenhum gateway configurado no ambiente',
        },
      });
    }

    try {
      const customer = await this.asaas.createCustomer({
        name: input.name,
        email: input.email,
        phone: input.phone,
        externalReference: input.companyId,
      });

      const nextDueDate = trialEndsAt.toISOString().slice(0, 10);

      const asaasSub = await this.asaas.createSubscription({
        customerId: customer.id,
        value: PLAN_VALUES.MONTHLY,
        cycle: PLAN_CYCLE.MONTHLY,
        nextDueDate,
        billingType: 'UNDEFINED',
        externalReference: input.companyId,
      });

      const paymentUrl = await this.asaas.getNextPaymentUrl(asaasSub.id);

      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          provider: 'asaas',
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
      return this.prisma.subscription.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          plan: 'MONTHLY',
          status: 'TRIALING',
          provider: 'asaas',
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
   * Cria subscription com trial de 3 dias pra empresa existente sem
   * registro de subscription (migração de clientes pré-planos).
   *
   * Usa o provider default do ambiente (Kirvano se configurado).
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

    const provider = this.appConfig.getDefaultProvider();

    this.logger.log(
      `Auto-provisioning subscription for legacy company ${companyId} (user ${user.name}, provider ${provider})`,
    );

    if (provider === 'kirvano') {
      return this.prisma.subscription
        .create({
          data: {
            companyId,
            userId: user.id,
            plan: 'MONTHLY',
            status: 'TRIALING',
            provider: 'kirvano',
            kirvanoCustomerEmail: user.email,
            trialEndsAt,
            nextPaymentAt: trialEndsAt,
          },
        })
        .catch(() => null);
    }

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
            provider: 'asaas',
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
          provider: 'asaas',
          trialEndsAt,
          lastError: 'Asaas não configurado — trial local',
        },
      });
    } catch (err) {
      this.logger.error(
        `Auto-provision failed: ${err instanceof Error ? err.message : 'erro'}`,
      );
      return this.prisma.subscription
        .create({
          data: {
            companyId,
            userId: user.id,
            plan: 'MONTHLY',
            status: 'TRIALING',
            provider: 'asaas',
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
   *
   * Provider Kirvano: retorna o link configurado da Kirvano com
   * `utm_content={companyId}` pra o webhook identificar o tenant. Não
   * exige CPF/CNPJ — Kirvano coleta no próprio checkout.
   *
   * Provider Asaas (legado): exige CPF/CNPJ, cria customer + subscription
   * on-demand, troca plano se necessário, devolve link de pagamento.
   */
  async getCheckoutUrl(
    companyId: string,
    plan: SubscriptionPlan,
    cpfCnpjInput?: string,
  ): Promise<string | null> {
    let sub = await this.getByCompanyId(companyId);
    if (!sub) {
      sub = await this.autoProvisionTrial(companyId);
    }
    if (!sub) throw new NotFoundException('Assinatura não encontrada');

    // Provider Kirvano (atual)
    if (sub.provider === 'kirvano') {
      if (!this.appConfig.isKirvanoConfigured()) {
        throw new BadRequestException('Kirvano não configurado no ambiente');
      }

      const baseUrl =
        plan === 'ANNUAL'
          ? this.appConfig.getKirvanoCheckoutUrlAnnual()
          : this.appConfig.getKirvanoCheckoutUrlMonthly();

      if (!baseUrl) {
        throw new BadRequestException(
          plan === 'ANNUAL'
            ? 'Plano anual ainda não disponível.'
            : 'Link de checkout mensal não configurado.',
        );
      }

      if (sub.plan !== plan) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { plan },
        });
      }

      // Anexa utm_content={companyId} pra o webhook identificar o tenant.
      const url = new URL(baseUrl);
      url.searchParams.set('utm_content', companyId);
      return url.toString();
    }

    // Provider Asaas (legado)
    if (!this.appConfig.isAsaasConfigured()) {
      throw new BadRequestException('Asaas não configurado no ambiente');
    }

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

    const user = company.users[0];
    if (!user) throw new NotFoundException('Usuário ativo não encontrado');

    // Capturados aqui pra não perder o narrowing dentro da closure (sub é let).
    const subId = sub.id;
    const trialEndsAt = sub.trialEndsAt;

    // Cria customer + subscription do ZERO na conta Asaas atual. Usado tanto
    // no primeiro pagamento quanto pra se recuperar de vínculos inutilizáveis
    // (ex: assinatura criada numa conta Asaas antiga que foi trocada).
    const createFresh = async (): Promise<Subscription> => {
      const customer = await this.asaas.createCustomer({
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpfCnpj,
        externalReference: companyId,
      });
      const nextDueDate = (trialEndsAt && trialEndsAt > new Date()
        ? trialEndsAt
        : new Date()
      )
        .toISOString()
        .slice(0, 10);
      const asaasSub = await this.asaas.createSubscription({
        customerId: customer.id,
        value: PLAN_VALUES[plan],
        cycle: PLAN_CYCLE[plan],
        nextDueDate,
        billingType: 'UNDEFINED',
        externalReference: companyId,
      });
      return this.prisma.subscription.update({
        where: { id: subId },
        data: {
          plan,
          asaasCustomerId: customer.id,
          asaasSubscriptionId: asaasSub.id,
          asaasPaymentUrl: null,
          lastError: null,
        },
      });
    };

    let justCreated = false;

    if (!sub.asaasSubscriptionId || !sub.asaasCustomerId) {
      // Sem vínculo utilizável → cria do zero.
      sub = await createFresh();
      justCreated = true;
    } else {
      // Tem vínculo. Tenta trocar de plano (se preciso) e reaproveitar. Se o
      // Asaas recusar — assinatura órfã de conta trocada (404) ou travada
      // ("invalid_action: não pode ser atualizada") — descarta e recria.
      try {
        if (sub.plan !== plan) {
          await this.asaas.updateSubscription(sub.asaasSubscriptionId, {
            value: PLAN_VALUES[plan],
            cycle: PLAN_CYCLE[plan],
          });
          sub = await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { plan },
          });
        }
      } catch (err) {
        this.logger.warn(
          `Não deu pra reaproveitar a assinatura Asaas ${sub.asaasSubscriptionId} ` +
            `(${err instanceof Error ? err.message : 'erro'}). Recriando na conta atual.`,
        );
        await this.asaas
          .deleteSubscription(sub.asaasSubscriptionId!)
          .catch(() => undefined);
        sub = await createFresh();
        justCreated = true;
      }
    }

    let url = await this.asaas.getNextPaymentUrl(sub.asaasSubscriptionId!);

    // Reaproveitou uma assinatura mas ela não tem fatura pra pagar → quase
    // sempre é órfã (conta Asaas trocada). Recria do zero uma única vez.
    if (!url && !justCreated) {
      this.logger.warn(
        `Assinatura ${sub.asaasSubscriptionId} sem fatura disponível — recriando na conta atual.`,
      );
      await this.asaas
        .deleteSubscription(sub.asaasSubscriptionId!)
        .catch(() => undefined);
      sub = await createFresh();
      url = await this.asaas.getNextPaymentUrl(sub.asaasSubscriptionId!);
    }

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

    // Avisa o cliente no WhatsApp que a mensalidade venceu, já com o link
    // direto da fatura em atraso pra ele pagar e reativar a compra.
    await this.notifyOverdue(sub);
  }

  /**
   * Avisa o dono da empresa, pelo WhatsApp Cloud oficial, que a mensalidade
   * venceu e o acesso foi pausado — já mandando o link de pagamento da fatura
   * em atraso (boleto/Pix/cartão) pra ele reativar na hora.
   * Best-effort: nunca lança — uma falha aqui não pode derrubar o webhook.
   */
  private async notifyOverdue(sub: Subscription): Promise<void> {
    try {
      if (!this.appConfig.isWhatsAppCloudConfigured()) return;

      const owner = await this.prisma.user.findFirst({
        where: { companyId: sub.companyId, isActive: true },
        orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
        select: { name: true, phone: true },
      });
      if (!owner?.phone) return;

      // Link real da fatura pendente/em atraso no Asaas; cai no /plano se faltar.
      let payUrl: string | null = null;
      if (sub.asaasSubscriptionId) {
        payUrl = await this.asaas.getNextPaymentUrl(sub.asaasSubscriptionId);
        if (payUrl && payUrl !== sub.asaasPaymentUrl) {
          await this.prisma.subscription
            .update({ where: { id: sub.id }, data: { asaasPaymentUrl: payUrl } })
            .catch(() => {});
        }
      }
      const link = payUrl ?? 'https://meucaixa.ia.br/plano';

      const firstName = owner.name.split(' ')[0] ?? owner.name;
      await this.cloud.sendTemplate(owner.phone, 'mensalidade_vencida', 'pt_BR', [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: firstName },
            { type: 'text', text: link },
          ],
        },
      ]);
      this.logger.log(
        `Aviso de mensalidade vencida enviado: company=${sub.companyId}`,
      );
    } catch (err) {
      this.logger.warn(
        `notifyOverdue falhou company=${sub.companyId}: ${err instanceof Error ? err.message : 'erro'}`,
      );
    }
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

  // ============================================================
  // Kirvano webhook handlers
  // ============================================================

  /**
   * Encontra a subscription Kirvano correspondente a um evento.
   * Tenta nesta ordem: utm_content (companyId), kirvanoCheckoutId, email.
   */
  private async findKirvanoSubscription(lookup: {
    companyId?: string;
    checkoutId?: string;
    email?: string;
  }): Promise<Subscription | null> {
    if (lookup.companyId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { companyId: lookup.companyId, provider: 'kirvano' },
      });
      if (sub) return sub;
    }
    if (lookup.checkoutId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { kirvanoCheckoutId: lookup.checkoutId },
      });
      if (sub) return sub;
    }
    if (lookup.email) {
      const sub = await this.prisma.subscription.findFirst({
        where: {
          kirvanoCustomerEmail: lookup.email.toLowerCase(),
          provider: 'kirvano',
        },
      });
      if (sub) return sub;
    }
    return null;
  }

  /** Venda aprovada na Kirvano — ativa a subscription. */
  async handleKirvanoSaleApproved(input: {
    companyId?: string;
    checkoutId: string;
    customerEmail?: string;
    customerName?: string;
    nextChargeDate?: string;
    chargeFrequency?: string;
  }): Promise<Subscription | null> {
    const sub = await this.findKirvanoSubscription({
      companyId: input.companyId,
      checkoutId: input.checkoutId,
      email: input.customerEmail,
    });
    if (!sub) {
      this.logger.warn(
        `Kirvano SALE_APPROVED sem subscription correspondente (companyId=${input.companyId}, email=${input.customerEmail})`,
      );
      return null;
    }

    const now = new Date();
    const nextPeriodEnd = input.nextChargeDate
      ? new Date(input.nextChargeDate)
      : (() => {
          const d = new Date(now);
          const isAnnual =
            (input.chargeFrequency ?? '').toLowerCase().includes('anual') ||
            (input.chargeFrequency ?? '').toLowerCase().includes('annual') ||
            sub.plan === 'ANNUAL';
          if (isAnnual) d.setFullYear(d.getFullYear() + 1);
          else d.setMonth(d.getMonth() + 1);
          return d;
        })();

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        kirvanoCheckoutId: input.checkoutId,
        kirvanoCustomerEmail:
          input.customerEmail?.toLowerCase() ?? sub.kirvanoCustomerEmail,
        lastPaymentAt: now,
        currentPeriodEnd: nextPeriodEnd,
        nextPaymentAt: nextPeriodEnd,
        lastError: null,
      },
    });
    this.logger.log(`Kirvano SALE_APPROVED → sub ${sub.id} ACTIVE`);
    return updated;
  }

  /** Venda recusada — só loga, não altera estado. */
  async handleKirvanoSaleRefused(input: {
    companyId?: string;
    checkoutId: string;
    customerEmail?: string;
  }): Promise<void> {
    this.logger.warn(
      `Kirvano SALE_REFUSED checkoutId=${input.checkoutId} companyId=${input.companyId} email=${input.customerEmail}`,
    );
  }

  /** Chargeback — cancela a subscription. */
  async handleKirvanoChargeback(input: {
    companyId?: string;
    checkoutId: string;
    customerEmail?: string;
  }): Promise<void> {
    const sub = await this.findKirvanoSubscription({
      companyId: input.companyId,
      checkoutId: input.checkoutId,
      email: input.customerEmail,
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', lastError: 'Chargeback Kirvano' },
    });
    this.logger.log(`Kirvano CHARGEBACK → sub ${sub.id} CANCELED`);
  }

  /** Assinatura cancelada manualmente na Kirvano. */
  async handleKirvanoSubscriptionCanceled(input: {
    companyId?: string;
    checkoutId: string;
    customerEmail?: string;
  }): Promise<void> {
    const sub = await this.findKirvanoSubscription({
      companyId: input.companyId,
      checkoutId: input.checkoutId,
      email: input.customerEmail,
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED' },
    });
    this.logger.log(`Kirvano SUBSCRIPTION_CANCELED → sub ${sub.id} CANCELED`);
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
        provider: 'kirvano' as const,
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
      provider: (sub.provider as 'asaas' | 'kirvano') ?? 'asaas',
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
