import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance } from 'axios';
import { AppConfigService } from '../../common/config/app.config';

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'YEARLY';
  status: string;
  billingType: string;
}

/** Status do Asaas que significam "o cliente pagou de verdade". */
export const PAID_STATUSES: readonly string[] = [
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH',
];

export interface AsaasPayment {
  id: string;
  subscription?: string;
  customer: string;
  value: number;
  netValue: number;
  status: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixCopyPaste?: string;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private http: AxiosInstance | null = null;

  constructor(private readonly appConfig: AppConfigService) {}

  private getHttp(): AxiosInstance {
    if (!this.http) {
      this.http = axios.create({
        baseURL: this.appConfig.getAsaasBaseUrl(),
        headers: {
          access_token: this.appConfig.getAsaasApiKey(),
          'Content-Type': 'application/json',
          'User-Agent': 'Controlei/1.0',
        },
        timeout: 30_000,
      });
    }
    return this.http;
  }

  /**
   * Procura um customer já existente pelo externalReference (companyId).
   * Evita criar um customer novo a cada tentativa de checkout — o que gerava
   * duplicatas e espalhava as cobranças do mesmo cliente por vários cadastros.
   */
  async findCustomerByExternalReference(
    externalReference: string,
  ): Promise<AsaasCustomer | null> {
    try {
      const { data } = await this.getHttp().get<{ data: AsaasCustomer[] }>(
        `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=100`,
      );
      const list = data.data ?? [];
      // O mais recente primeiro — o Asaas devolve por data de criação desc.
      return list[0] ?? null;
    } catch (error) {
      this.logError('findCustomerByExternalReference', error);
      return null;
    }
  }

  /** Cria um customer no Asaas. Retorna o customer com id. */
  async createCustomer(input: {
    name: string;
    email: string;
    phone: string;
    cpfCnpj?: string;
    externalReference?: string;
  }): Promise<AsaasCustomer> {
    try {
      const { data } = await this.getHttp().post<AsaasCustomer>('/customers', {
        name: input.name,
        email: input.email,
        mobilePhone: input.phone,
        cpfCnpj: input.cpfCnpj,
        externalReference: input.externalReference,
        notificationDisabled: false,
      });
      return data;
    } catch (error) {
      this.logError('createCustomer', error);
      throw new BadGatewayException(
        'Erro ao criar cliente no Asaas. Tente novamente.',
      );
    }
  }

  /** Atualiza dados de um customer existente (ex.: preencher CPF/CNPJ). */
  async updateCustomer(
    customerId: string,
    input: { cpfCnpj?: string; name?: string; phone?: string },
  ): Promise<AsaasCustomer> {
    try {
      const payload: Record<string, unknown> = {};
      if (input.cpfCnpj) payload['cpfCnpj'] = input.cpfCnpj;
      if (input.name) payload['name'] = input.name;
      if (input.phone) payload['mobilePhone'] = input.phone;
      const { data } = await this.getHttp().post<AsaasCustomer>(
        `/customers/${customerId}`,
        payload,
      );
      return data;
    } catch (error) {
      this.logError('updateCustomer', error);
      throw new BadGatewayException('Erro ao atualizar cliente no Asaas.');
    }
  }

  /**
   * Cria uma assinatura recorrente (monthly ou yearly) no Asaas.
   * nextDueDate é a data do PRIMEIRO pagamento. Setar para daqui 3 dias
   * pra dar o trial de 3 dias.
   */
  async createSubscription(input: {
    customerId: string;
    value: number;
    cycle: 'MONTHLY' | 'YEARLY';
    nextDueDate: string; // YYYY-MM-DD
    billingType?: 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    description?: string;
    externalReference?: string;
  }): Promise<AsaasSubscription> {
    try {
      const { data } = await this.getHttp().post<AsaasSubscription>(
        '/subscriptions',
        {
          customer: input.customerId,
          billingType: input.billingType ?? 'UNDEFINED',
          value: input.value,
          nextDueDate: input.nextDueDate,
          cycle: input.cycle,
          description:
            input.description ?? 'Assinatura Controlei — controle financeiro',
          externalReference: input.externalReference,
        },
      );
      return data;
    } catch (error) {
      this.logError('createSubscription', error);
      throw new BadGatewayException(
        'Erro ao criar assinatura no Asaas. Tente novamente.',
      );
    }
  }

