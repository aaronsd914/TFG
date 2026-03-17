import { useState, useEffect } from 'react';
import { getMovimientos } from '../api/movimientos.js';

export function useMovimientos() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMovimientos());
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  return { data, loading, error, reload };
}
