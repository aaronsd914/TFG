import React, { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:8000/api/';

function formatEUR(n) { return `${Number(n || 0).toFixed(2)} €`; }
function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

export default function TransportePage() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [r1, r2] = await Promise.all([
          fetch(`${API_URL}transporte/almacen`),
          fetch(`${API_URL}clientes/get`),
        ]);
        if (!r1.ok) throw new Error(`HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
        setPedidos(await r1.json());
        setClientes(await r2.json());
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const clientesById = useMemo(() => {
    const m = new Map();
    clientes.forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  function toggle(id) {
    setSel(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (sel.size === pedidos.length) {
      setSel(new Set());
    } else {
      setSel(new Set(pedidos.map(p => p.id)));
    }
  }

  async function generarFactura() {
    if (sel.size === 0) {
      alert('Selecciona al menos un pedido.');
      return;
    }
    try {
      setPosting(true);
      setResult(null);
      const res = await fetch(`${API_URL}transporte/factura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albaran_ids: Array.from(sel) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || 'Error generando factura');
      setResult(json);
      alert(`Factura creada (${json.n_pedidos} pedidos). Importe: ${formatEUR(json.importe)}\nGuardado en: ${json.path}`);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Transporte</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="rounded-xl border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50"
          >
            {sel.size === pedidos.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <button
            onClick={generarFactura}
            disabled={posting || sel.size === 0}
            className={`rounded-xl px-4 py-2 text-white ${posting || sel.size===0 ? 'bg-gray-400' : 'bg-black hover:opacity-90'}`}
          >
            {posting ? 'Generando…' : 'Generar factura de transporte (7%)'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
          <div className="col-span-1"></div>
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-3">Cliente</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-2">Descripción</div>
        </div>
        <ul>
          {loading && <li className="p-6 text-gray-500">Cargando pedidos en almacén…</li>}
          {err && <li className="p-6 text-red-600">{err}</li>}
          {!loading && !err && pedidos.length === 0 && (
            <li className="p-6 text-gray-500">No hay pedidos en almacén.</li>
          )}
          {pedidos.map(p => {
            const cli = clientesById.get(p.cliente_id);
            return (
              <li key={p.id} className="grid grid-cols-12 px-4 py-3 border-t items-center">
                <div className="col-span-1">
                  <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
                </div>
                <div className="col-span-2">#{p.id}</div>
                <div className="col-span-2">{formatDate(p.fecha)}</div>
                <div className="col-span-3">
                  <div className="font-medium">{cli?.nombre} {cli?.apellidos}</div>
                  <div className="text-xs text-gray-500 truncate">{cli?.dni ? `${cli.dni} · ` : ''}{cli?.email}</div>
                </div>
                <div className="col-span-2">{formatEUR(p.total)}</div>
                <div className="col-span-2 truncate" title={p.descripcion || ''}>{p.descripcion || '—'}</div>
              </li>
            );
          })}
        </ul>
      </div>

      {result && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          Factura generada correctamente. Importe: {formatEUR(result.importe)}. Guardada en: <span className="font-mono">{result.path}</span>
        </div>
      )}
    </div>
  );
}
