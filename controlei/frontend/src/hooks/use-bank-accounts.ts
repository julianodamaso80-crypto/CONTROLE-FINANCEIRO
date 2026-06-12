import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { BankAccount } from '@/types/models';

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => apiGet<BankAccount[]>('/bank-accounts'),
  });
}
