import { useState, useEffect } from 'react';
import { getClientes } from '../api/clientes.js';

export function useClientes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getClientes());
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  return { data, loading, error, reload };
}
