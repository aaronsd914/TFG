import React, { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:8000/api/';

const TIPO_META = {
  INGRESO:  { label: 'Ingreso', className: 'bg-green-100 text-green-800 border-green-300' },
  EGRESO:   { label: 'Egreso',  className: 'bg-red-100 text-red-800 border-red-300' },
};

function formatEUR(n) {
  const v = Number(n || 0);
  return `${v.toFixed(2)} €`;
}
function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

export default function MovimientosPage() {
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // formulario nuevo movimiento
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0,10));
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [tipo, setTipo] = useState('INGRESO');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}movimientos/get`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setMovs(await res.json());
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addMovimiento(e) {
    e.preventDefault();
    if (!fecha || !concepto || !cantidad) return;
    try {
      setPosting(true);
      const payload = {
        fecha,
        concepto,
        cantidad: Number(cantidad),
        tipo,
      };
      const res = await fetch(`${API_URL}movimientos/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || 'No se pudo crear el movimiento');
      setMovs(prev => [json, ...prev]);
      setConcepto('');
      setCantidad('');
      setTipo('INGRESO');
    } catch (e) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  }

  // Resumen del mes actual
  const resumen = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0..11

    let ingresos = 0;
    let egresos = 0;
    for (const mv of movs) {
      const d = new Date(mv.fecha);
      if (d.getFullYear() === y && d.getMonth() === m) {
        if (mv.tipo === 'INGRESO') ingresos += Number(mv.cantidad || 0);
        else egresos += Number(mv.cantidad || 0);
      }
    }
    const balance = ingresos - egresos;
    return { ingresos, egresos, balance, y, m: m+1 };
  }, [movs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Movimientos</h1>
      </div>

      {/* Resumen mensual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Ingresos ({resumen.m}/{resumen.y})</div>
          <div className="text-2xl font-semibold">{formatEUR(resumen.ingresos)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Egresos ({resumen.m}/{resumen.y})</div>
          <div className="text-2xl font-semibold">{formatEUR(resumen.egresos)}</div>
        </div>
        <div className={`bg-white border rounded-2xl p-4 ${resumen.balance >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className="text-sm text-gray-500">Balance ({resumen.m}/{resumen.y})</div>
          <div className={`text-2xl font-semibold ${resumen.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatEUR(resumen.balance)}</div>
        </div>
      </div>

      {/* Alta rápida */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Añadir movimiento</h2>
        <form onSubmit={addMovimiento} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="border rounded-lg px-3 py-2 md:col-span-1" />
          <input type="text" placeholder="Concepto" value={concepto} onChange={e=>setConcepto(e.target.value)} className="border rounded-lg px-3 py-2 md:col-span-3" />
          <input type="number" step="0.01" placeholder="Cantidad (€)" value={cantidad} onChange={e=>setCantidad(e.target.value)} className="border rounded-lg px-3 py-2 md:col-span-1" />
          <select value={tipo} onChange={e=>setTipo(e.target.value)} className="border rounded-lg px-3 py-2 md:col-span-1">
            <option value="INGRESO">Ingreso</option>
            <option value="EGRESO">Egreso</option>
          </select>
          <div className="md:col-span-6">
            <button disabled={posting} className={`mt-1 px-4 py-2 rounded-xl text-white ${posting ? 'bg-gray-400' : 'bg-black hover:opacity-90'}`}>
              {posting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      {/* Listado */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
          <div className="col-span-2">Fecha</div>
          <div className="col-span-6">Concepto</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Cantidad</div>
        </div>
        <ul>
          {loading && <li className="p-6 text-gray-500">Cargando movimientos…</li>}
          {err && <li className="p-6 text-red-600">{err}</li>}
          {!loading && !err && movs.length === 0 && (
            <li className="p-6 text-gray-500">No hay movimientos aún.</li>
          )}
          {movs.map(mv => {
            const meta = TIPO_META[mv.tipo] || { label: mv.tipo, className: 'bg-gray-100 text-gray-700 border-gray-300' };
            return (
              <li key={mv.id} className="grid grid-cols-12 px-4 py-3 border-t">
                <div className="col-span-2">{formatDate(mv.fecha)}</div>
                <div className="col-span-6 truncate" title={mv.concepto}>{mv.concepto}</div>
                <div className="col-span-2">
                  <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${meta.className}`}>{meta.label}</span>
                </div>
                <div className="col-span-2">{formatEUR(mv.cantidad)}</div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
