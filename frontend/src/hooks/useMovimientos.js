import { useQuery } from '@tanstack/react-query';
import { getMovements } from '../api/movimientos.js';

export function useMovements() {
  const { data = [], isLoading: loading, error, refetch: reload } = useQuery({
    queryKey: ['movimientos'],
    queryFn: getMovements,
    staleTime: 30_000,
  });
  return { data, loading, error: error?.message ?? null, reload };
}
