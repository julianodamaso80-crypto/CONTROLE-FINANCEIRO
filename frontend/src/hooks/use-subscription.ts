import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';

export type SubscriptionPlan = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'LIFETIME';

export interface SubscriptionDto {
  id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialing: boolean;
  trialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  nextPaymentAt: string | null;
  lastPaymentAt: string | null;
  paymentUrl: string | null;
  blocked: boolean;
  lifetime?: boolean;
  planValues: { MONTHLY: number; ANNUAL: number };
}

export function useSubscription() {
  return useQuery<SubscriptionDto | null>({
    queryKey: ['subscription'],
    queryFn: () => apiGet<SubscriptionDto | null>('/subscriptions/me'),
    refetchOnWindowFocus: true,
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: SubscriptionPlan) => {
      await api.post('/subscriptions/change-plan', { plan });
    },
    onSuccess: () => {
      toast.success('Plano alterado com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/subscriptions/cancel');
    },
    onSuccess: () => {
      toast.success('Assinatura cancelada');
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRefreshPaymentUrl() {
  return useMutation({
    mutationFn: async (): Promise<string | null> => {
      const res = await api.get<{ success: boolean; data: { url: string | null } }>(
        '/subscriptions/payment-url',
      );
      return res.data.data.url;
    },
  });
}

export class CpfCnpjRequiredError extends Error {
  constructor() {
    super('CPF ou CNPJ obrigatório');
    this.name = 'CpfCnpjRequiredError';
  }
}

export function useCheckoutUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      plan: Exclude<SubscriptionPlan, 'LIFETIME'>;
      cpfCnpj?: string;
    }): Promise<string | null> => {
      try {
        const res = await api.post<{
          success: boolean;
          data: { url: string | null };
        }>('/subscriptions/checkout-url', input);
        return res.data.data.url;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'CPF_OR_CNPJ_REQUIRED') {
          throw new CpfCnpjRequiredError();
        }
        throw err;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: Error) => {
      if (!(error instanceof CpfCnpjRequiredError)) {
        toast.error(error.message);
      }
    },
  });
}
