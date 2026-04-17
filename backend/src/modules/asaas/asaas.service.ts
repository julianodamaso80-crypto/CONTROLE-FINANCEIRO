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
          'User-Agent': 'MeuCaixa/1.0',
        },
        timeout: 30_000,
      });
    }
    return this.http;
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
            input.description ?? 'Assinatura Meu Caixa — controle financeiro',
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
