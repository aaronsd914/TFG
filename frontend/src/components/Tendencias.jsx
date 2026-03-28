import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { sileo } from "sileo";
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
import { API_URL } from '../config.js';
import i18n from '../i18n.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function eur(n) {
  const v = Number(n || 0);
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return v.toLocaleString(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}
function isoDate(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultRange() {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { from: start.toISOString().slice(0, 10), to: end };
}

export default function TendenciasPage() {
  const { t } = useTranslation();
  // --- Rangos y resumen ---
  const [range, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [summary, setSummary] = useState(null);
  const summaryAbortRef = useRef(null);

  // --- Comparativa ---
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [compareErr, setCompareErr] = useState(null);
  const [compare, setCompare] = useState(null);
  const compareAbortRef = useRef(null);

  // --- Predicción ---
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  // --- Panel colapsable ---
  const [rangeOpen, setRangeOpen] = useState(false);

  // --- Chat ---
  const [messages, setMessages] = useState(() => [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        t('trends.aiGreeting'),
    },
  ]);  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef(null);

  // Cargar summary
  useEffect(() => {
    // Cancelar petición anterior si el usuario cambia el rango rápido
    try {
      summaryAbortRef.current?.abort?.();
    } catch {}
    const controller = new AbortController();
    summaryAbortRef.current = controller;

    const toastId = "tendencias-summary";
    const rangeLabel = `${range.from || t('trends.rangeStart')} → ${range.to || t('trends.rangeEnd')}`;

    const load = async () => {
      setLoading(true);
      setErr(null);

      // Loading toast (Sileo)
      try {
        sileo.show({
          id: toastId,
          state: "loading",
          title: t('trends.loadingToast'),
          description: t('trends.loadingToastDesc', { range: rangeLabel }),
          duration: null,
        });
      } catch {}

      try {
        const params = new URLSearchParams();
        if (range.from) params.set("date_from", range.from);
        if (range.to) params.set("date_to", range.to);

        const res = await fetch(`${API_URL}analytics/summary?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        setSummary(await res.json());

        try {
          sileo.success({
            id: toastId,
            title: t('trends.updatedToast'),
            description: t('trends.loadingToastDesc', { range: rangeLabel }),
            duration: 1400,
          });
        } catch {}
      } catch (e) {
        // Abort = cambio de rango, no mostramos error
        if (e?.name === "AbortError") {
          try {
            sileo.dismiss(toastId);
          } catch {}
          return;
        }
        setSummary(null);
        setErr(e?.message || String(e));

        try {
          sileo.error({
            id: toastId,
            title: t('trends.errorToast'),
            description: e?.message || String(e),
          });
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => {
      try {
        controller.abort();
      } catch {}
    };
  }, [range.from, range.to]);

  // Cargar compare si está activo
  useEffect(() => {
    const loadCompare = async () => {
      if (!compareEnabled) {
        setCompare(null);
        setCompareErr(null);
        try {
          compareAbortRef.current?.abort?.();
        } catch {}
        try {
          sileo.dismiss("tendencias-compare");
        } catch {}
        return;
      }

      // Cancelar petición anterior si el usuario cambia el rango rápido
      try {
        compareAbortRef.current?.abort?.();
      } catch {}
      const controller = new AbortController();
      compareAbortRef.current = controller;

      const toastId = "tendencias-compare";
      const rangeLabel = `${range.from || t('trends.rangeStart')} → ${range.to || t('trends.rangeEnd')}`;

      setCompareLoading(true);
      setCompareErr(null);

      // Loading toast (Sileo)
      try {
        sileo.show({
          id: toastId,
          state: "loading",
          title: t('trends.compareLoadingToast'),
          description: t('trends.loadingToastDesc', { range: rangeLabel }),
          duration: null,
        });
      } catch {}

      try {
        const params = new URLSearchParams();
        if (range.from) params.set("date_from", range.from);
        if (range.to) params.set("date_to", range.to);

        const res = await fetch(`${API_URL}analytics/compare?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
        setCompare(await res.json());

        try {
          sileo.success({
            id: toastId,
            title: t('trends.compareUpdatedToast'),
            description: t('trends.loadingToastDesc', { range: rangeLabel }),
            duration: 1400,
          });
        } catch {}
      } catch (e) {
        if (e?.name === "AbortError") {
          try {
            sileo.dismiss(toastId);
          } catch {}
          return;
        }
        setCompare(null);
        setCompareErr(e?.message || String(e));

        try {
          sileo.error({
            id: toastId,
            title: t('trends.compareErrorToast'),
            description: e?.message || String(e),
          });
        } catch {}
      } finally {
        setCompareLoading(false);
      }
    };
    loadCompare();
  }, [compareEnabled, range.from, range.to]);

  // Cargar previsión
  useEffect(() => {
    const loadPrediction = async () => {
      setPredLoading(true);
      try {
        const params = new URLSearchParams();
        if (range.from) params.set("date_from", range.from);
        if (range.to) params.set("date_to", range.to);
        params.set("n_months", "3");
        const res = await fetch(`${API_URL}analytics/predict?${params.toString()}`);
        if (res.ok) setPrediction(await res.json());
      } catch {
        // prediction is optional, ignore errors
      } finally {
        setPredLoading(false);
      }
    };
    loadPrediction();
  }, [range.from, range.to]);

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

  const fmtDMY = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  };

  const titleRange = useMemo(() => {
    if (!metrics?.range) return "";
    return `${fmtDMY(metrics.range.from)} → ${fmtDMY(metrics.range.to)}`;
  }, [metrics?.range]);

  const lastDays = (days) => {
    const today = new Date();
    const end = isoDate(today);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    setRange({ from: isoDate(start), to: end });
  };

  const exportPdf = async (includeCompare) => {
    const toastId = includeCompare ? "tendencias-export-full" : "tendencias-export-basic";
    try {
      sileo.show({
        id: toastId,
        state: "loading",
        title: includeCompare ? t('trends.exportFullLoading') : t('trends.exportBasicLoading'),
        duration: null,
      });
    } catch {}

    try {
      const params = new URLSearchParams();
      if (range.from) params.set("date_from", range.from);
      if (range.to) params.set("date_to", range.to);
      params.set("include_compare", includeCompare ? "true" : "false");

      const res = await fetch(`${API_URL}analytics/export/pdf?${params.toString()}`);
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

      try {
        sileo.success({
          id: toastId,
          title: includeCompare ? t('trends.exportFullSuccess') : t('trends.exportBasicSuccess'),
          description: includeCompare ? t('trends.exportFullDesc') : t('trends.exportBasicDesc'),
          duration: 1600,
        });
      } catch {}
    } catch (e) {
      try {
        sileo.error({
          id: toastId,
          title: includeCompare ? t('trends.exportFullError') : t('trends.exportBasicError'),
          description: e?.message || String(e),
        });
      } catch {}
    }
  };

  function clearChat() {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t('trends.clearChatMsg'),
      },
    ]);
  }

  async function onSend(e) {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    const toastId = "tendencias-ai";
    let ok = false;
    try {
      sileo.show({
        id: toastId,
        state: "loading",
        title: t('trends.aiRespondingToast'),
        duration: null,
      });
    } catch {}

    const userMsg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const trimmed = (arr) => arr.slice(-12);
      const chatPayload = {
        mode: "analytics",
        temperature: 0.2,
        date_from: range.from || null,
        date_to: range.to || null,
        messages: trimmed(
          [...messages, userMsg]
            .filter((x) => x.role === "user" || x.role === "assistant")
            .map((x) => ({ role: x.role, content: x.content }))
        ),
      };

      const res = await fetch(`${API_URL}ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
      const json = await res.json();

      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: json.answer || t('trends.noAnswer') },
      ]);
      ok = true;
    } catch (e2) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: `Error: ${e2?.message || String(e2)}` },
      ]);

      try {
        sileo.error({
          id: toastId,
          title: t('trends.aiErrorToast'),
          description: e2?.message || String(e2),
        });
      } catch {}
    } finally {
      setSending(false);
      if (ok) {
        try {
          sileo.dismiss(toastId);
        } catch {}
      }
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t('trends.title')}</h1>
            <p className="text-sm text-gray-600">{t('trends.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border bg-white px-4 py-2" data-testid="range-display">
              <span className="text-sm text-gray-600">{t('trends.range')}: </span>
              <span className="text-sm font-semibold">{titleRange || '—'}</span>
            </div>
            <button
              onClick={() => setRangeOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50"
              aria-expanded={rangeOpen}
              aria-label={t('trends.togglePanel')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={"w-4 h-4 transition-transform " + (rangeOpen ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {t('trends.togglePanel')}
            </button>
          </div>
        </div>

        {rangeOpen && (
          <div className="rounded-2xl border bg-white p-4 flex flex-wrap items-end gap-3" data-testid="range-panel">
            <div>
              <label className="block text-xs text-gray-600">{t('trends.from')}</label>
              <input
                type="date"
                className="border rounded-2xl px-3 py-2 bg-white"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">{t('trends.to')}</label>
              <input
                type="date"
                className="border rounded-2xl px-3 py-2 bg-white"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>

            <button className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50" onClick={() => lastDays(7)}>
              {t('trends.days7')}
            </button>
            <button className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50" onClick={() => lastDays(30)}>
              {t('trends.days30')}
            </button>
            <button className="text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50" onClick={() => lastDays(90)}>
              {t('trends.days90')}
            </button>

            <div className="flex items-center gap-3 ml-2">
              <button
                role="switch"
                aria-checked={compareEnabled}
                onClick={() => setCompareEnabled((v) => !v)}
                className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (compareEnabled ? "bg-green-500" : "bg-gray-300")}
              >
                <span className={"inline-block h-4 w-4 rounded-full bg-white transition-transform " + (compareEnabled ? "translate-x-6" : "translate-x-1")} />
              </button>
              <div className="text-sm">
                <span className="font-medium text-gray-700">{compareEnabled ? t('trends.compareOn') : t('trends.compareOff')}</span>
                <span className="block text-xs text-gray-500">{t('trends.compareDesc')}</span>
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => exportPdf(false)}
                title={t('trends.exportBasicTitle')}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-2xl border bg-white hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                {t('trends.exportBasic')}
              </button>
              <button
                onClick={() => exportPdf(true)}
                title={t('trends.exportFullTitle')}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-2xl btn-accent"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                {t('trends.exportFull')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="space-y-4">
          {loading && (
            <div className="rounded-2xl border bg-white p-4">{t('trends.loading')}</div>
          )}
          {!loading && err && (
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-red-700 font-semibold">{t('trends.error')}</div>
              <div className="text-red-700 whitespace-pre-wrap">{err}</div>
            </div>
          )}
          {!loading && !err && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <KPI label={t('trends.kpiIncome')} value={eur(avg.revenue)} />
                <KPI label={t('trends.kpiOrders')} value={String(avg.orders)} />
                <KPI label={t('trends.kpiAOV')} value={eur(avg.aov)} />
                <KPI label={t('trends.kpiAvgSpend')} value={eur(avg.avg_per_customer)} />
              </div>

              {compareEnabled && (
                <ComparePanel compareErr={compareErr} delta={delta} aiCompare={aiCompare} />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-2">{t('trends.topProducts')}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">{t('trends.colProduct')}</th>
                        <th className="text-right p-2">{t('trends.colUnits')}</th>
                        <th className="text-right p-2">{t('trends.colRevenue')}</th>
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
                            {t('trends.noData')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="font-semibold mb-2">{t('trends.salesByDay')}</h3>
                  <div className="space-y-2">
                    {sbd.slice(-14).map((r) => (
                      <div key={r.date} className="flex items-center justify-between text-sm border rounded-2xl px-3 py-2">
                        <span className="text-gray-700">{r.date}</span>
                        <span className="text-gray-700">{r.orders} {t('trends.ordersLabel')}</span>
                        <span className="font-semibold">{eur(r.revenue)}</span>
                      </div>
                    ))}
                    {sbd.length === 0 && <div className="text-sm text-gray-600">{t('trends.noData')}</div>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <h3 className="font-semibold mb-2">{t('trends.aiReport')}</h3>
                <RenderedMessage content={aiReport || t('trends.noAiReport')} />
                <div className="text-xs text-gray-500 mt-3">
                  {t('trends.aiReportFooter')}
                </div>
              </div>

              <PredictionSection prediction={prediction} loading={predLoading} t={t} />
            </>
          )}

      </div>

      {/* FLOATING CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          <div
            className={
              "mb-3 w-80 md:w-96 h-[520px] bg-white border rounded-2xl shadow-2xl flex flex-col overflow-hidden " +
              "transition-all duration-300 origin-bottom-right " +
              (chatOpen
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 translate-y-3 pointer-events-none")
            }
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <h3 className="font-semibold text-sm">{t('trends.aiAssistant')}</h3>
                <span className="text-xs text-gray-500">(Groq)</span>
              </div>
              <button
                onClick={clearChat}
                className="text-xs px-2 py-1 rounded-full border hover:bg-gray-100"
                title={t('trends.resetConversation')}
              >
                {t('trends.restartBtn')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((m) => (
                <ChatBubble key={m.id} role={m.role}>
                  <RenderedMessage content={m.content} />
                </ChatBubble>
              ))}
              {sending && (
                <ChatBubble role="assistant">
                  <span className="text-sm text-gray-500 italic">{t('trends.writing')}</span>
                </ChatBubble>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 shrink-0 border-t">
              <Chip onClick={() => setInput(t('trends.chipInput1'))}>{t('trends.chip1')}</Chip>
              <Chip onClick={() => setInput(t('trends.chipInput2'))}>{t('trends.chip2')}</Chip>
              <Chip onClick={() => setInput(t('trends.chipInput3'))}>{t('trends.chip3')}</Chip>
            </div>

            <div className="px-3 pb-3 pt-2 shrink-0">
              <form onSubmit={onSend} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('trends.chatPlaceholder')}
                  className="flex-1 border rounded-2xl px-3 py-2 bg-white text-sm"
                />
                <button
                  disabled={sending || !input.trim()}
                  className="px-3 py-2 rounded-2xl btn-accent disabled:opacity-50 text-sm"
                >
                  {t('trends.send')}
                </button>
              </form>
              <div className="text-xs text-gray-500 mt-1">{t('trends.aiContextNote')}</div>
            </div>
          </div>

        <button
          onClick={() => setChatOpen((o) => !o)}
          className={
            "flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200 active:scale-95 " +
            (chatOpen ? "bg-gray-700 text-white hover:bg-gray-600" : "btn-accent")
          }
        >
          {chatOpen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('trends.closeChat')}            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
              </svg>
              {t('trends.aiAssistant')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// Renderizador: texto + tablas + charts (Chart.js)
// ------------------------------

// Whitelist sanitizer — allows only safe inline/block HTML tags
function sanitizeHtml(html) {
  const allowed = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h3', 'h4', 'h5', 'span']);
  return String(html || '').replace(/<(\/?)(\w+)([^>]*)>/g, (_m, slash, tag) => {
    const t = tag.toLowerCase();
    return allowed.has(t) ? `<${slash}${t}>` : '';
  });
}

function RenderedMessage({ content }) {
  const { cleanText, charts } = extractCharts(content);

  // If the AI response contains HTML tags, render as sanitized HTML
  const hasHtml = /<(strong|b|em|i|ul|ol|li|p|h[3-5]|br)\b/i.test(cleanText);

  return (
    <div className="space-y-3">
      {hasHtml ? (
        <div
          className="text-sm leading-6 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:font-semibold [&_b]:font-semibold [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanText) }}
        />
      ) : (
        parseMarkdownTables(cleanText).map((b, idx) => {
          if (b.type === "text") {
            return (
              <div key={idx} className="whitespace-pre-wrap text-sm leading-6">
                {b.text}
              </div>
            );
          }
          if (b.type === "table") {
            return (
              <div key={idx} className="overflow-x-auto">
                <div className="min-w-[520px]">
                  <MarkdownTable table={b.table} />
                </div>
              </div>
            );
          }
          return null;
        })
      )}

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

function ComparePanel({ compareErr, delta, aiCompare }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('trends.comparison')}</h3>
      </div>

      {compareErr && (
        <div className="text-red-700 whitespace-pre-wrap">{compareErr}</div>
      )}
      {!compareErr && delta && (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">{t('trends.colMetric')}</th>
                <th className="text-right p-2">{t('trends.colCurrent')}</th>
                <th className="text-right p-2">{t('trends.colPrev')}</th>
                <th className="text-right p-2">Δ</th>
                <th className="text-right p-2">%</th>
              </tr>
            </thead>
            <tbody>
              <RowDelta label={t('trends.kpiIncome')} d={delta.revenue} money />
              <RowDelta label={t('trends.kpiOrders')} d={delta.orders} />
              <RowDelta label={t('trends.kpiAOV')} d={delta.aov} money />
            </tbody>
          </table>

          {aiCompare && (
            <div className="mt-3">
              <div className="font-semibold mb-1">{t('trends.aiReading')}</div>
              <RenderedMessage content={aiCompare} />
            </div>
          )}
        </>
      )}
      {!compareErr && !delta && (
        <div className="text-sm text-gray-600">{t('trends.noCompareData')}</div>
      )}
    </div>
  );
}

ComparePanel.propTypes = {
  compareErr: PropTypes.string,
  delta: PropTypes.object,
  aiCompare: PropTypes.string,
};

function ChartBlock({ chart }) {
  const { t } = useTranslation();
  const { type: rawType, title: chartTitle, data, options } = chart || {};
  const type = (rawType ?? "").toLowerCase();
  const title = options?.title?.text ?? chartTitle ?? t('trends.chartFallbackTitle');

  if (!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) {
    return (
      <div className="rounded-2xl border bg-white/60 p-3">
        <div className="font-semibold text-sm mb-1">{title}</div>
        <div className="text-xs text-gray-600">{t('trends.chartError')}</div>
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
ChartBlock.propTypes = {
  chart: PropTypes.shape({
    type: PropTypes.string,
    title: PropTypes.string,
    data: PropTypes.object,
    options: PropTypes.object,
  }),
};

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
// Prediction section
// ------------------------------
function PredictionSection({ prediction, loading, t }) {
  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-gray-500">{t('trends.predLoading')}</div>
      </div>
    );
  }
  if (!prediction || !prediction.forecast || prediction.forecast.length === 0) return null;

  const { historical = [], forecast } = prediction;
  const histSlice = historical.slice(-12);

  // Build combined labels
  const histLabels = histSlice.map((h) => h.month);
  const fcLabels = forecast.map((f) => f.month);
  const allLabels = [...histLabels, ...fcLabels];

  // Historical dataset (null for forecast positions)
  const histRevenue = [
    ...histSlice.map((h) => h.revenue),
    ...Array(fcLabels.length).fill(null),
  ];

  // Forecast dataset (null for historical positions, overlap last hist point so lines connect)
  const connectValue = histSlice.length > 0 ? histSlice[histSlice.length - 1].revenue : null;
  const fcRevenue = [
    ...Array(Math.max(0, histSlice.length - 1)).fill(null),
    connectValue,
    ...forecast.map((f) => f.predicted_revenue),
  ];

  const chartData = {
    labels: allLabels,
    datasets: [
      {
        label: t('trends.predHistorical'),
        data: histRevenue,
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59,130,246,0.08)",
        fill: false,
        tension: 0.2,
        pointRadius: 3,
        spanGaps: false,
      },
      {
        label: t('trends.predForecast'),
        data: fcRevenue,
        borderColor: "#22C55E",
        borderDash: [6, 4],
        backgroundColor: "rgba(34,197,94,0.08)",
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        spanGaps: false,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-4" data-testid="prediction-section">
      <div>
        <h3 className="font-semibold">{t('trends.predTitle')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('trends.predSubtitle')}</p>
      </div>

      <div style={{ height: 280 }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-green-50">
            <th className="text-left p-2 text-green-800">{t('trends.predTableMonth')}</th>
            <th className="text-right p-2 text-green-800">{t('trends.predTableRevenue')}</th>
            <th className="text-right p-2 text-green-800">{t('trends.predTableCI')}</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f) => (
            <tr key={f.month} className="border-b last:border-b-0">
              <td className="p-2 font-medium">{f.month}</td>
              <td className="p-2 text-right">{eur(f.predicted_revenue)}</td>
              <td className="p-2 text-right text-gray-600">
                {eur(f.lower_80)} – {eur(f.upper_80)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs text-gray-400">{t('trends.predMethod')}</div>
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
        (active ? "btn-accent-tab" : "bg-white hover:bg-gray-50")
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
