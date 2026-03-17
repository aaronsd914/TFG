import { useState, useEffect } from 'react';
import { getProductos } from '../api/productos.js';
import { apiFetch } from '../api/http.js';

export function useProductos() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productos, proveedores] = await Promise.all([
        getProductos(),
        apiFetch('proveedores/get'),
      ]);
      // Attach provider names
      const provMap = Object.fromEntries(proveedores.map((p) => [p.id, p.nombre]));
      setData(productos.map((p) => ({ ...p, _provNombre: provMap[p.proveedor_id] ?? '' })));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  return { data, loading, error, reload };
}
