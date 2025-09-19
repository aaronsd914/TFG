import { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:8000/api/';

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}
function fmtDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-ES');
}

export default function TransportePage() {
  const [albs, setAlbs] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [facturaMsg, setFacturaMsg] = useState('');

  const clientesMap = useMemo(() => {
    const m = new Map();
    (clientes || []).forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  async function reload() {
    try {
      setLoading(true);
      setErr(null);
      const [rAlm, rCli] = await Promise.all([
        fetch(`${API_URL}transporte/almacen`),
        fetch(`${API_URL}clientes/get`),
      ]);
      if (!rAlm.ok) throw new Error(`Almacén HTTP ${rAlm.status}`);
      if (!rCli.ok) throw new Error(`Clientes HTTP ${rCli.status}`);
      setAlbs(await rAlm.json());
      setClientes(await rCli.json());
      setSel(new Set());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  function toggle(id) {
    setSel(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleAll(e) {
    const checked = e.target.checked;
    setSel(prev => {
      if (!checked) return new Set();
      return new Set(albs.map(a => a.id));
    });
  }

  async function marcarEntregado(id) {
    setSavingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`${API_URL}albaranes/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ENTREGADO' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        alert(`No se pudo marcar entregado: ${j.detail || res.statusText}`);
        return;
      }
      await reload();
    } catch (e) {
      alert(`Error de red: ${e.message}`);
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function bulkEntregado() {
    if (sel.size === 0) return;
    setProcessing(true);
    try {
      for (const id of sel) {
        const r = await fetch(`${API_URL}albaranes/${id}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'ENTREGADO' }),
        });
        if (!r.ok) {
          const j = await r.json().catch(()=>({}));
          alert(`Fallo en #${id}: ${j.detail || r.statusText}`);
          break;
        }
      }
      await reload();
    } catch (e) {
      alert(`Error de red: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function generarFactura() {
    if (sel.size === 0) {
      alert('Selecciona al menos un pedido.');
      return;
    }
    setProcessing(true);
    setFacturaMsg('');
    try {
      const ids = Array.from(sel);
      const res = await fetch(`${API_URL}transporte/factura`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ albaran_ids: ids }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(`No se pudo generar la factura: ${j.detail || res.statusText}`);
        return;
      }
      setFacturaMsg(`Factura OK: ${j.n_pedidos} pedidos · ${eur(j.importe)}. Guardado en: ${j.path}`);
      await reload(); // ya no están en ALMACEN, han pasado a RUTA
    } catch (e) {
      alert(`Error al generar factura: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Transporte</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-lg border bg-black text-white hover:opacity-90 disabled:opacity-50"
            onClick={generarFactura}
            disabled={processing || sel.size === 0}
            title="Generar factura 7% del total seleccionado (pasan a RUTA)"
          >
            Generar factura (7%)
          </button>
          <button
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            onClick={bulkEntregado}
            disabled={processing || sel.size === 0}
            title="Marcar selección como ENTREGADO"
          >
            ✓ Entregado
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-500">Cargando pedidos en almacén…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}
      {facturaMsg && <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{facturaMsg}</div>}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2 w-10">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={albs.length > 0 && sel.size === albs.length}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="p-2 w-20">ID</th>
              <th className="p-2 w-32">Fecha</th>
              <th className="p-2">Cliente</th>
              <th className="p-2 w-28">Total</th>
              <th className="p-2 w-56">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(!loading && albs.length === 0) && (
              <tr><td colSpan={6} className="p-4 text-sm text-gray-500">No hay pedidos en almacén.</td></tr>
            )}
            {albs.map(a => {
              const c = clientesMap.get(a.cliente_id);
              const saving = savingIds.has(a.id);
              return (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={sel.has(a.id)}
                      onChange={() => toggle(a.id)}
                      aria-label={`Seleccionar albarán ${a.id}`}
                    />
                  </td>
                  <td className="p-2">#{a.id}</td>
                  <td className="p-2">{fmtDate(a.fecha)}</td>
                  <td className="p-2">{c ? `${c.nombre} ${c.apellidos}` : `Cliente #${a.cliente_id}`}</td>
                  <td className="p-2">{eur(a.total)}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1 rounded-lg border text-sm ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        onClick={() => marcarEntregado(a.id)}
                        disabled={saving}
                        title="Marcar como ENTREGADO"
                      >
                        ✓ Entregado
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
