import { useEffect, useMemo, useRef, useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import 'chart.js/auto';

const API_URL = 'http://localhost:8000/api/';

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}
function ymKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabelShort(index0) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return meses[index0];
}
function fmtDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-ES');
}

export default function Dashboard() {
  const [movs, setMovs] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [almacen, setAlmacen] = useState([]);
  const [ruta, setRuta] = useState([]); // se mantiene para métricas/estados, aunque no se muestre sección
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [savingIds, setSavingIds] = useState(new Set());

  // UI
  const [monthsWindow, setMonthsWindow] = useState(6);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Gráfica principal: ALL | ING | EGR
  const [chartMode, setChartMode] = useState('ALL');

  const firstLoadRef = useRef(true);

  async function reloadAlmacen() {
    try {
      const r = await fetch(`${API_URL}transporte/almacen`);
      if (r.ok) setAlmacen(await r.json());
    } catch {}
  }
  async function reloadRuta() {
    try {
      const r = await fetch(`${API_URL}transporte/ruta`);
      if (r.ok) setRuta(await r.json());
    } catch {}
  }
  async function reloadAlbaranes() {
    try {
      const r = await fetch(`${API_URL}albaranes/get`);
      if (r.ok) setAlbaranes(await r.json());
    } catch {}
  }

  async function reloadAll() {
    try {
      if (firstLoadRef.current) setLoading(true);
      else setRefreshing(true);

      setErr(null);

      const [rMovs, rAlbs, rAlmacen, rRuta, rClientes] = await Promise.all([
        fetch(`${API_URL}movimientos/get`),
        fetch(`${API_URL}albaranes/get`),
        fetch(`${API_URL}transporte/almacen`),
        fetch(`${API_URL}transporte/ruta`),
        fetch(`${API_URL}clientes/get`),
      ]);

      if (!rMovs.ok) throw new Error(`Movimientos HTTP ${rMovs.status}`);
      if (!rAlbs.ok) throw new Error(`Albaranes HTTP ${rAlbs.status}`);
      if (!rClientes.ok) throw new Error(`Clientes HTTP ${rClientes.status}`);

      const almacenData = rAlmacen.ok ? await rAlmacen.json() : [];
      const rutaData = rRuta.ok ? await rRuta.json() : [];

      setMovs(await rMovs.json());
      setAlbaranes(await rAlbs.json());
      setAlmacen(Array.isArray(almacenData) ? almacenData : []);
      setRuta(Array.isArray(rutaData) ? rutaData : []);
      setClientes(await rClientes.json());
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e?.message || 'Error desconocido');
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstLoadRef.current = false;
    }
  }

  useEffect(() => {
    reloadAll();
     
  }, []);

  const clientesMap = useMemo(() => {
    const m = new Map();
    (clientes || []).forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  // Métricas del mes actual
  const now = new Date();
  const currY = now.getFullYear();
  const currM = now.getMonth();
  const prevYM = useMemo(() => {
    const dt = new Date(currY, currM - 1, 1);
    return { y: dt.getFullYear(), m: dt.getMonth() };
  }, [currY, currM]);

  const { ingresosMes, egresosMes } = useMemo(() => {
    let ingresos = 0, egresos = 0;
    for (const m of movs) {
      const d = new Date(m.fecha);
      if (d.getFullYear() === currY && d.getMonth() === currM) {
        if (m.tipo === 'INGRESO') ingresos += Number(m.cantidad || 0);
        else if (m.tipo === 'EGRESO') egresos += Number(m.cantidad || 0);
      }
    }
    return { ingresosMes: ingresos, egresosMes: egresos };
  }, [movs, currY, currM]);

  const { ingresosPrev, egresosPrev } = useMemo(() => {
    let ingresos = 0, egresos = 0;
    for (const m of movs) {
      const d = new Date(m.fecha);
      if (d.getFullYear() === prevYM.y && d.getMonth() === prevYM.m) {
        if (m.tipo === 'INGRESO') ingresos += Number(m.cantidad || 0);
        else if (m.tipo === 'EGRESO') egresos += Number(m.cantidad || 0);
      }
    }
    return { ingresosPrev: ingresos, egresosPrev: egresos };
  }, [movs, prevYM]);

  const ventasMes = useMemo(() => {
    let n = 0;
    for (const a of albaranes) {
      const d = new Date(a.fecha);
      if (d.getFullYear() === currY && d.getMonth() === currM) n += 1;
    }
    return n;
  }, [albaranes, currY, currM]);

  const ventasPrev = useMemo(() => {
    let n = 0;
    for (const a of albaranes) {
      const d = new Date(a.fecha);
      if (d.getFullYear() === prevYM.y && d.getMonth() === prevYM.m) n += 1;
    }
    return n;
  }, [albaranes, prevYM]);

  const pedidosAlmacen = almacen.length;

  // Serie ingresos/egresos (con filtros ING/EGR)
  const lineSeries = useMemo(() => {
    const keys = [];
    for (let i = monthsWindow - 1; i >= 0; i--) {
      const dt = new Date(currY, currM - i, 1);
      keys.push({ y: dt.getFullYear(), m: dt.getMonth() });
    }

    const mapIn = new Map();
    const mapOut = new Map();
    for (const k of keys) {
      const key = `${k.y}-${String(k.m + 1).padStart(2, '0')}`;
      mapIn.set(key, 0);
      mapOut.set(key, 0);
    }

    for (const mv of movs) {
      const key = ymKey(mv.fecha);
      if (!mapIn.has(key)) continue;
      const amt = Number(mv.cantidad || 0);
      if (mv.tipo === 'INGRESO') mapIn.set(key, mapIn.get(key) + amt);
      else if (mv.tipo === 'EGRESO') mapOut.set(key, mapOut.get(key) + amt);
    }

    const labels = keys.map(k => `${monthLabelShort(k.m)} ${String(k.y).slice(-2)}`);
    const ingresos = keys.map(k => mapIn.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`));
    const egresos = keys.map(k => mapOut.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`));

    const datasets = [];

    if (chartMode === 'ALL' || chartMode === 'ING') {
      datasets.push({ label: 'Ingresos', data: ingresos, borderColor: '#5b8c5a', tension: 0.4 });
    }
    if (chartMode === 'ALL' || chartMode === 'EGR') {
      datasets.push({ label: 'Egresos', data: egresos, borderColor: '#a5744b', tension: 0.4 });
    }

    return { labels, datasets };
  }, [movs, currY, currM, monthsWindow, chartMode]);

  // Nueva gráfica: ventas por mes (número de albaranes)
  const ventasSeries = useMemo(() => {
    const keys = [];
    for (let i = monthsWindow - 1; i >= 0; i--) {
      const dt = new Date(currY, currM - i, 1);
      keys.push({ y: dt.getFullYear(), m: dt.getMonth() });
    }
    const map = new Map();
    for (const k of keys) map.set(`${k.y}-${String(k.m + 1).padStart(2, '0')}`, 0);

    for (const a of albaranes) {
      const key = ymKey(a.fecha);
      if (!map.has(key)) continue;
      map.set(key, map.get(key) + 1);
    }

    const labels = keys.map(k => `${monthLabelShort(k.m)} ${String(k.y).slice(-2)}`);
    const data = keys.map(k => map.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`));

    return {
      labels,
      datasets: [{ label: 'Albaranes', data, borderColor: '#4f46e5', tension: 0.35 }],
    };
  }, [albaranes, currY, currM, monthsWindow]);

  // Pie de estados de albaranes
  const pieData = useMemo(() => {
    const counts = { FIANZA: 0, ALMACEN: 0, RUTA: 0, ENTREGADO: 0 };
    for (const a of albaranes) {
      const e = (a.estado || 'FIANZA').toUpperCase();
      if (counts[e] === undefined) counts[e] = 0;
      counts[e] += 1;
    }
    const labels = ['Fianza', 'Almacén', 'Ruta', 'Entregado'];
    const data = [counts.FIANZA || 0, counts.ALMACEN || 0, counts.RUTA || 0, counts.ENTREGADO || 0];
    const backgroundColor = ['#d7e8cf', '#f3e3c8', '#cbd5e1', '#e2e8f0'];
    return { labels, datasets: [{ data, backgroundColor }] };
  }, [albaranes]);

  // Últimos 8 movimientos
  const ultimosMovs = useMemo(() => {
    const sorted = [...movs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id);
    return sorted.slice(0, 8);
  }, [movs]);

  const almacenTop = useMemo(() => {
    const list = [...almacen];
    list.sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
    return list.slice(0, 8);
  }, [almacen]);

  const chartOptionsMoney = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      y: { ticks: { callback: (v) => (typeof v === 'number' ? eur(v) : v) } },
    },
  };

  const chartOptionsCount = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { ticks: { precision: 0 } } },
  };

  async function marcarEntregado(id) {
    setSavingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`${API_URL}albaranes/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ENTREGADO' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`No se pudo marcar entregado: ${j.detail || res.statusText}`);
        return;
      }
      await Promise.all([reloadAlmacen(), reloadRuta(), reloadAlbaranes()]);
    } catch (e) {
      alert(`Error de red: ${e.message}`);
    } finally {
      setSavingIds(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  function toggleMode(next) {
    setChartMode(prev => (prev === next ? 'ALL' : next));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard · Tienda</h2>
          <div className="text-sm text-gray-600">
            {lastUpdated ? `Actualizado: ${lastUpdated.toLocaleString('es-ES')}` : 'Sin actualizar aún'}
            {refreshing && (
              <span className="ml-2 inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Refrescando…
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm" href="/movimientos">Movimientos</a>
          <a className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm" href="/albaranes">Albaranes</a>
          <a className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm" href="/transporte">Transporte</a>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard title="Ingresos (mes)" value={eur(ingresosMes)} delta={pctDelta(ingresosMes, ingresosPrev)} deltaLabel="vs mes anterior" />
            <StatCard title="Egresos (mes)" value={eur(egresosMes)} delta={pctDelta(egresosMes, egresosPrev)} deltaLabel="vs mes anterior" invertColors />
            <StatCard title="Ventas del mes" value={String(ventasMes)} delta={pctDelta(ventasMes, ventasPrev)} deltaLabel="vs mes anterior" />
            <StatCard title="Pedidos en almacén" value={String(pedidosAlmacen)} hint="Pendientes de salida" />
          </>
        )}
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl">
          <div className="font-semibold">Error al cargar el dashboard</div>
          <div className="text-sm mt-1">{err}</div>
        </div>
      )}

      {/* Gráficas */}
      {!err && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white p-4 rounded-xl shadow-sm self-start">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold">Ingresos / Egresos ({monthsWindow} meses)</h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={`px-2.5 py-1 rounded-lg border text-sm ${monthsWindow === 6 ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => setMonthsWindow(6)}
                  disabled={loading}
                >
                  6M
                </button>
                <button
                  className={`px-2.5 py-1 rounded-lg border text-sm ${monthsWindow === 12 ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => setMonthsWindow(12)}
                  disabled={loading}
                >
                  12M
                </button>

                {/* Dos botones (toggle): solo ingresos / solo egresos */}
                <button
                  className={`px-3 py-1 rounded-lg border text-sm ${
                    chartMode === 'ING' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleMode('ING')}
                  disabled={loading}
                  title="Mostrar solo ingresos (vuelve a ambos si lo desactivas)"
                >
                  Solo ingresos
                </button>
                <button
                  className={`px-3 py-1 rounded-lg border text-sm ${
                    chartMode === 'EGR' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleMode('EGR')}
                  disabled={loading}
                  title="Mostrar solo egresos (vuelve a ambos si lo desactivas)"
                >
                  Solo egresos
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-56 md:h-64 rounded-lg bg-gray-100 animate-pulse" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                  <div>
                    Mes actual: <span className="font-semibold text-gray-900">{eur(ingresosMes)}</span> ingresos ·{' '}
                    <span className="font-semibold text-gray-900">{eur(egresosMes)}</span> egresos
                  </div>
                  <div className="text-xs">
                    {lastUpdated ? `Datos hasta ${lastUpdated.toLocaleDateString('es-ES')}` : ''}
                  </div>
                </div>
                <div className="h-56 md:h-64">
                  <Line data={lineSeries} options={chartOptionsMoney} />
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm self-start">
            <h3 className="mb-3 text-base font-semibold">Estado de los albaranes</h3>
            {loading ? (
              <div className="h-56 md:h-64 rounded-lg bg-gray-100 animate-pulse" />
            ) : (
              <div className="h-56 md:h-64">
                <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nueva gráfica: Ventas por mes */}
      {!err && (
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-base font-semibold">Ventas por mes (albaranes)</h3>
            <div className="text-sm text-gray-600">{loading ? '…' : `Total albaranes: ${albaranes.length}`}</div>
          </div>
          {loading ? (
            <div className="h-56 md:h-64 rounded-lg bg-gray-100 animate-pulse" />
          ) : (
            <div className="h-56 md:h-64">
              <Line data={ventasSeries} options={chartOptionsCount} />
            </div>
          )}
        </div>
      )}

      {/* Últimos movimientos */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold">Últimos movimientos</h3>
          <a href="/movimientos" className="text-sm text-blue-600 hover:underline">Ver todo</a>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="p-2">Fecha</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Monto</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="p-3 text-sm text-gray-500">Cargando…</td></tr>
            )}
            {!loading && ultimosMovs.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-sm text-gray-500">No hay movimientos.</td></tr>
            )}
            {!loading && ultimosMovs.map(m => (
              <Row
                key={m.id}
                fecha={fmtDate(m.fecha)}
                tipo={m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                desc={m.concepto}
                monto={eur(m.cantidad)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Almacén (ALMACEN) */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold">Almacén · Pendientes de salida</h3>
          <div className="text-sm text-gray-600">{loading ? '…' : `${almacen.length} total`}</div>
        </div>

        <TablaPedidos
          rows={almacenTop}
          clientesMap={clientesMap}
          onEntregar={marcarEntregado}
          savingIds={savingIds}
        />

        <div className="mt-4 flex">
          <a
            href="/transporte"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <span className="text-base">🚚</span>
            Organizar transporte
          </a>
        </div>
      </div>

      {/* NOTA: Se ha eliminado la sección visual de “En ruta” */}
    </div>
  );
}

function TablaPedidos({ rows, clientesMap, onEntregar, savingIds }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="text-left border-b border-gray-200">
          <th className="p-2 w-20">ID</th>
          <th className="p-2 w-32">Fecha</th>
          <th className="p-2">Cliente</th>
          <th className="p-2 w-28">Total</th>
          <th className="p-2 w-48">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={5} className="p-3 text-sm text-gray-500">No hay pedidos.</td></tr>
        )}
        {rows.map(a => {
          const c = clientesMap.get(a.cliente_id);
          const saving = savingIds.has(a.id);
          return (
            <tr key={a.id} className="border-b border-gray-200">
              <td className="p-2">#{a.id}</td>
              <td className="p-2">{fmtDate(a.fecha)}</td>
              <td className="p-2">{c ? `${c.nombre} ${c.apellidos}` : `Cliente #${a.cliente_id}`}</td>
              <td className="p-2">{eur(a.total)}</td>
              <td className="p-2">
                <button
                  className={`px-3 py-1 rounded-lg border text-sm ${
                    saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onEntregar(a.id)}
                  disabled={saving}
                  title="Marcar como ENTREGADO"
                >
                  ✓ Entregado
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
      <div className="h-7 w-40 bg-gray-100 rounded mt-3 animate-pulse" />
      <div className="h-4 w-24 bg-gray-100 rounded mt-3 animate-pulse" />
    </div>
  );
}

function StatCard({ title, value, delta, deltaLabel, hint, invertColors = false }) {
  let deltaText = null;
  let deltaCls = 'text-gray-600';

  if (typeof delta === 'number') {
    if (Number.isNaN(delta) || !Number.isFinite(delta)) {
      deltaText = null;
    } else {
      const isUp = delta > 0;
      const good = invertColors ? !isUp : isUp;
      deltaCls = good ? 'text-green-700' : 'text-red-700';
      const sign = isUp ? '+' : '';
      deltaText = `${sign}${delta.toFixed(1)}%`;
    }
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm text-gray-600">{title}</h4>
        {deltaText && (
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-50 border ${deltaCls}`}>
            {deltaText}
          </div>
        )}
      </div>
      <p className="text-xl font-bold mt-2">{value}</p>
      <div className="mt-2 text-xs text-gray-500">{deltaText && deltaLabel ? deltaLabel : hint || ' '}</div>
    </div>
  );
}

function Row({ fecha, tipo, desc, monto }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="p-2">{fecha}</td>
      <td className="p-2">{tipo}</td>
      <td className="p-2">{desc}</td>
      <td className="p-2">{monto}</td>
    </tr>
  );
}

function pctDelta(curr, prev) {
  const c = Number(curr || 0);
  const p = Number(prev || 0);
  if (p === 0) return c === 0 ? 0 : null;
  return ((c - p) / p) * 100;
}
