import { useEffect, useMemo, useState } from 'react';
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
  const [enAlmacen, setEnAlmacen] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [rMovs, rAlbs, rAlmacen, rClientes] = await Promise.all([
          fetch(`${API_URL}movimientos/get`),
          fetch(`${API_URL}albaranes/get`),
          fetch(`${API_URL}transporte/almacen`),
          fetch(`${API_URL}clientes/get`),
        ]);
        if (!rMovs.ok) throw new Error(`Movimientos HTTP ${rMovs.status}`);
        if (!rAlbs.ok) throw new Error(`Albaranes HTTP ${rAlbs.status}`);
        // /transporte/almacen podría ser 404 en builds antiguos: tratamos como []
        const almacenData = rAlmacen.ok ? await rAlmacen.json() : [];
        if (!rClientes.ok) throw new Error(`Clientes HTTP ${rClientes.status}`);

        setMovs(await rMovs.json());
        setAlbaranes(await rAlbs.json());
        setEnAlmacen(Array.isArray(almacenData) ? almacenData : []);
        setClientes(await rClientes.json());
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
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

  const ventasMes = useMemo(() => {
    let n = 0;
    for (const a of albaranes) {
      const d = new Date(a.fecha);
      if (d.getFullYear() === currY && d.getMonth() === currM) n += 1;
    }
    return n;
  }, [albaranes, currY, currM]);

  const pedidosAlmacen = enAlmacen.length;

  // Serie 6 meses (ingresos/egresos)
  const lineSeries = useMemo(() => {
    const keys = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(currY, currM - i, 1);
      keys.push({ y: dt.getFullYear(), m: dt.getMonth() });
    }
    const mapIn = new Map(); const mapOut = new Map();
    for (const k of keys) {
      const key = `${k.y}-${String(k.m + 1).padStart(2, '0')}`;
      mapIn.set(key, 0); mapOut.set(key, 0);
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
    const egresos  = keys.map(k => mapOut.get(`${k.y}-${String(k.m + 1).padStart(2, '0')}`));
    return {
      labels,
      datasets: [
        { label: 'Ingresos', data: ingresos, borderColor: '#5b8c5a', tension: 0.4 },
        { label: 'Egresos',  data: egresos,  borderColor: '#a5744b', tension: 0.4 },
      ],
    };
  }, [movs, currY, currM]);

  // Pie de estados de albaranes
  const pieData = useMemo(() => {
    const counts = { FIANZA: 0, ALMACEN: 0, TRANSPORTE: 0, ENTREGADO: 0 };
    for (const a of albaranes) {
      const e = (a.estado || 'FIANZA').toUpperCase();
      if (counts[e] === undefined) counts[e] = 0;
      counts[e] += 1;
    }
    const labels = ['Fianza', 'Almacén', 'Transporte', 'Entregado'];
    const data = [counts.FIANZA || 0, counts.ALMACEN || 0, counts.TRANSPORTE || 0, counts.ENTREGADO || 0];
    const backgroundColor = ['#d7e8cf', '#f3e3c8', '#cbd5e1', '#e2e8f0'];
    return { labels, datasets: [{ data, backgroundColor }] };
  }, [albaranes]);

  // Últimos 8 movimientos
  const ultimosMovs = useMemo(() => {
    const sorted = [...movs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id);
    return sorted.slice(0, 8);
  }, [movs]);

  // Albaranes en almacén (pendientes): ya lo trae /transporte/almacen
  // Mostramos los 8 más cercanos por fecha (ascendente, ya vienen así del backend normalmente)
  const enAlmacenTop = useMemo(() => {
    const list = [...enAlmacen];
    list.sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
    return list.slice(0, 8);
  }, [enAlmacen]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Ingresos (mes)" value={eur(ingresosMes)} />
        <Card title="Egresos (mes)" value={eur(egresosMes)} />
        <Card title="Ventas del mes" value={String(ventasMes)} />
        <Card title="Pedidos en almacén" value={String(pedidosAlmacen)} />
      </div>

      {loading && <div className="text-gray-500">Cargando datos del dashboard…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {/* Gráficas */}
      {!loading && !err && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Line */}
          <div className="bg-white p-4 rounded-xl shadow-sm self-start">
            <h3 className="mb-3 text-base font-semibold">Ingresos vs Egresos (6 meses)</h3>
            <div className="h-56 md:h-64">
              <Line data={lineSeries} options={chartOptions} />
            </div>
          </div>

          {/* Pie */}
          <div className="bg-white p-4 rounded-xl shadow-sm self-start">
            <h3 className="mb-3 text-base font-semibold">Estado de los albaranes</h3>
            <div className="h-56 md:h-64">
              <Pie data={pieData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Tabla: Últimos movimientos */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="mb-3 text-base font-semibold">Últimos movimientos</h3>
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
            {ultimosMovs.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-sm text-gray-500">No hay movimientos.</td></tr>
            )}
            {ultimosMovs.map(m => (
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

      {/* Tabla: Albaranes en almacén (pendientes de entrega) */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <h3 className="mb-3 text-base font-semibold">Almacén · Pendientes de entrega</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="p-2 w-24">ID</th>
              <th className="p-2 w-32">Fecha</th>
              <th className="p-2">Cliente</th>
              <th className="p-2 w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {enAlmacenTop.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-sm text-gray-500">No hay pedidos en almacén.</td></tr>
            )}
            {enAlmacenTop.map(a => {
              const c = clientesMap.get(a.cliente_id);
              return (
                <tr key={a.id} className="border-b border-gray-200">
                  <td className="p-2">#{a.id}</td>
                  <td className="p-2">{fmtDate(a.fecha)}</td>
                  <td className="p-2">
                    {c ? `${c.nombre} ${c.apellidos}` : `Cliente #${a.cliente_id}`}
                  </td>
                  <td className="p-2">{eur(a.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Enlace rápido */}
        <div className="mt-3 text-sm">
          <a href="/albaranes" className="text-blue-600 hover:underline">Ver todos los albaranes</a>
          <span className="mx-2">·</span>
          <a href="/transporte" className="text-blue-600 hover:underline">Organizar transporte</a>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h4 className="text-sm text-gray-600">{title}</h4>
      <p className="text-xl font-bold mt-2">{value}</p>
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
