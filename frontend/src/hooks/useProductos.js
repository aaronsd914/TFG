import { useState, useEffect } from 'react';
import { getProducts } from '../api/productos.js';
import { apiFetch } from '../api/http.js';

export function useProducts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, suppliers] = await Promise.all([
        getProducts(),
        apiFetch('proveedores/get'),
      ]);
      // Attach supplier names
      const supplierMap = Object.fromEntries(suppliers.map((p) => [p.id, p.name]));
      setData(products.map((p) => ({ ...p, _supplierName: supplierMap[p.supplier_id] ?? '' })));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  return { data, loading, error, reload };
}