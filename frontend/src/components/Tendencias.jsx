import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart as LChart, Line, XAxis, YAxis, Tooltip,
  BarChart as BChart, Bar, CartesianGrid
} from "recharts";

const API_URL = "http://localhost:8000/api";

export default function Tendencias() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Chat IA
  const [q, setQ] = useState("");
  const [ai, setAi] = useState({ answer: "", charts: [] });
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr(null);
      try {
        const params = new URLSearchParams();
        if (from) params.set("date_from", from);
        if (to) params.set("date_to", to);
        const res = await fetch(`${API_URL}/analytics/summary?${params.toString()}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        setData(await res.json());
      } catch (e) {
        setData(null); setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [from, to]);

  async function askAI(e) {
    e?.preventDefault?.();
    if (!q.trim()) return;
    setAsking(true);
    try {
      const body = { question: q.trim(), date_from: from || null, date_to: to || null };
      const res = await fetch(`${API_URL}/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
      const json = await res.json();
      setAi({ answer: json.answer, charts: json.charts || [] });
    } catch (e) {
      setAi({ answer: `Error al consultar la IA: ${e.message}`, charts: [] });
    } finally {
      setAsking(false);
    }
  }

  if (loading) return <div className="p-6">Cargando…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {String(err)}</div>;
  if (!data) return null;

  const metrics = data?.metrics ?? {
    sales_by_day: [], top_products: [],
    averages: { orders: 0, revenue: 0, aov: 0, avg_per_customer: 0 },
    basket_pairs: [], rfm: { summary: {} }
  };
  const ai_report = data?.ai_report ?? "";
  const sbd = metrics.sales_by_day;
  const top = metrics.top_products;
  const avg = metrics.averages;
  const seg = metrics.rfm?.summary ?? {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm">Desde</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-3 py-2"/>
        </div>
        <div>
          <label className="block text-sm">Hasta</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2"/>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KPI label="Ingresos" value={eur(avg.revenue)} />
        <KPI label="Pedidos" value={avg.orders} />
        <KPI label="Ticket medio (AOV)" value={eur(avg.aov)} />
        <KPI label="Gasto medio/cliente" value={eur(avg.avg_per_customer)} />
      </div>

      {/* Ventas por día */}
      <Card title="Ventas por día">
        <LineChart data={sbd} xKey="date" yKey="revenue" />
      </Card>

      {/* Top productos */}
      <Card title="Top productos por facturación">
        <BarChart data={top} xKey="name" yKey="revenue" />
      </Card>

      {/* Segmentación RFM */}
      <Card title="Segmentación RFM">
        <ul className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(seg).map(([k,v])=>(
            <li key={k} className="bg-gray-50 rounded-xl p-3 border">
              <div className="text-sm text-gray-600">{k}</div>
              <div className="text-xl font-semibold">{v}</div>
            </li>
          ))}
          {Object.keys(seg).length === 0 && <p className="text-gray-500">Sin datos</p>}
        </ul>
      </Card>

      {/* Cestas/pares */}
      <Card title="Productos co-comprados (pares)">
        <div className="overflow-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Producto A</th>
                <th className="text-left p-2">Producto B</th>
                <th className="text-right p-2">Support</th>
                <th className="text-right p-2">Confidence</th>
                <th className="text-right p-2">Lift</th>
              </tr>
            </thead>
            <tbody>
              {(metrics.basket_pairs || []).map((p,i)=>(
                <tr key={i} className="border-b">
                  <td className="p-2">{p.a_name}</td>
                  <td className="p-2">{p.b_name}</td>
                  <td className="p-2 text-right">{p.support}</td>
                  <td className="p-2 text-right">{p.confidence.toFixed(2)}</td>
                  <td className="p-2 text-right">{p.lift.toFixed(2)}</td>
                </tr>
              ))}
              {(!metrics.basket_pairs || metrics.basket_pairs.length===0) && (
                <tr><td colSpan={5} className="p-3 text-gray-500">No hay pares con suficiente soporte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Informe IA (automático del summary) */}
      <Card title="Informe de IA (auto)">
        <article className="prose max-w-none whitespace-pre-wrap">{ai_report}</article>
      </Card>

      {/* Asistente IA (preguntas) */}
      <Card title="Haz una pregunta a la IA">
        <form onSubmit={askAI} className="flex gap-2">
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Ej.: ¿Qué producto creció más este mes? ¿Comparar abril y mayo?"
            className="flex-1 border rounded px-3 py-2"
          />
          <button disabled={asking} className="px-4 py-2 rounded bg-black text-white">
            {asking ? "Pensando…" : "Preguntar"}
          </button>
        </form>

        {ai.answer && (
          <div className="mt-4 space-y-4">
            <div className="whitespace-pre-wrap">{ai.answer}</div>
            {(ai.charts || []).map((c, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-2">{c.title || "Gráfico"}</h4>
                {c.type === "bar" ? (
                  <BarChart data={c.data || []} xKey={c.xKey || "x"} yKey={c.yKey || "y"} />
                ) : (
                  <LineChart data={c.data || []} xKey={c.xKey || "x"} yKey={c.yKey || "y"} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function KPI({label, value}) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
function Card({title, children}) {
  return (
    <section className="bg-white border rounded-2xl p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}
const eur = (n)=> `${Number(n||0).toFixed(2)} €`;

function LineChart({data, xKey, yKey}) {
  return (
    <div style={{width: "100%", height: 280}}>
      <ResponsiveContainer>
        <LChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} dot={false} />
        </LChart>
      </ResponsiveContainer>
    </div>
  );
}
function BarChart({data, xKey, yKey}) {
  return (
    <div style={{width: "100%", height: 280}}>
      <ResponsiveContainer>
        <BChart data={data} margin={{left: 10, right: 10}}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} interval={0} angle={-20} textAnchor="end" height={60}/>
          <YAxis />
          <Tooltip />
          <Bar dataKey={yKey} />
        </BChart>
      </ResponsiveContainer>
    </div>
  );
}
