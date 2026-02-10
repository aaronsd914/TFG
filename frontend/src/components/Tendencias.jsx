import React, { useEffect, useMemo, useRef, useState } from "react";

// ✅ Chart.js render (ya lo tienes en package.json)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const API_URL = "http://localhost:8000/api";

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}
function isoDate(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TendenciasPage() {
  // --- Rangos y resumen ---
  const [range, setRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [summary, setSummary] = useState(null);

  // --- Comparativa ---
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareErr, setCompareErr] = useState(null);
  const [compare, setCompare] = useState(null);

  // --- Chat ---
  const [chatMode, setChatMode] = useState("analytics"); // analytics | general
  const [messages, setMessages] = useState(() => [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hola 👋. Puedes preguntarme por ventas, productos, clientes, comparativas por fechas, o lo que necesites.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  // Cargar summary
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const params = new URLSearchParams();
        if (range.from) params.set("date_from", range.from);
        if (range.to) params.set("date_to", range.to);

        const res = await fetch(`${API_URL}/analytics/summary?${params.toString()}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        setSummary(await res.json());
      } catch (e) {
        setSummary(null);
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range.from, range.to]);

  // Cargar compare si está activo
  useEffect(() => {
    const loadCompare = async () => {
      if (!compareEnabled) {
        setCompare(null);
        setCompareErr(null);
        return;
      }
      setCompareLoading(true);
      setCompareErr(null);
      try {
        const params = new URLSearchParams();
        if (range.from) params.set("date_from", range.from);
        if (range.to) params.set("date_to", range.to);

        const res = await fetch(`${API_URL}/analytics/compare?${params.toString()}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        setCompare(await res.json());
      } catch (e) {
        setCompare(null);
        setCompareErr(e?.message || String(e));
      } finally {
        setCompareLoading(false);
      }
    };
    loadCompare();
  }, [compareEnabled, range.from, range.to]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  const metrics = summary?.metrics;
  const aiReport = summary?.ai_report || "";

  const avg = metrics?.averages || { revenue: 0, orders: 0, aov: 0, avg_per_customer: 0 };
  const top = metrics?.top_products || [];
  const sbd = metrics?.sales_by_day || [];

  const delta = compare?.delta || null;
  const aiCompare = compare?.ai_compare_report || "";

  const titleRange = useMemo(() => {
    if (!metrics?.range) return "";
    return `${metrics.range.from} → ${metrics.range.to}`;
  }, [metrics?.range]);

  const lastDays = (days) => {
    const today = new Date();
    const end = isoDate(today);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    setRange({ from: isoDate(start), to: end });
  };

  const exportPdf = async (includeCompare) => {
    try {
      const params = new URLSearchParams();
      if (range.from) params.set("date_from", range.from);
      if (range.to) params.set("date_to", range.to);
      params.set("include_compare", includeCompare ? "true" : "false");

      const res = await fetch(`${API_URL}/analytics/export/pdf?${params.toString()}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `tendencias_${range.from || "auto"}_${range.to || "auto"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  function clearChat() {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Chat reiniciado. Pregúntame cualquier cosa 🙂",
      },
    ]);
  }

  async function onSend(e) {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      if (chatMode === "analytics") {
        const res = await fetch(`${API_URL}/ai/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            date_from: range.from || null,
            date_to: range.to || null,
          }),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        const json = await res.json();

        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: json.answer || "(sin respuesta)",
          },
        ]);
      } else {
        // Chat general con historial
        const trimmed = (arr) => arr.slice(-12);
        const payload = {
          mode: "general",
          temperature: 0.2,
          messages: trimmed(
            [...messages, userMsg]
              .filter((x) => x.role === "user" || x.role === "assistant" || x.role === "system")
              .map((x) => ({ role: x.role, content: x.content }))
          ),
        };

        const res = await fetch(`${API_URL}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        const json = await res.json();

        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", content: json.answer || "(sin respuesta)" },
        ]);
      }
    } catch (e2) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: `Error: ${e2?.message || String(e2)}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tendencias</h1>
          <p className="text-sm text-gray-600">Rango, comparativa, exportación PDF y asistente IA.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-600">Desde</label>
            <input
              type="date"
              className="border rounded-2xl px-3 py-2 bg-white"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Hasta</label>
            <input
              type="date"
              className="border rounded-2xl px-3 py-2 bg-white"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>

          <button className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50" onClick={() => lastDays(7)}>
            7 días
          </button>
          <button className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50" onClick={() => lastDays(30)}>
            30 días
          </button>
          <button className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50" onClick={() => lastDays(90)}>
            90 días
          </button>

          <div className="flex items-center gap-2 ml-2">
            <input
              id="compare"
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
            />
            <label htmlFor="compare" className="text-sm text-gray-700">
              Comparar periodo anterior
            </label>
          </div>

          <div className="flex gap-2 ml-2">
            <button
              onClick={() => exportPdf(false)}
              className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50"
            >
              Exportar PDF
            </button>
            <button
              onClick={() => exportPdf(true)}
              className="text-sm px-3 py-2 rounded-2xl bg-black text-white hover:opacity-90"
            >
              PDF + Comparativa
            </button>
          </div>
        </div>
      </div>

      {/* BODY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: dashboard */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-4">Cargando…</div>
          ) : err ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-red-700 font-semibold">Error</div>
              <div className="text-red-700 whitespace-pre-wrap">{err}</div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm text-gray-600">Rango</div>
                <div className="text-lg font-semibold">{titleRange}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <KPI label="Ingresos" value={eur(avg.revenue)} />
                <KPI label="Pedidos" value={String(avg.orders)} />
                <KPI label="AOV" value={eur(avg.aov)} />
                <KPI label="Gasto medio/cliente" value={eur(avg.avg_per_customer)} />
              </div>

              {compareEnabled && (
                <div className="rounded-2xl border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Comparativa</h3>
                    {compareLoading && <span className="text-sm text-gray-600">Cargando comparativa…</span>}
                  </div>

                  {compareErr ? (
                    <div className="text-red-700 whitespace-pre-wrap">{compareErr}</div>
                  ) : delta ? (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Métrica</th>
                            <th className="text-right p-2">Actual</th>
                            <th className="text-right p-2">Anterior</th>
                            <th className="text-right p-2">Δ</th>
                            <th className="text-right p-2">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          <RowDelta label="Ingresos" d={delta.revenue} money />
                          <RowDelta label="Pedidos" d={delta.orders} />
                          <RowDelta label="AOV" d={delta.aov} money />
                        </tbody>
                      </table>

                      {aiCompare && (
                        <div className="mt-3">
                          <div className="font-semibold mb-1">Lectura IA</div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">{aiCompare}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">No hay datos de comparativa.</div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-2">Top productos</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Unidades</th>
                        <th className="text-right p-2">Facturación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.slice(0, 10).map((t) => (
                        <tr key={t.product_id} className="border-b">
                          <td className="p-2">{t.name}</td>
                          <td className="p-2 text-right">{Number(t.qty || 0).toFixed(0)}</td>
                          <td className="p-2 text-right">{eur(t.revenue)}</td>
                        </tr>
                      ))}
                      {top.length === 0 && (
                        <tr>
                          <td className="p-2 text-gray-600" colSpan={3}>
                            Sin datos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-2">Ventas por día (últimos 14)</h3>
                  <div className="space-y-2">
                    {sbd.slice(-14).map((r) => (
                      <div key={r.date} className="flex items-center justify-between text-sm border rounded-2xl px-3 py-2">
                        <span className="text-gray-700">{r.date}</span>
                        <span className="text-gray-700">{r.orders} pedidos</span>
                        <span className="font-semibold">{eur(r.revenue)}</span>
                      </div>
                    ))}
                    {sbd.length === 0 && <div className="text-sm text-gray-600">Sin datos.</div>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <h3 className="font-semibold mb-2">Informe IA (resumen en pantalla)</h3>
                <div className="text-sm whitespace-pre-wrap">{aiReport || "(sin informe)"}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Para el informe completo “bien detallado”, usa Exportar PDF (el PDF incluye todo lo generado por la IA).
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: chat */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-white border rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Asistente IA</h3>
                  <span className="text-xs text-gray-500">(Groq)</span>
                </div>
                <button
                  onClick={clearChat}
                  className="text-sm px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
                  title="Reiniciar conversación"
                >
                  Reiniciar
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Pill active={chatMode === "analytics"} onClick={() => setChatMode("analytics")}>
                  Modo Tendencias
                </Pill>
                <Pill active={chatMode === "general"} onClick={() => setChatMode("general")}>
                  Modo General
                </Pill>
              </div>

              <div className="rounded-2xl border bg-white p-3 h-[420px] overflow-y-auto">
                <div className="space-y-3">
                  {messages.map((m) => (
                    <ChatBubble key={m.id} role={m.role}>
                      <RenderedMessage content={m.content} />
                    </ChatBubble>
                  ))}

                  {sending && (
                    <ChatBubble role="assistant">
                      <div className="text-sm text-gray-600">Pensando…</div>
                    </ChatBubble>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Chip onClick={() => setInput("¿Qué producto creció más en el rango?")}>Producto que más crece</Chip>
                  <Chip onClick={() => setInput("¿Hay días con picos anómalos de ventas? Describe posibles causas.")}>
                    Detectar picos
                  </Chip>
                  <Chip onClick={() => setInput("Dame 3 acciones para subir el ticket medio (AOV).")}>Subir AOV</Chip>
                </div>

                <form onSubmit={onSend} className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      chatMode === "analytics"
                        ? "Pregunta sobre las métricas… (comparativas, productos, etc.)"
                        : "Pregunta cualquier cosa…"
                    }
                    className="flex-1 border rounded-2xl px-3 py-2 bg-white"
                  />
                  <button
                    disabled={sending || !input.trim()}
                    className="px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </form>
                <div className="text-xs text-gray-500 mt-2">
                  {chatMode === "analytics"
                    ? "Modo Tendencias: la IA responde con el contexto del rango seleccionado."
                    : "Modo General: conversación libre."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// Renderizador: texto + tablas + charts (Chart.js)
// ------------------------------
function RenderedMessage({ content }) {
  const { cleanText, charts } = extractCharts(content);

  const blocks = parseMarkdownTables(cleanText);

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => {
        if (b.type === "text") {
          return (
            <div key={idx} className="whitespace-pre-wrap text-sm leading-6">
              {b.text}
            </div>
          );
        }
        if (b.type === "table") {
          return <MarkdownTable key={idx} table={b.table} />;
        }
        return null;
      })}

      {charts.length > 0 && (
        <div className="space-y-3">
          {charts.map((c, i) => (
            <ChartBlock key={i} chart={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChartBlock({ chart }) {
  const type = (chart?.type || "").toLowerCase();
  const title = chart?.options?.title?.text || chart?.title || "Gráfico";

  // Soportamos config estilo Chart.js: { type, data:{labels,datasets}, options }
  const data = chart?.data;
  const options = chart?.options || {};

  if (!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) {
    return (
      <div className="rounded-2xl border bg-white/60 p-3">
        <div className="font-semibold text-sm mb-1">{title}</div>
        <div className="text-xs text-gray-600">Gráfico no interpretable (config incompleta).</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white/60 p-3">
      <div className="font-semibold text-sm mb-2">{title}</div>
      <div style={{ height: 260 }}>
        {type === "line" ? <Line data={data} options={options} /> : <Bar data={data} options={options} />}
      </div>
    </div>
  );
}

function extractCharts(raw) {
  let text = String(raw || "");
  let charts = [];

  // 1) Intentar bloque ```json ... ```
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) {
    const maybe = fence[1].trim();
    const parsed = tryParseChartsJson(maybe);
    if (parsed.length > 0) {
      charts = charts.concat(parsed);
      text = text.replace(fence[0], "").trim();
    }
  }

  // 2) Intentar encontrar {"charts": ...} en texto
  const idx = text.indexOf('{"charts"');
  if (idx !== -1) {
    const candidate = text.slice(idx).trim();
    const parsed = tryParseChartsJson(candidate);
    if (parsed.length > 0) {
      charts = charts.concat(parsed);
      text = text.slice(0, idx).trim();
    }
  }

  return { cleanText: text, charts };
}

function tryParseChartsJson(jsonText) {
  // Limpieza de cosas típicas que rompen JSON:
  // - símbolos de moneda
  // - comas de miles en números (18,285.41 -> 18285.41)
  // - puntos/espacios raros
  let s = String(jsonText || "").trim();

  // Coger sólo el objeto si hay basura antes/después
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);

  // Quitar símbolos moneda sueltos en texto
  s = s.replace(/\$/g, "").replace(/€/g, "");

  // Quitar comas de miles dentro de números: 18,285.41 -> 18285.41
  s = s.replace(/(\d),(?=\d{3}(\D))/g, "$1");

  // A veces aparece “,” en vez de “.” en decimales: si viene "15497,70" suelto no lo arreglamos por riesgo.
  // (Si lo necesitas, lo hacemos con un parser más agresivo.)

  try {
    const obj = JSON.parse(s);
    if (obj && Array.isArray(obj.charts)) return obj.charts;
    return [];
  } catch {
    return [];
  }
}

function parseMarkdownTables(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let buf = [];

  const flushText = () => {
    if (buf.length) {
      blocks.push({ type: "text", text: buf.join("\n").trimEnd() });
      buf = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    // Detectar inicio tabla: header con | y separador con --- (al menos 2 columnas)
    if (looksLikeTableHeader(lines, i)) {
      flushText();
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseTable(tableLines);
      blocks.push({ type: "table", table });
      continue;
    }

    buf.push(lines[i]);
    i++;
  }

  flushText();
  // Si queda todo vacío, mantenemos un bloque texto
  if (blocks.length === 0) blocks.push({ type: "text", text: String(text || "") });
  return blocks;
}

function looksLikeTableHeader(lines, i) {
  const a = lines[i] || "";
  const b = lines[i + 1] || "";
  if (!a.includes("|")) return false;
  // separador tipo: | --- | --- |
  const isSep = b.replace(/\s/g, "").match(/^\|?(-+\|)+-+\|?$/);
  return Boolean(isSep);
}

function parseTable(tableLines) {
  const clean = tableLines.filter((l) => l.trim().length > 0);
  if (clean.length < 2) return { headers: [], rows: [] };

  const headers = splitRow(clean[0]);
  // saltamos la fila separadora
  const rows = clean.slice(2).map(splitRow);

  // normalizar columnas: misma longitud
  const cols = headers.length;
  const fixedRows = rows.map((r) => {
    const rr = r.slice(0, cols);
    while (rr.length < cols) rr.push("");
    return rr;
  });

  return { headers, rows: fixedRows };
}

function splitRow(line) {
  // Quita bordes | y separa
  let s = String(line || "").trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((x) => x.trim());
}

function MarkdownTable({ table }) {
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (!headers.length) return null;

  return (
    <div className="overflow-auto">
      <table className="min-w-[520px] w-full text-sm border rounded-2xl">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h, idx) => (
              <th key={idx} className="text-left p-2 border-b">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-b-0">
              {r.map((cell, j) => (
                <td key={j} className="p-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------
// UI helpers
// ------------------------------
function KPI({ label, value }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function RowDelta({ label, d, money }) {
  const fmt = (x) => (money ? eur(x) : String(x ?? 0));
  return (
    <tr className="border-b">
      <td className="p-2">{label}</td>
      <td className="p-2 text-right">{fmt(d.current)}</td>
      <td className="p-2 text-right">{fmt(d.previous)}</td>
      <td className="p-2 text-right">{fmt(d.diff)}</td>
      <td className="p-2 text-right">{d.pct}</td>
    </tr>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-sm px-3 py-1.5 rounded-full border " +
        (active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50")
      }
    >
      {children}
    </button>
  );
}

function Chip({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function ChatBubble({ role, children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          "max-w-[90%] rounded-2xl px-3 py-2 border " +
          (isUser ? "bg-black text-white border-black" : "bg-gray-50")
        }
      >
        {children}
      </div>
    </div>
  );
}
