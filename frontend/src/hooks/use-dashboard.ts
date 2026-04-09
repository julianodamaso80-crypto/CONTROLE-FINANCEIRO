import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { DashboardResponse } from '@/types/api';

interface DashboardFilters {
  segmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useDashboard(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () =>
      apiGet<DashboardResponse>('/dashboard', {
        segmentId: filters?.segmentId,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
      }),
  });
}
