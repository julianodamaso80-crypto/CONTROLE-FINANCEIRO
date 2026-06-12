import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';
import type { Segment } from '@/types/models';
import type { ApiResponse } from '@/types/api';

export function useSegments(includeInactive?: boolean) {
  return useQuery({
    queryKey: ['segments', { includeInactive }],
    queryFn: () =>
      apiGet<Segment[]>('/segments', {
        includeInactive: includeInactive ? 'true' : undefined,
      }),
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<Segment>>('/segments', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Segmento criado com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await api.put<ApiResponse<Segment>>(
        `/segments/${id}`,
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Segmento atualizado com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/segments/${id}`);
    },
    onSuccess: () => {
      toast.success('Segmento desativado com sucesso');
      void queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