  /** Atualiza cycle/valor de uma assinatura (troca mensal ↔ anual). */
  async updateSubscription(
    subscriptionId: string,
    input: { value?: number; cycle?: 'MONTHLY' | 'YEARLY'; nextDueDate?: string },
  ): Promise<AsaasSubscription> {
    try {
      const { data } = await this.getHttp().post<AsaasSubscription>(
        `/subscriptions/${subscriptionId}`,
        input,
      );
      return data;
    } catch (error) {
      this.logError('updateSubscription', error);
      throw new BadGatewayException(
        'Erro ao atualizar assinatura no Asaas.',
      );
    }
  }

  /** Cancela (deleta) uma assinatura. */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.getHttp().delete(`/subscriptions/${subscriptionId}`);
    } catch (error) {
      this.logError('deleteSubscription', error);
      // Não lança — cancelamento é best-effort
    }
  }

  /** Busca o primeiro payment pendente de uma subscription (pra pegar invoice URL). */
  async findSubscriptionPayments(
    subscriptionId: string,
  ): Promise<AsaasPayment[]> {
    try {
      const { data } = await this.getHttp().get<{ data: AsaasPayment[] }>(
        `/subscriptions/${subscriptionId}/payments`,
      );
      return data.data ?? [];
    } catch (error) {
      this.logError('findSubscriptionPayments', error);
      return [];
    }
  }

  /** Retorna o link de checkout/invoice do próximo pagamento que ainda
   * pode ser pago. Aceita PENDING, OVERDUE e AWAITING_RISK_ANALYSIS. */
  async getNextPaymentUrl(subscriptionId: string): Promise<string | null> {
    const payments = await this.findSubscriptionPayments(subscriptionId);
    const pending = payments.find((p) =>
      ['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS'].includes(p.status),
    );
    return pending?.invoiceUrl ?? null;
  }

  /**
   * Retorna o pagamento mais recente de uma assinatura que o cliente JÁ PAGOU.
   *
   * Existe porque "não ter fatura em aberto" tem dois significados opostos:
   * a assinatura é órfã (conta trocada) OU o cliente acabou de pagar. Sem
   * essa checagem o sistema confundia os dois e apagava a assinatura paga.
   */
  async findLastPaidPayment(
    subscriptionId: string,
  ): Promise<AsaasPayment | null> {
    const payments = await this.findSubscriptionPayments(subscriptionId);
    const paid = payments.filter((p) => PAID_STATUSES.includes(p.status));
    if (paid.length === 0) return null;
    // Mais recente pela data de pagamento (fallback: vencimento).
    paid.sort((a, b) =>
      (b.paymentDate ?? b.dueDate).localeCompare(a.paymentDate ?? a.dueDate),
    );
    return paid[0] ?? null;
  }

  /** Assinatura ainda existe e não foi removida na conta Asaas atual? */
  async subscriptionExists(subscriptionId: string): Promise<boolean> {
    try {
      const { data } = await this.getHttp().get<{ deleted?: boolean }>(
        `/subscriptions/${subscriptionId}`,
      );
      return data.deleted !== true;
    } catch {
      return false;
    }
  }

  private logError(method: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 'TIMEOUT';
      const body = error.response?.data
        ? JSON.stringify(error.response.data).slice(0, 500)
        : error.message;
      this.logger.error(`[${method}] HTTP ${String(status)}: ${body}`);
    } else if (error instanceof Error) {
      this.logger.error(`[${method}] ${error.message}`);
    }
  }
}
