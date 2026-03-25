import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/productos.js';
import { apiFetch } from '../api/http.js';

async function fetchProductsWithSuppliers() {
  const [products, suppliers] = await Promise.all([
    getProducts(),
    apiFetch('proveedores/get'),
  ]);
  const supplierMap = Object.fromEntries(suppliers.map((p) => [p.id, p.name]));
  return products.map((p) => ({ ...p, _supplierName: supplierMap[p.supplier_id] ?? '' }));
}

export function useProducts() {
  const { data = [], isLoading: loading, error, refetch: reload } = useQuery({
    queryKey: ['productos'],
    queryFn: fetchProductsWithSuppliers,
    staleTime: 30_000,
  });
  return { data, loading, error: error?.message ?? null, reload };
}