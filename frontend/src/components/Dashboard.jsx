import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { API_URL } from '../config.js';
import PropTypes from 'prop-types';

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}
function ymKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabelShort(index0, months) {
  return (months || [])[index0] || '';
}
function fmtDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-ES');
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const months = t('dashboard.months', { returnObjects: true });
  const [movs, setMovs] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [almacen, setAlmacen] = useState([]);
  const [_ruta, setRuta] = useState([]); // se mantiene para métricas/estados, aunque no se muestre sección
  const [clientes, setClientes] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  // UI
  const [monthsWindowMovs, setMonthsWindowMovs] = useState(6);
  const [monthsWindowVentas, setMonthsWindowVentas] = useState(6);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Gráfica principal: ALL | ING | EGR
  const [chartMode, setChartMode] = useState('ALL');

  const firstLoadRef = useRef(true);

  async function reloadAll() {
    try {
      if (firstLoadRef.current) setLoading(true);
      else setRefreshing(true);

      setErr(null);

      const [rMovs, rAlbs, rAlmacen, rRuta, rClientes, rInc] = await Promise.all([
        fetch(`${API_URL}movimientos/get`),
        fetch(`${API_URL}albaranes/get`),
        fetch(`${API_URL}transporte/almacen`),
        fetch(`${API_URL}transporte/ruta`),
        fetch(`${API_URL}clientes/get`),
        fetch(`${API_URL}incidencias/get`),
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
      setIncidencias(rInc.ok ? ((await rInc.json()) || []) : []);
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
      const d = new Date(m.date);
      if (d.getFullYear() === currY && d.getMonth() === currM) {
        if (m.type === 'INGRESO') ingresos += Number(m.amount || 0);
        else if (m.type === 'EGRESO') egresos += Number(m.amount || 0);
      }
    }
    return { ingresosMes: Math.round(ingresos * 100) / 100, egresosMes: Math.round(egresos * 100) / 100 };
  }, [movs, currY, currM]);

  const { ingresosPrev, egresosPrev } = useMemo(() => {
    let ingresos = 0, egresos = 0;
    for (const m of movs) {
      const d = new Date(m.date);
      if (d.getFullYear() === prevYM.y && d.getMonth() === prevYM.m) {
        if (m.type === 'INGRESO') ingresos += Number(m.amount || 0);
        else if (m.type === 'EGRESO') egresos += Number(m.amount || 0);
      }
    }
    return { ingresosPrev: Math.round(ingresos * 100) / 100, egresosPrev: Math.round(egresos * 100) / 100 };
  }, [movs, prevYM]);

  const ventasMes = useMemo(() => {
    let n = 0;
    for (const a of albaranes) {
      const d = new Date(a.date);
      if (d.getFullYear() === currY && d.getMonth() === currM) n += 1;
    }
    return n;
  }, [albaranes, currY, currM]);

  const ventasPrev = useMemo(() => {
    let n = 0;
    for (const a of albaranes) {
      const d = new Date(a.date);
      if (d.getFullYear() === prevYM.y && d.getMonth() === prevYM.m) n += 1;
    }
    return n;
  }, [albaranes, prevYM]);

  const pedidosAlmacen = almacen.length;

  // Serie ingresos/egresos (con filtros ING/EGR)
  const lineSeries = useMemo(() => {
    const keys = [];
    for (let i = monthsWindowMovs - 1; i >= 0; i--) {
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
      const key = ymKey(mv.date);
      if (!mapIn.has(key)) continue;
      const amt = Number(mv.amount || 0);
      if (mv.type === 'INGRESO') mapIn.set(key, mapIn.get(key) + amt);
      else if (mv.type === 'EGRESO') mapOut.set(key, mapOut.get(key) + amt);
    }

    const labels = keys.map(k => `${monthLabelShort(k.m, months)} ${String(k.y).slice(-2)}`);
    const ingresos = keys.map(k => mapIn.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`))
    const egresos = keys.map(k => mapOut.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`));

    const datasets = [];

    if (chartMode === 'ALL' || chartMode === 'ING') {
      datasets.push({ label: t('dashboard.datasetIncome'), data: ingresos, borderColor: '#5b8c5a', tension: 0.4 });
    }
    if (chartMode === 'ALL' || chartMode === 'EGR') {
      datasets.push({ label: t('dashboard.datasetExpenses'), data: egresos, borderColor: '#a5744b', tension: 0.4 });
    }

    return { labels, datasets };
  }, [movs, currY, currM, monthsWindowMovs, chartMode, i18n.language]);

  // Nueva gráfica: ventas por mes (número de albaranes)
  const ventasSeries = useMemo(() => {
    const keys = [];
    for (let i = monthsWindowVentas - 1; i >= 0; i--) {
      const dt = new Date(currY, currM - i, 1);
      keys.push({ y: dt.getFullYear(), m: dt.getMonth() });
    }
    const map = new Map();
    for (const k of keys) map.set(`${k.y}-${String(k.m + 1).padStart(2, '0')}`, 0);

    for (const a of albaranes) {
      const key = ymKey(a.date);
      if (!map.has(key)) continue;
      map.set(key, map.get(key) + 1);
    }

    const labels = keys.map(k => `${monthLabelShort(k.m, months)} ${String(k.y).slice(-2)}`);
    const data = keys.map(k => map.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`));

    return {
      labels,
      datasets: [{ label: t('dashboard.datasetDeliveries'), data, borderColor: '#4f46e5', tension: 0.35 }],
    };
  }, [albaranes, currY, currM, monthsWindowVentas, i18n.language]);

  // Pie de estados de albaranes
  const pieData = useMemo(() => {
    const counts = { FIANZA: 0, ALMACEN: 0, RUTA: 0, ENTREGADO: 0 };
    for (const a of albaranes) {
      const e = (a.status || 'FIANZA').toUpperCase();
      if (counts[e] === undefined) counts[e] = 0;
      counts[e] += 1;
    }
    const labels = [t('dashboard.stateFianza'), t('dashboard.stateAlmacen'), t('dashboard.stateRuta'), t('dashboard.stateEntregado')];
    const data = [counts.FIANZA || 0, counts.ALMACEN || 0, counts.RUTA || 0, counts.ENTREGADO || 0];
    const backgroundColor = ['#d7e8cf', '#f3e3c8', '#cbd5e1', '#e2e8f0'];
    return { labels, datasets: [{ data, backgroundColor }] };
  }, [albaranes, i18n.language]);

  // Últimos 8 movimientos
  const ultimosMovs = useMemo(() => {
    const sorted = [...movs].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
    return sorted.slice(0, 8);
  }, [movs]);

  const almacenTop = useMemo(() => {
    const list = [...almacen];
    list.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    return list.slice(0, 8);
  }, [almacen]);

  const chartOptionsMoney = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${eur(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: { ticks: { callback: (v) => (typeof v === 'number' ? eur(v) : v) } },
    },
  };

  const chartOptionsCount = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} ${ctx.parsed.y !== 1 ? t('dashboard.albaranesLabel') : t('dashboard.albaranLabel')}`,
        },
      },
    },
    scales: { y: { ticks: { precision: 0 } } },
  };

  function toggleMode(next) {
    setChartMode(prev => (prev === next ? 'ALL' : next));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('dashboard.title')}</h2>
          {refreshing && (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              {t('dashboard.refreshing')}
            </span>
          )}
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
            <StatCard title={t('dashboard.incomePeriod')} value={eur(ingresosMes)} delta={pctDelta(ingresosMes, ingresosPrev)} deltaLabel={t('dashboard.vsPrev')} />
            <StatCard title={t('dashboard.expensesPeriod')} value={eur(egresosMes)} delta={pctDelta(egresosMes, egresosPrev)} deltaLabel={t('dashboard.vsPrev')} invertColors />
            <StatCard title={t('dashboard.salesPeriod')} value={String(ventasMes)} delta={pctDelta(ventasMes, ventasPrev)} deltaLabel={t('dashboard.vsPrev')} />
            <StatCard title={t('dashboard.warehouseOrders')} value={String(pedidosAlmacen)} hint={t('dashboard.warehousePending')} />
            <StatCard title={t('dashboard.activeIncidents')} value={String(incidencias.length)} hint={t('dashboard.viewIncidents')} link="/incidencias" />
          </>
        )}
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl">
          <div className="font-semibold">{t('dashboard.loadError')}</div>
          <div className="text-sm mt-1">{err}</div>
        </div>
      )}



      {/* Gráficas */}
      {!err && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white p-4 rounded-xl shadow-sm self-start">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold">{t('dashboard.incomeExpenseChart', { months: monthsWindowMovs })}</h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={`px-2.5 py-1 rounded-lg border text-sm ${monthsWindowMovs === 6 ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => setMonthsWindowMovs(6)}
                  disabled={loading}
                >
                  6M
                </button>
                <button
                  className={`px-2.5 py-1 rounded-lg border text-sm ${monthsWindowMovs === 12 ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => setMonthsWindowMovs(12)}
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
                  title={t('dashboard.onlyIncomeTitle')}
                >
                  {t('dashboard.onlyIncome')}
                </button>
                <button
                  className={`px-3 py-1 rounded-lg border text-sm ${
                    chartMode === 'EGR' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleMode('EGR')}
                  disabled={loading}
                  title={t('dashboard.onlyExpensesTitle')}
                >
                  {t('dashboard.onlyExpenses')}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-56 md:h-64 rounded-lg bg-gray-100 animate-pulse" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                  <div>
                    {t('dashboard.currentMonth')} <span className="font-semibold text-gray-900">{eur(ingresosMes)}</span> {t('dashboard.incomeUnit')} ·{' '}
                    <span className="font-semibold text-gray-900">{eur(egresosMes)}</span> {t('dashboard.expensesUnit')}
                  </div>
                  <div className="text-xs">
                    {lastUpdated ? t('dashboard.dataUpTo', { date: lastUpdated.toLocaleDateString('es-ES') }) : ''}
                  </div>
                </div>
                <div className="h-56 md:h-64">
                  <Line data={lineSeries} options={chartOptionsMoney} />
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm self-start">
            <h3 className="mb-3 text-base font-semibold">{t('dashboard.orderStatus')}</h3>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
            <h3 className="text-base font-semibold">{t('dashboard.salesChart', { months: monthsWindowVentas })}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={`px-2.5 py-1 rounded-lg border text-sm ${monthsWindowVentas === 6 ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                onClick={() => setMonthsWindowVentas(6)}
                disabled={loading}
              >
                6M
              </button>
              <button
                className={`px-2.5 py-1 rounded-lg border text-sm ${monthsWindowVentas === 12 ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                onClick={() => setMonthsWindowVentas(12)}
                disabled={loading}
              >
                12M
              </button>
              <div className="text-sm text-gray-600">{loading ? '…' : t('dashboard.totalDeliveries', { count: albaranes.length })}</div>
            </div>
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
          <h3 className="text-base font-semibold">{t('dashboard.recentMovements')}</h3>
          <a
            href="/movimientos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-accent text-sm font-medium transition-colors"
          >
            {t('dashboard.viewAllMovements')}
          </a>
        </div>
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-[600px] w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="p-2">{t('dashboard.colDate')}</th>
                <th className="p-2">{t('dashboard.colType')}</th>
                <th className="p-2">{t('dashboard.colDesc')}</th>
                <th className="p-2">{t('dashboard.colAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="p-3 text-sm text-gray-500">{t('common.loading')}</td></tr>
              )}
              {!loading && ultimosMovs.length === 0 && (
                <tr><td colSpan={4} className="p-3 text-sm text-gray-500">{t('dashboard.noMovements')}</td></tr>
              )}
              {!loading && ultimosMovs.map(m => (
                <Row
                  key={m.id}
                  fecha={fmtDate(m.date)}
                  tipo={m.type === 'INGRESO' ? t('dashboard.incomeType') : t('dashboard.expenseType')}
                  ingreso={m.type === 'INGRESO'}
                  desc={m.description}
                  monto={eur(m.amount)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Almacén (ALMACEN) */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold">{t('dashboard.warehouseSection')}</h3>
          <div className="text-sm text-gray-600">{loading ? '…' : `${almacen.length} total`}</div>
        </div>

        <TablaPedidos
          rows={almacenTop}
          clientesMap={clientesMap}
        />

        <div className="mt-4 flex">
          <a
            href="/transporte"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-accent shadow-sm transition-colors"
          >
            {t('dashboard.organizeTransport')}
          </a>
        </div>
      </div>

      {/* NOTA: Se ha eliminado la sección visual de “En ruta” */}
      {/* Incidencias activas */}
      <div className="bg-white p-4 rounded-xl shadow-sm" data-testid="dashboard-incidencias-section">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold">{t('dashboard.incidenciasSection')}</h3>
          <div className="text-sm text-gray-600">
            {loading ? '…' : t('dashboard.incidenciasTotal', { count: incidencias.length })}
          </div>
        </div>
        {loading ? (
          <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ) : incidencias.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">{t('dashboard.noIncidencias')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[500px] w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="p-2 w-16">{t('dashboard.colID')}</th>
                  <th className="p-2 w-32">{t('dashboard.colDate')}</th>
                  <th className="p-2 w-20">{t('incidencias.colAlbaran')}</th>
                  <th className="p-2">{t('incidencias.colDesc')}</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.slice(0, 5).map((inc) => (
                  <tr key={inc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 text-sm">#{inc.id}</td>
                    <td className="p-2 text-sm">{fmtDate(inc.fecha_creacion)}</td>
                    <td className="p-2 text-sm">#{inc.albaran_id}</td>
                    <td className="p-2 text-sm truncate max-w-xs" title={inc.descripcion}>{inc.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex">
          <a
            href="/incidencias"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-accent shadow-sm transition-colors"
            data-testid="dashboard-incidencias-link"
          >
            {t('dashboard.viewIncidentsFull')}
          </a>
        </div>
      </div>    </div>
  );
}

function TablaPedidos({ rows, clientesMap }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[500px] w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="p-2 w-20">{t('dashboard.colID')}</th>
            <th className="p-2 w-32">{t('dashboard.colDate')}</th>
            <th className="p-2">{t('dashboard.colClient')}</th>
            <th className="p-2 w-28">{t('dashboard.colDNI')}</th>
            <th className="p-2 w-28">{t('dashboard.colTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="p-3 text-sm text-gray-500">{t('dashboard.noOrders')}</td></tr>
          )}
          {rows.map(a => {
            const c = clientesMap.get(a.customer_id);
            return (
              <tr
                key={a.id}
                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => { try { localStorage.setItem('albaran_open_id', String(a.id)); } catch {} window.location.href = '/albaranes'; }}
                title={`Ir al albarán #${a.id}`}
              >
                <td className="p-2">#{a.id}</td>
                <td className="p-2">{fmtDate(a.date)}</td>
                <td className="p-2">{c ? `${c.name} ${c.surnames}` : `Cliente #${a.customer_id}`}</td>
                <td className="p-2">{c?.dni || '—'}</td>
                <td className="p-2">{eur(a.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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

function getDeltaInfo(delta, invertColors) {
  if (typeof delta !== 'number' || Number.isNaN(delta) || !Number.isFinite(delta)) {
    return { deltaText: null, deltaCls: 'text-gray-600' };
  }
  const isUp = delta > 0;
  const good = invertColors ? !isUp : isUp;
  return {
    deltaText: `${isUp ? '+' : ''}${delta.toFixed(1)}%`,
    deltaCls: good ? 'text-green-700' : 'text-red-700',
  };
}

function StatCard({ title, value, delta, deltaLabel, hint, invertColors = false, link = null }) {
  const [displayed, setDisplayed] = useState('…');

  useEffect(() => {
    const numMatch = value.replace(/\./g, '').replace(',', '.').match(/-?[\d.]+/);
    const target = numMatch ? parseFloat(numMatch[0]) : null;
    if (target === null || target === 0) { setDisplayed(value); return; }
    const duration = 600;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setDisplayed(value.replace(numMatch[0], current.toLocaleString('es-ES', { maximumFractionDigits: 2 })));
      if (progress < 1) requestAnimationFrame(tick);
      else setDisplayed(value);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const { deltaText, deltaCls } = getDeltaInfo(delta, invertColors);
  let subLine = hint || ' ';
  if (deltaText && deltaLabel) subLine = deltaLabel;

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
      <p className="text-xl font-bold mt-2 tabular-nums">{displayed}</p>
      <div className="mt-2 text-xs text-gray-500">{subLine}</div>
      {link && (
        <a
          href={link}
          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
        >
          {hint} →
        </a>
      )}
    </div>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  delta: PropTypes.number,
  deltaLabel: PropTypes.string,
  hint: PropTypes.string,
  invertColors: PropTypes.bool,
  link: PropTypes.string,
};

function Row({ fecha, tipo, ingreso, desc, monto }) {
  const rowCls = ingreso
    ? 'bg-green-50 border-b border-green-100'
    : 'bg-red-50 border-b border-red-100';
  return (
    <tr className={rowCls}>
      <td className="p-2">{fecha}</td>
      <td className="p-2">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
          ingreso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>{tipo}</span>
      </td>
      <td className="p-2">{desc}</td>
      <td className="p-2 font-semibold">{monto}</td>
    </tr>
  );
}

function pctDelta(curr, prev) {
  const c = Number(curr || 0);
  const p = Number(prev || 0);
  if (p === 0) return c === 0 ? 0 : null;
  return ((c - p) / p) * 100;
}
