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

export interface MonthComparisonItem {
  month: string;
  year: number;
  monthIndex: number;
  income: number;
  expense: number;
  balance: number;
}

export function useMonthComparison(months: number = 6) {
  return useQuery({
    queryKey: ['dashboard-month-comparison', months],
    queryFn: () =>
      apiGet<MonthComparisonItem[]>('/dashboard/month-comparison', {
        months: String(months),
      }),
  });
}

export interface CashflowForecast {
  initialBalance: number;
  finalBalance: number;
  minBalance: number;
  minBalanceDate: string | null;
  daily: Array<{ date: string; income: number; expense: number; balance: number }>;
}

export function useCashflowForecast(days: number = 60) {
  return useQuery({
    queryKey: ['dashboard-cashflow-forecast', days],
    queryFn: () =>
      apiGet<CashflowForecast>('/dashboard/cashflow-forecast', {
        days: String(days),
      }),
  });
}
