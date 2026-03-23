import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';

import { API_URL } from '../config.js';

const TIPO_META = {
  INGRESO: { label: 'Ingreso', className: 'bg-green-100 text-green-800 border-green-300' },
  EGRESO: { label: 'Egreso', className: 'bg-red-100 text-red-800 border-red-300' },
};

function formatEUR(n) {
  const v = Number(n || 0);
  return `${v.toFixed(2)} â‚¬`;
}
function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? 'â€”' : dt.toLocaleDateString();
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm">
      {label}
      <button className="text-gray-500 hover:text-gray-700" onClick={onRemove} aria-label={`Quitar ${label}`} type="button">Ã—</button>
    </span>
  );
}

function ModalCenter({ isOpen, onClose, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MovimientosPage() {
  const { t } = useTranslation();
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // filtros
  const [q, setQ] = useState('');
  const [typeFilter, setTipoFiltro] = useState('TODOS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // formulario nuevo movimiento
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [tipo, setTipo] = useState('INGRESO');
  const [posting, setPosting] = useState(false);

  // modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [fechaErr, setFechaErr] = useState(false);
  const [conceptoErr, setConceptoErr] = useState(false);
  const [cantidadErr, setCantidadErr] = useState(false);
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

  // âœ… Se actualiza siempre que entras en la pÃ¡gina
  useEffect(() => {
    fetchMovs();
  }, []);

  async function addMovimiento(e) {
    e.preventDefault();

    let hasErrors = false;
    if (!fecha) { setFechaErr(true); hasErrors = true; }
    if (!concepto.trim()) { setConceptoErr(true); hasErrors = true; }
    if (!cantidad || Number(cantidad) <= 0) { setCantidadErr(true); hasErrors = true; }

    if (hasErrors) {
      try {
        sileo.warning({
          title: 'Campos obligatorios',
          description: 'Rellena todos los campos correctamente.',
        });
      } catch {}
      return;
    }

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

      setMovs((prev) => [json, ...prev]);
      setConcepto('');
      setCantidad('');
      setTipo('INGRESO');
      setFechaErr(false);
      setConceptoErr(false);
      setCantidadErr(false);
      setFormModalOpen(false);
    } catch (e) {
      try {
        sileo.error({
          title: 'No se pudo crear el movimiento',
          description: e?.message || 'Error desconocido',
        });
      } catch {}
    } finally {
      setPosting(false);
    }
  }

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
      const hay = `${mv.description || ''} ${mv.type || ''} ${mv.amount || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [movs, q, typeFilter, desde, hasta]);

  // Resumen del mes actual
  const resumen = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0..11

    let ingresos = 0;
    let egresos = 0;
    for (const mv of movs) {
      const d = new Date(mv.date);
      if (d.getFullYear() === y && d.getMonth() === m) {
        if (mv.type === 'INGRESO') ingresos += Number(mv.amount || 0);
        else egresos += Number(mv.amount || 0);
      }
    }
    const balance = ingresos - egresos;
    return { ingresos, egresos, balance, y, m: m + 1 };
  }, [movs]);

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('movements.title')}</h1>
        <button
          onClick={() => setFormModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          type="button"
        >
          {t('movements.addMovement')}
        </button>
      </div>

      {/* Resumen mensual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm text-gray-500">
            {t('movements.ingresosSummary')} ({resumen.m}/{resumen.y})
          </div>
          <div className="text-2xl font-semibold">{formatEUR(resumen.ingresos)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm text-gray-500">
            {t('movements.egresosSummary')} ({resumen.m}/{resumen.y})
          </div>
          <div className="text-2xl font-semibold">{formatEUR(resumen.egresos)}</div>
        </div>
        <div className={`bg-white border rounded-2xl p-4 ${resumen.balance >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className="text-sm text-gray-500">
            {t('movements.balanceSummary')} ({resumen.m}/{resumen.y})
          </div>
          <div className={`text-2xl font-semibold ${resumen.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatEUR(resumen.balance)}
          </div>
        </div>
      </div>

      {/* BÃºsqueda + Filtros */}
      {(() => {
        const activeCount = [typeFilter !== 'TODOS', !!desde, !!hasta].filter(Boolean).length;
        return (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('movements.searchPlaceholder')}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">âŒ•</span>
              </div>
              <button
                type="button"
                onClick={() => setFiltersModalOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${activeCount > 0 ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M13 16h-2" />
                </svg>
                {t('common.filters')}{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>

            {/* Chips filtros activos */}
            {activeCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {typeFilter !== 'TODOS' && (
                  <Chip label={`${t('movements.typeLabel')}: ${typeFilter === 'INGRESO' ? t('movements.income') : t('movements.expense')}`} onRemove={() => setTipoFiltro('TODOS')} />
                )}
                {desde && <Chip label={`${t('movements.dateFrom')}: ${desde}`} onRemove={() => setDesde('')} />}
                {hasta && <Chip label={`${t('movements.dateTo')}: ${hasta}`} onRemove={() => setHasta('')} />}
                <button
                  type="button"
                  className="text-sm text-gray-600 underline ml-1 hover:text-gray-900 transition-colors"
                  onClick={() => { setTipoFiltro('TODOS'); setDesde(''); setHasta(''); }}
                >
                  {t('common.clear')}
                </button>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-800">{movsFiltrados.length}</span> movimientos.
            </div>

            {/* Modal filtros */}
            <ModalCenter isOpen={filtersModalOpen} onClose={() => setFiltersModalOpen(false)}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t('common.filters')}</h2>
                <button onClick={() => setFiltersModalOpen(false)} className="text-gray-500 hover:text-gray-700" type="button">{t('common.close')}</button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('movements.typeLabel')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {[['TODOS', 'Todos'], ['INGRESO', t('movements.income')], ['EGRESO', t('movements.expense')]].map(([val, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTipoFiltro(val)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${typeFilter === val ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('movements.dateFrom')}</label>
                    <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('movements.dateTo')}</label>
                    <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300"
                  onClick={() => { setTipoFiltro('TODOS'); setDesde(''); setHasta(''); }}
                >
                  {t('common.clear')}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
                  onClick={() => setFiltersModalOpen(false)}
                >
                  {t('common.save')}
                </button>
              </div>
            </ModalCenter>
          </>
        );
      })()}

      {/* Modal: AÃ±adir movimiento */}
      <ModalCenter isOpen={formModalOpen} onClose={() => { setFormModalOpen(false); setFechaErr(false); setConceptoErr(false); setCantidadErr(false); }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('movements.addMovement')}</h2>
          <button onClick={() => setFormModalOpen(false)} className="text-gray-500 hover:text-gray-700" type="button">
            {t('common.close')}
          </button>
        </div>

        <form onSubmit={addMovimiento} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Fecha <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setFechaErr(false); }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${fechaErr ? 'border-red-500 focus:ring-red-300' : 'focus:ring-gray-300'}`}
            />
            {fechaErr && <p className="text-red-500 text-xs mt-1">La fecha es obligatoria.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Concepto <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Concepto"
              value={concepto}
              onChange={(e) => { setConcepto(e.target.value); setConceptoErr(false); }}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${conceptoErr ? 'border-red-500 focus:ring-red-300' : 'focus:ring-gray-300'}`}
            />
            {conceptoErr && <p className="text-red-500 text-xs mt-1">El concepto es obligatorio.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cantidad (â‚¬) <span className="text-red-600">*</span>
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
            {cantidadErr && <p className="text-red-500 text-xs mt-1">Introduce una cantidad vÃ¡lida mayor que 0.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo <span className="text-red-600">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="INGRESO">{t('movements.income')}</option>
              <option value="EGRESO">{t('movements.expense')}</option>
            </select>
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
              className={`px-4 py-2 rounded-xl text-white ${posting ? 'bg-gray-400' : 'bg-black hover:opacity-90'}`}
            >
              {posting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </ModalCenter>

      {/* Listado */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[480px]">
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
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
          {movsFiltrados.map((mv) => {
            const meta = TIPO_META[mv.type] || { className: 'bg-gray-100 text-gray-700 border-gray-300' };
            return (
              <li key={mv.id} className="grid grid-cols-12 px-4 py-3 border-t">
                <div className="col-span-2">{formatDate(mv.date)}</div>
                <div className="col-span-6 truncate" title={mv.description}>{mv.description}</div>
                <div className="col-span-2">
                  <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${meta.className}`}>{mv.type === 'INGRESO' ? t('movements.income') : t('movements.expense')}</span>
                </div>
                <div className="col-span-2">{formatEUR(mv.amount)}</div>
              </li>
            );
          })}
        </ul>
        </div>
        </div>
      </div>
    </div>
  );
}
