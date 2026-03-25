import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '../api/clientes.js';

export function useCustomers() {
  const { data = [], isLoading: loading, error, refetch: reload } = useQuery({
    queryKey: ['clientes'],
    queryFn: getCustomers,
    staleTime: 30_000,
  });
  return { data, loading, error: error?.message ?? null, reload };
}
