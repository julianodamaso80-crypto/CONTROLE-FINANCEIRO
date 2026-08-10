import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { getUser } from '@/lib/auth';
import type { Company } from '@/types/models';

export function useCompany() {
  return useQuery({
    queryKey: ['company', 'me'],
    queryFn: () => apiGet<Company>('/companies/me'),
  });
}

/**
 * Dono da conta = quem fez o cadastro. É quem pode convidar/remover o membro e
 * editar os dados da conta. Vem de `companies.ownerId` (e não da role) porque
 * ADMIN é admin da plataforma inteira.
 *
 * `isLoading` importa: enquanto carrega, não dá pra afirmar que não é dono.
 */
export function useIsOwner() {
  const { data: company, isLoading } = useCompany();
  const user = getUser();
  return {
    isOwner: !!company?.ownerId && company.ownerId === user?.id,
    isLoading,
  };
}
