import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';
import type { Budget } from '@/types/models';
import type { ApiResponse } from '@/types/api';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiGet<Budget[]>('/budgets'),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<Budget>>('/budgets', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Orçamento criado');
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put<ApiResponse<Budget>>(`/budgets/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Orçamento atualizado');
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      toast.success('Orçamento removido');
      void qc.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
