import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';
import type { Transaction } from '@/types/models';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

interface TransactionFilters {
  type?: string;
  status?: string;
  categoryId?: string;
  segmentId?: string;
  bankAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      apiGet<PaginatedResponse<Transaction>>('/transactions', filters as Record<string, string | undefined>),
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => apiGet<Transaction>(`/transactions/${id}`),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<Transaction>>(
        '/transactions',
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Transação criada com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.put<ApiResponse<Transaction>>(
        `/transactions/${id}`,
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Transação atualizada com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      toast.success('Transação excluída com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMarkTransactionAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentDate,
    }: {
      id: string;
      paymentDate?: string;
    }) => {
      const res = await api.patch<ApiResponse<Transaction>>(
        `/transactions/${id}/pay`,
        { paymentDate },
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Transação marcada como paga');
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiResponse<Transaction>>(
        `/transactions/${id}/cancel`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Transação cancelada');
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
