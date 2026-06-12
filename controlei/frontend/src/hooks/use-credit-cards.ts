import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';
import type { CreditCard, Invoice } from '@/types/models';
import type { ApiResponse } from '@/types/api';

export function useCreditCards() {
  return useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => apiGet<CreditCard[]>('/credit-cards'),
  });
}

export function useCreditCard(id?: string) {
  return useQuery({
    queryKey: ['credit-cards', id],
    queryFn: () => apiGet<CreditCard>(`/credit-cards/${id}`),
    enabled: !!id,
  });
}

export function useCreateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<CreditCard>>('/credit-cards', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Cartão criado');
      void qc.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put<ApiResponse<CreditCard>>(`/credit-cards/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Cartão atualizado');
      void qc.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCreditCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/credit-cards/${id}`);
    },
    onSuccess: () => {
      toast.success('Cartão desativado');
      void qc.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddCardExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, data }: { cardId: string; data: Record<string, unknown> }) => {
      const res = await api.post<ApiResponse<{ transactions: Array<{ id: string }>; totalInstallments: number }>>(
        `/credit-cards/${cardId}/expenses`,
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Despesa registrada no cartão');
      void qc.invalidateQueries({ queryKey: ['credit-cards'] });
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInvoices(cardId?: string) {
  return useQuery({
    queryKey: ['invoices', cardId],
    queryFn: () => apiGet<Invoice[]>(`/credit-cards/${cardId}/invoices`),
    enabled: !!cardId,
  });
}

export function useInvoiceDetail(invoiceId?: string) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => apiGet<Invoice>(`/credit-cards/invoices/${invoiceId}`),
    enabled: !!invoiceId,
  });
}

export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, paidAmount }: { invoiceId: string; paidAmount?: number }) => {
      const res = await api.post<ApiResponse<Invoice>>(
        `/credit-cards/invoices/${invoiceId}/pay`,
        paidAmount !== undefined ? { paidAmount } : {},
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Fatura paga');
      void qc.invalidateQueries({ queryKey: ['invoices'] });
      void qc.invalidateQueries({ queryKey: ['invoice'] });
      void qc.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
