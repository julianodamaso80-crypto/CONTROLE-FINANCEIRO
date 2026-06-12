import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGet } from '@/lib/api';
import type { ApiResponse, WhatsAppStatus } from '@/types/api';

export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => apiGet<WhatsAppStatus>('/whatsapp/status'),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING_QR' || status === 'CONNECTING') {
        return 2000;
      }
      return false;
    },
  });
}

export function useConnectWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<WhatsAppStatus>>(
        '/whatsapp/connect',
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Conectando WhatsApp...');
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<ApiResponse<{ message: string }>>(
        '/whatsapp/disconnect',
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('WhatsApp desconectado');
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
