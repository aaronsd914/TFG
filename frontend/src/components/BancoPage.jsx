// frontend/src/components/BancoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { sileo } from 'sileo';
import { API_URL } from '../config.js';
import ModalCenter from './ModalCenter.jsx';
import i18n from '../i18n.js';

const TIPO_META = {
  INGRESO: { className: 'bg-green-100 text-green-800 border-green-300' },
  EGRESO: { className: 'bg-red-100 text-red-800 border-red-300' },
};

function eur(n) {
  const v = Number(n || 0);
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return v.toLocaleString(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function formatEUR(n) {
  const v = Number(n || 0);
  return `${v.toFixed(2)} €`;
}

function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

function Chip({ label, onRemove }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm">
      {label}
      <button className="text-gray-500 hover:text-gray-700" onClick={onRemove} aria-label={`${t('common.clear')} ${label}`} type="button">{'\u00d7'}</button>
    </span>
  );
}
Chip.propTypes = {
  label: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default function BancoPage() {
  const { t } = useTranslation();

  /* ─── Stripe state ─── */
  const [stripeStatus, setStripeStatus] = useState({ configured: false, currency: 'eur' });
  const [stripeCheckouts, setStripeCheckouts] = useState([]);
  const [cobroModalOpen, setCobroModalOpen] = useState(false);
  const [stripeAmount, setStripeAmount] = useState('');
  const [stripeDesc, setStripeDesc] = useState('');
  const [stripeBusy, setStripeBusy] = useState(false);

  const stripeCanCreate = useMemo(() => {
    const a = Number(stripeAmount);
    return stripeStatus.configured && Number.isFinite(a) && a > 0;
  }, [stripeAmount, stripeStatus.configured]);

  /* ─── Movements state ─── */
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [tipo, setTipo] = useState('INGRESO');
  const [posting, setPosting] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [fechaErr, setFechaErr] = useState(false);
  const [conceptoErr, setConceptoErr] = useState(false);
  const [cantidadErr, setCantidadErr] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  /* ─── Load data ─── */
  async function loadStripeStatus() {
    try {
      const r = await fetch(`${API_URL}stripe/status`);
      const j = await r.json();
      setStripeStatus(j);
    } catch {
      setStripeStatus({ configured: false, currency: 'eur' });
    }
  }

  async function loadStripeCheckouts() {
    try {
      const r = await fetch(`${API_URL}stripe/checkouts?limit=50`);
      const j = await r.json();
      setStripeCheckouts(Array.isArray(j) ? j : []);
    } catch {
      setStripeCheckouts([]);
    }
  }

  async function fetchMovs() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`${API_URL}movimientos/get`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMovs(await res.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStripeStatus();
    loadStripeCheckouts();
    fetchMovs();
  }, []);

  /* ─── Stripe return handling ─── */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const stripeResult = p.get('stripe');
    const sessionId = p.get('session_id');
    if (!stripeResult) return;

    window.history.replaceState({}, '', '/banco');

    if (stripeResult === 'cancel') {
      sileo.warning({ title: t('bank.toastCancelled'), description: t('bank.toastCancelledDesc') });
      return;
    }

    if (stripeResult === 'success') {
      if (!sessionId) {
        sileo.success({ title: t('bank.toastCompleted'), description: t('bank.toastCompletedDesc') });
        loadStripeCheckouts();
        fetchMovs();
        return;
      }
      (async () => {
        try {
          await sileo.promise(
            async () => {
              const r = await fetch(`${API_URL}stripe/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
              });
              const data = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`);
              return data;
            },
            {
              loading: { title: t('bank.toastConfirming') },
              success: (data) => ({
                title: data.created ? t('bank.toastRegistered') : t('bank.toastAlreadyRegistered'),
                description: `${eur(data.amount)} · ${data.description || 'Stripe'}`,
              }),
              error: (e) => ({ title: t('bank.toastConfirmError'), description: e?.message || t('common.unknownError') }),
            }
          );
          await loadStripeCheckouts();
          await fetchMovs();
        } catch {
          // handled by sileo.promise
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Cobro modal (Stripe checkout) ─── */
  function openCobroModal() {
    setStripeAmount('');
    setStripeDesc('');
    setCobroModalOpen(true);
  }

  function closeCobroModal() {
    setCobroModalOpen(false);
  }

  async function createStripeCheckout() {
    if (!stripeCanCreate) return;
    setStripeBusy(true);
    try {
      const data = await sileo.promise(
        async () => {
          const r = await fetch(`${API_URL}stripe/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(Number(stripeAmount) * 100) / 100,
              description: stripeDesc || t('bank.descPlaceholder'),
            }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
          if (!j.url) throw new Error(t('bank.stripeNoUrl'));
          return j;
        },
        {
          loading: { title: t('bank.toastCreating') },
          success: { title: t('bank.toastRedirecting') },
          error: (e) => ({ title: t('bank.toastCreateError'), description: e?.message || t('common.error') }),
        }
      );
      window.location.href = data.url;
    } catch {
      // handled by sileo.promise
    } finally {
      setStripeBusy(false);
    }
  }

  /* ─── Add movement ─── */
  async function addMovimiento(e) {
    e.preventDefault();

    let hasErrors = false;
    if (!fecha) { setFechaErr(true); hasErrors = true; }
    if (!concepto.trim()) { setConceptoErr(true); hasErrors = true; }
    if (!cantidad || Number(cantidad) <= 0) { setCantidadErr(true); hasErrors = true; }

    if (hasErrors) {
      try {
        sileo.warning({
          title: t('movements.validationTitle'),
          description: t('movements.validationDesc'),
        });
      } catch { /* ignore */ }
      return;
    }

    try {
      setPosting(true);
      const payload = {
        date: fecha,
        description: concepto,
        amount: Number(cantidad),
        type: tipo,
      };
      const res = await fetch(`${API_URL}movimientos/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || t('bank.movementCreateError'));

      setMovs((prev) => [json, ...prev]);
      setConcepto('');
      setCantidad('');
      setTipo('INGRESO');
      setFechaErr(false);
      setConceptoErr(false);
      setCantidadErr(false);
      setFormModalOpen(false);
    } catch (error_) {
      try {
        sileo.error({
          title: t('bank.toastCreateError'),
          description: error_?.message || t('common.unknownError'),
        });
      } catch { /* ignore */ }
    } finally {
      setPosting(false);
    }
  }

  /* ─── Filtering & pagination ─── */
  const movsFiltrados = useMemo(() => {
    const query = (q || '').trim().toLowerCase();
    const dFrom = desde ? new Date(desde) : null;
    const dTo = hasta ? new Date(hasta) : null;

    return (movs || []).filter((mv) => {
      if (typeFilter !== 'TODOS' && mv.type !== typeFilter) return false;
      const d = new Date(mv.date);
      if (dFrom && d < dFrom) return false;
      if (dTo) {
        const end = new Date(dTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (!query) return true;
      const hay = `${mv.description || ''} ${mv.type || ''} ${mv.amount || ''} ${mv.date || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [movs, q, typeFilter, desde, hasta]);

  const totalPages = Math.max(1, Math.ceil(movsFiltrados.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginated = useMemo(
    () => movsFiltrados.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [movsFiltrados, clampedPage, pageSize]
  );

  useEffect(() => { setCurrentPage(1); }, [q, typeFilter, desde, hasta, pageSize]);

  /* ─── Monthly summary ─── */
  const resumen = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let ingresos = 0;
    let egresos = 0;
    for (const mv of movs) {
      const d = new Date(mv.date);
      if (d.getFullYear() === y && d.getMonth() === m) {
        if (mv.type === 'INGRESO') ingresos += Number(mv.amount || 0);
        else egresos += Number(mv.amount || 0);
      }
    }
    ingresos = Math.round(ingresos * 100) / 100;
    egresos = Math.round(egresos * 100) / 100;
    const balance = Math.round((ingresos - egresos) * 100) / 100;
    return { ingresos, egresos, balance, y, m: m + 1 };
  }, [movs]);

  /* ─── Render ─── */
  const activeCount = [typeFilter !== 'TODOS', !!desde, !!hasta].filter(Boolean).length;

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('bank.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFormModalOpen(true)}
            className="px-4 py-2 rounded-xl btn-accent text-sm font-semibold"
            type="button"
            data-testid="add-mov-btn"
          >
            + {t('movements.addMovement')}
          </button>
          <button
            data-testid="nuevo-cobro-btn"
            onClick={openCobroModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold btn-accent shadow-sm transition-colors"
          >
            💳 {t('bank.newChargeBtn')}
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div className="text-sm text-gray-500">{t('movements.ingresosSummary')} ({resumen.m}/{resumen.y})</div>
          <div className="text-2xl font-semibold">{formatEUR(resumen.ingresos)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div className="text-sm text-gray-500">{t('movements.egresosSummary')} ({resumen.m}/{resumen.y})</div>
          <div className="text-2xl font-semibold">{formatEUR(resumen.egresos)}</div>
        </div>
        <div className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 ${resumen.balance >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className="text-sm text-gray-500">{t('movements.balanceSummary')} ({resumen.m}/{resumen.y})</div>
          <div className={`text-2xl font-semibold ${resumen.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatEUR(resumen.balance)}
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('movements.searchPlaceholder')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white dark:bg-gray-800"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
        </div>
        <button
          type="button"
          onClick={() => setFiltersModalOpen(true)}
          className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50"
        >
          {t('common.filters')}{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {typeFilter !== 'TODOS' && (
            <Chip label={`${t('movements.typeLabel')}: ${typeFilter === 'INGRESO' ? t('movements.income') : t('movements.expense')}`} onRemove={() => setTypeFilter('TODOS')} />
          )}
          {desde && <Chip label={`${t('movements.dateFrom')}: ${desde}`} onRemove={() => setDesde('')} />}
          {hasta && <Chip label={`${t('movements.dateTo')}: ${hasta}`} onRemove={() => setHasta('')} />}
          <button
            type="button"
            className="text-sm text-gray-600 underline ml-1 hover:text-gray-900 transition-colors"
            onClick={() => { setTypeFilter('TODOS'); setDesde(''); setHasta(''); }}
          >
            {t('common.clear')}
          </button>
        </div>
      )}

      {/* Filters modal */}
      <ModalCenter isOpen={filtersModalOpen} onClose={() => setFiltersModalOpen(false)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('common.filters')}</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">{t('movements.typeLabel')}</label>
            <div className="flex gap-2 flex-wrap">
              {[['TODOS', t('movements.allTypes')], ['INGRESO', t('movements.income')], ['EGRESO', t('movements.expense')]].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTypeFilter(val)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${typeFilter === val ? 'btn-accent-tab' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('movements.dateFrom')}</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('movements.dateTo')}</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={() => { setTypeFilter('TODOS'); setDesde(''); setHasta(''); }}
          >
            {t('common.clear')}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl btn-accent"
            onClick={() => setFiltersModalOpen(false)}
          >
            {t('common.save')}
          </button>
        </div>
      </ModalCenter>

      {/* Movements list */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border-b">
              <div className="col-span-2">{t('movements.colDate')}</div>
              <div className="col-span-6">{t('movements.colConcept')}</div>
              <div className="col-span-2">{t('movements.colType')}</div>
              <div className="col-span-2">{t('movements.colAmount')}</div>
            </div>
            <ul>
              {loading && <li className="p-6 text-gray-500">{t('movements.loading')}</li>}
              {err && <li className="p-6 text-red-600">{err}</li>}
              {!loading && !err && movs.length === 0 && (
                <li className="p-6 text-gray-500">{t('movements.noMovements')}</li>
              )}
              {paginated.map((mv) => {
                const meta = TIPO_META[mv.type] || { className: 'bg-gray-100 text-gray-700 border-gray-300' };
                return (
                  <li key={mv.id} className="grid grid-cols-12 px-4 py-3 border-t">
                    <div className="col-span-2">{formatDate(mv.date)}</div>
                    <div className="col-span-6 truncate" title={mv.description}>{mv.description}</div>
                    <div className="col-span-2">
                      <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${meta.className}`}>
                        {mv.type === 'INGRESO' ? t('movements.income') : t('movements.expense')}
                      </span>
                    </div>
                    <div className="col-span-2">{formatEUR(mv.amount)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {!loading && !err && movsFiltrados.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">{t('movements.pageSizeLabel')}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm dark:bg-gray-800"
              data-testid="mov-page-size-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <button type="button" onClick={() => setCurrentPage(1)} disabled={clampedPage === 1} className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50" aria-label={t('common.firstPage')}>«</button>
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={clampedPage === 1} className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50" aria-label={t('common.prevPage')}>‹</button>
            <span className="px-3">{clampedPage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={clampedPage >= totalPages} className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50" aria-label={t('common.nextPage')}>›</button>
            <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={clampedPage >= totalPages} className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50" aria-label={t('common.lastPage')}>»</button>
          </div>
          <span className="text-sm text-gray-600">
            {t('movements.paginationInfo', { from: Math.min((clampedPage - 1) * pageSize + 1, movsFiltrados.length), to: Math.min(clampedPage * pageSize, movsFiltrados.length), total: movsFiltrados.length })}
          </span>
        </div>
      )}

      {/* Stripe Checkouts table */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-3" data-testid="banco-table-section">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('bank.recentCharges')}</h3>
          <span className="text-xs text-gray-500">{t('bank.recentChargesHint')}</span>
        </div>
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-[600px] w-full text-sm" data-testid="cobros-table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr className="border-b">
                <th className="text-left p-2">{t('bank.colDate')}</th>
                <th className="text-left p-2">{t('bank.colDesc')}</th>
                <th className="text-left p-2">{t('bank.colSession')}</th>
                <th className="text-right p-2">{t('bank.colAmount')}</th>
                <th className="text-left p-2">{t('bank.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {stripeCheckouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-gray-500" data-testid="cobros-empty">{t('bank.noCharges')}</td>
                </tr>
              ) : (
                stripeCheckouts.map((c) => (
                  <tr key={c.session_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700" data-testid="cobro-row">
                    <td className="p-2">{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                    <td className="p-2">{c.description || '—'}</td>
                    <td className="p-2 font-mono text-xs">{c.session_id}</td>
                    <td className="p-2 text-right font-medium">{eur(c.amount)}</td>
                    <td className="p-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg border text-xs bg-green-50 border-green-200 text-green-800">
                        {c.status || 'paid'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: New Stripe charge */}
      {cobroModalOpen && (
        <div className="fixed inset-0 z-50" data-testid="nuevo-cobro-modal">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 w-full h-full border-none p-0 cursor-default appearance-none"
            onClick={closeCobroModal}
            onKeyDown={(e) => { if (e.key === 'Escape') closeCobroModal(); }}
            tabIndex={-1}
            aria-label={t('common.close')}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t('bank.newChargeTitle')}</h2>
                <button
                  type="button"
                  onClick={closeCobroModal}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                  aria-label={t('common.close')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('bank.amountLabel')} (€)</label>
                  <input
                    data-testid="cobro-amount-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={stripeAmount}
                    onChange={(e) => setStripeAmount(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
                    placeholder={t('bank.amountPlaceholder')}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('bank.descLabel')}</label>
                  <input
                    data-testid="cobro-desc-input"
                    type="text"
                    value={stripeDesc}
                    onChange={(e) => setStripeDesc(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
                    placeholder={t('bank.descPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  data-testid="cobro-cancel-btn"
                  onClick={closeCobroModal}
                  className="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  {t('bank.btnCancel')}
                </button>
                <button
                  data-testid="cobro-submit-btn"
                  disabled={!stripeCanCreate || stripeBusy}
                  onClick={createStripeCheckout}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${!stripeCanCreate || stripeBusy ? 'bg-gray-400 cursor-not-allowed' : 'btn-accent'}`}
                >
                  {stripeBusy ? t('bank.toastCreating') : t('bank.btnCreateCharge')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add movement */}
      <ModalCenter isOpen={formModalOpen} onClose={() => { setFormModalOpen(false); setFechaErr(false); setConceptoErr(false); setCantidadErr(false); }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('movements.addMovement')}</h2>
        </div>

        <form onSubmit={addMovimiento} className="space-y-4" data-testid="mov-form">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('movements.formDate')} <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setFechaErr(false); }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${fechaErr ? 'border-red-500 focus:ring-red-300' : 'focus:ring-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('movements.formConcept')} <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder={t('movements.conceptPlaceholder')}
              value={concepto}
              onChange={(e) => { setConcepto(e.target.value); setConceptoErr(false); }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${conceptoErr ? 'border-red-500 focus:ring-red-300' : 'focus:ring-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('movements.formAmount')} <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setCantidadErr(false); }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${cantidadErr ? 'border-red-500 focus:ring-red-300' : 'focus:ring-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('movements.typeLabel')} <span className="text-red-600">*</span>
            </label>
            <div className="flex rounded-xl border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setTipo('INGRESO')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${tipo === 'INGRESO' ? 'btn-accent-tab' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {t('movements.income')}
              </button>
              <button
                type="button"
                onClick={() => setTipo('EGRESO')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${tipo === 'EGRESO' ? 'btn-accent-tab' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {t('movements.expense')}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={posting}
              className={`px-4 py-2 rounded-xl text-white ${posting ? 'bg-gray-400' : 'btn-accent'}`}
            >
              {posting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </ModalCenter>
    </div>
  );
}
