import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';
import type { Goal, GoalContribution } from '@/types/models';
import type { ApiResponse } from '@/types/api';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => apiGet<Goal[]>('/goals'),
  });
}

export function useGoal(id?: string) {
  return useQuery({
    queryKey: ['goals', id],
    queryFn: () => apiGet<Goal>(`/goals/${id}`),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<Goal>>('/goals', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Meta criada');
      void qc.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put<ApiResponse<Goal>>(`/goals/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Meta atualizada');
      void qc.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      toast.success('Meta removida');
      void qc.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useContributeGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.post<ApiResponse<GoalContribution>>(`/goals/${id}/contribute`, data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Contribuição adicionada');
      void qc.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
