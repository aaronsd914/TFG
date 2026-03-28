import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import { useTranslation } from 'react-i18next';

import { API_URL } from '../config.js';
import ConfirmDeleteModal from './ConfirmDeleteModal.jsx';
import ModalCenter, { CloseIcon, closeButtonClass } from './ModalCenter.jsx';

// ===== Helpers =====
function useDebouncedValue(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm">
      {label}
      <button
        className="text-gray-500 hover:text-gray-700"
        onClick={onRemove}
        type="button"
        aria-label={`Quitar ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function safeNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function formatDateISO(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}
function formatEUR(n) {
  return `${safeNumber(n).toFixed(2)} €`;
}
function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

const ESTADO_META = {
  FIANZA:    { label: 'Fianza',    className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ALMACEN:   { label: 'Almacén',   className: 'bg-sky-50 text-sky-800 border-sky-200' },
  RUTA:      { label: 'Ruta',      className: 'bg-violet-50 text-violet-800 border-violet-200' },
  ENTREGADO: { label: 'Entregado', className: 'bg-green-50 text-green-800 border-green-200' },
};

// ===== Página =====
export default function AlbaranesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const stateLabel = (key) => ({
    FIANZA: t('albaranes.stateFianza'),
    ALMACEN: t('albaranes.stateAlmacen'),
    RUTA: t('albaranes.stateRuta'),
    ENTREGADO: t('albaranes.stateEntregado'),
  })[key] || key;

  const [albaranes, setAlbaranes] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // buscador + filtros
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 150);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('fecha_desc');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState([]);

  const [totalRange, setTotalRange] = useState([0, 0]);
  const [totalDefaults, setTotalDefaults] = useState([0, 0]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


  // detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [detailTab, setDetailTab] = useState('albaran'); // 'albaran' | 'cliente'

  // edición de albarán
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // edición de líneas
  const [products, setProducts] = useState([]);
  const [linesEditing, setLinesEditing] = useState(false);
  const [linesForm, setLinesForm] = useState([]);
  const [linesSaving, setLinesSaving] = useState(false);
  const [linesError, setLinesError] = useState(null);

  // ✅ ID pendiente para abrir desde Clientes
  const [pendingOpenId, setPendingOpenId] = useState(null);

  // paginación
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // eliminar albarán
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ Ir a detalle del cliente en ClientesPage
  function goToCliente(clienteId) {
    if (!clienteId) return;
    try {
      localStorage.setItem('cliente_open_id', String(clienteId));
    } catch {}
    // Ajusta esta ruta si tu ClientesPage usa otra (ej: "/clientes" o "/clientes-page")
    navigate('/clientes');
  }

  // carga inicial
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [resAlb, resCli, resProd] = await Promise.all([
          fetch(`${API_URL}albaranes/get`),
          fetch(`${API_URL}clientes/get`),
          fetch(`${API_URL}productos/get`),
        ]);
        if (!resAlb.ok) throw new Error(`Albaranes HTTP ${resAlb.status}`);
        if (!resCli.ok) throw new Error(`Clientes HTTP ${resCli.status}`);

        const alb = await resAlb.json();
        const cli = await resCli.json();
        const prod = resProd.ok ? await resProd.json() : [];

        const albList = alb || [];
        setAlbaranes(albList);
        setClientes(cli || []);
        setProducts(prod || []);

        const totals = albList.map((a) => safeNumber(a.total));
        if (totals.length) {
          const min = Math.floor(Math.min(...totals));
          const max = Math.ceil(Math.max(...totals));
          setTotalDefaults([min, max]);
          setTotalRange([min, max]);
        } else {
          setTotalDefaults([0, 0]);
          setTotalRange([0, 0]);
        }

        setDateFrom('');
        setDateTo('');
      } catch (e) {
        const msg = e?.message || 'Error desconocido';
        setError(msg);

        // ✅ Toast Sileo (error de carga principal)
        sileo.error({
          title: 'Error cargando albaranes',
          description: msg,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const clientesById = useMemo(() => {
    const m = new Map();
    clientes.forEach((c) => m.set(c.id, c));
    return m;
  }, [clientes]);

  const productsById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const domains = useMemo(() => {
    const set = new Set();
    clientes.forEach((c) => {
      const d = (c.email || '').split('@')[1];
      if (d) set.add(d.toLowerCase());
    });
    return Array.from(set).sort();
  }, [clientes]);

  function setTotalRangeSafe(nextMin, nextMax) {
    const defaultMax = totalDefaults[1] ?? 0;
    let min = Number.isFinite(Number(nextMin)) ? Number(nextMin) : 0;
    let max = Number.isFinite(Number(nextMax)) ? Number(nextMax) : defaultMax;

    min = Math.max(0, min);
    max = Math.max(0, max);
    if (max < min) max = min;

    setTotalRange([min, max]);
  }

  const filtered = useMemo(() => {
    let list = [...albaranes];

    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter((a) => {
        const cliente = clientesById.get(a.customer_id);
        const enCliente =
          cliente &&
          (`${cliente.name || ''} ${cliente.surnames || ''}`.toLowerCase().includes(t) ||
            (cliente.email || '').toLowerCase().includes(t) ||
            (cliente.dni || '').toLowerCase().includes(t));

        return String(a.id).includes(t) || enCliente;
      });
    }

    list = list.filter((a) => {
      const tot = safeNumber(a.total);
      return tot >= totalRange[0] && tot <= totalRange[1];
    });

    list = list.filter((a) => {
      const f = formatDateISO(a.date);
      if (dateFrom && f < dateFrom) return false;
      if (dateTo && f > dateTo) return false;
      return true;
    });

    if (selectedDomains.length) {
      list = list.filter((a) => {
        const cli = clientesById.get(a.customer_id);
        const dom = (cli?.email || '').split('@')[1]?.toLowerCase() || '';
        return selectedDomains.includes(dom);
      });
    }

    if (selectedEstados.length) {
      list = list.filter((a) => selectedEstados.includes(a.status));
    }

    switch (sort) {
      case 'fecha_desc':
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'fecha_asc':
        list.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'total_desc':
        list.sort((a, b) => safeNumber(b.total) - safeNumber(a.total));
        break;
      case 'total_asc':
        list.sort((a, b) => safeNumber(a.total) - safeNumber(b.total));
        break;
      default:
        break;
    }

    return list;
  }, [albaranes, clientesById, q, totalRange, dateFrom, dateTo, selectedDomains, selectedEstados, sort]);

  const defaultMinTotal = totalDefaults[0] ?? 0;
  const defaultMaxTotal = totalDefaults[1] ?? 0;

  const activeChips = [
    ...(q ? [{ key: 'q', label: `${t('common.search')}: "${q}"`, onRemove: () => setQuery('') }] : []),
    ...((dateFrom || dateTo)
      ? [
          {
            key: 'fechas',
            label: `${t('albaranes.colDate')} ${dateFrom || '—'} → ${dateTo || '—'}`,
            onRemove: () => {
              setDateFrom('');
              setDateTo('');
            },
          },
        ]
      : []),
    ...((totalRange[0] !== defaultMinTotal || totalRange[1] !== defaultMaxTotal)
      ? [
          {
            key: 'total',
            label: `${t('albaranes.colTotal')} ${totalRange[0]}–${totalRange[1]} €`,
            onRemove: () => setTotalRange([defaultMinTotal, defaultMaxTotal]),
          },
        ]
      : []),
    ...selectedDomains.map((dom) => ({
      key: `dom-${dom}`,
      label: `${t('albaranes.clientDomains')}: ${dom}`,
      onRemove: () => setSelectedDomains((prev) => prev.filter((d) => d !== dom)),
    })),
    ...selectedEstados.map((es) => ({
      key: `est-${es}`,
      label: `${t('albaranes.statusFilter')}: ${stateLabel(es)}`,
      onRemove: () => setSelectedEstados((prev) => prev.filter((x) => x !== es)),
    })),
    ...(sort !== 'fecha_desc'
      ? [
          {
            key: 'sort',
            label: `${t('albaranes.orderLabel')}: ${({ fecha_desc: 'Fecha ↓', fecha_asc: 'Fecha ↑', total_desc: 'Total ↓', total_asc: 'Total ↑' })[sort]}`,
            onRemove: () => setSort('fecha_desc'),
          },
        ]
      : []),
  ];

  function clearAll() {
    setQuery('');
    setSort('fecha_desc');
    setSelectedDomains([]);
    setSelectedEstados([]);
    setDateFrom('');
    setDateTo('');
    setTotalRange([defaultMinTotal, defaultMaxTotal]);
    setCurrentPage(1);
  }

  async function openDetail(a) {
    setDetailError(null);
    setSelected(a);
    setSelectedClient(clientesById.get(a.customer_id) || null);

    try {
      const [resA, resC] = await Promise.all([
        fetch(`${API_URL}albaranes/get/${a.id}`),
        fetch(`${API_URL}clientes/get/${a.customer_id}`),
      ]);

      if (resA.ok) setSelected(await resA.json());
      if (resC.ok) setSelectedClient(await resC.json());

      if (!resA.ok && !resC.ok) {
        const msg = 'No se pudo cargar el detalle.';
        setDetailError(msg);

        // ✅ Toast Sileo (warning: no se pudo cargar detalle)
        sileo.warning({
          title: 'Detalle no disponible',
          description: msg,
        });
      }
    } catch (e) {
      const msg = e?.message || 'Error desconocido';
      setDetailError(msg);

      // ✅ Toast Sileo (error: excepción al cargar detalle)
      sileo.error({
        title: 'Error cargando el detalle',
        description: msg,
      });
    }

    setDetailOpen(true);
    setDetailTab('albaran');
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelected(null);
    setSelectedClient(null);
    setDetailError(null);
    setDetailTab('albaran');
    setLinesEditing(false);
    setLinesForm([]);
    setLinesError(null);
  }

  function openEdit() {
    if (!selected) return;
    setEditForm({
      date: selected.date ? String(selected.date).slice(0, 10) : '',
      description: selected.description || '',
      status: selected.status || 'FIANZA',
    });
    setEditError(null);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditForm({});
    setEditError(null);
  }

  async function saveEdit() {
    if (!selected) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`${API_URL}albaranes/put/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editForm.date || null,
          description: editForm.description || null,
          status: editForm.status || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setSelected(updated);
      setAlbaranes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      closeEdit();
      sileo.success({ title: t('albaranes.editSuccess') });
    } catch (e) {
      const msg = e?.message || t('albaranes.editError');
      setEditError(msg);
      sileo.error({ title: t('albaranes.editError'), description: msg });
    } finally {
      setEditSaving(false);
    }
  }

  function openLinesEdit() {
    if (!selected) return;
    setLinesForm(
      (selected.items || []).map((item, i) => ({
        _key: `line-${item.product_id ?? i}-${Date.now()}-${i}`,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );
    setLinesEditing(true);
    setLinesError(null);
  }

  function closeLinesEdit() {
    setLinesEditing(false);
    setLinesForm([]);
    setLinesError(null);
  }

  function updateLineField(idx, field, value) {
    setLinesForm((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [field]: value };
        if (field === 'product_id') {
          const prod = productsById.get(Number(value));
          if (prod?.price !== undefined) next.unit_price = prod.price;
        }
        return next;
      })
    );
  }

  function removeLine(idx) {
    setLinesForm((prev) => prev.filter((_, i) => i !== idx));
  }

  function addLine() {
    setLinesForm((prev) => [
      ...prev,
      { _key: `line-new-${Date.now()}-${prev.length}`, product_id: products[0]?.id ?? '', quantity: 1, unit_price: products[0]?.price ?? 0 },
    ]);
  }

  async function deleteAlbaran() {
    if (!selected) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}albaranes/delete/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlbaranes((prev) => prev.filter((a) => a.id !== selected.id));
      setDeleteConfirmOpen(false);
      closeDetail();
      sileo.success({ title: t('albaranes.deleteSuccess') });
    } catch (e) {
      sileo.error({ title: t('albaranes.deleteError'), description: e?.message });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function saveLinesEdit() {
    if (!selected) return;
    if (linesForm.length === 0) {
      sileo.error({ title: t('albaranes.linesValidationError'), description: t('albaranes.linesCannotBeEmpty') });
      return;
    }
    if (linesForm.some((r) => !Number(r.product_id) || Number(r.quantity) <= 0)) {
      sileo.error({ title: t('albaranes.linesValidationError'), description: t('albaranes.linesInvalidFields') });
      return;
    }
    setLinesSaving(true);
    setLinesError(null);
    try {
      const res = await fetch(`${API_URL}albaranes/${selected.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: linesForm.map((r) => ({
            product_id: Number(r.product_id),
            quantity: Number(r.quantity),
            unit_price: Number(r.unit_price),
          })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setSelected(updated);
      setAlbaranes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      closeLinesEdit();
      sileo.success({ title: t('albaranes.linesEditSuccess') });
    } catch (e) {
      const msg = e?.message || t('albaranes.linesEditError');
      setLinesError(msg);
      sileo.error({ title: t('albaranes.linesEditError'), description: msg });
    } finally {
      setLinesSaving(false);
    }
  }

  // ✅ Abrir detalle desde ClientesPage si llega ID
  useEffect(() => {
    try {
      const stored = localStorage.getItem('albaran_open_id');
      if (stored) setPendingOpenId(Number(stored));
    } catch {}
  }, []);

  useEffect(() => {
    if (!pendingOpenId) return;
    if (!albaranes || albaranes.length === 0) return;

    const a = albaranes.find((x) => x.id === Number(pendingOpenId));
    if (!a) return;

    openDetail(a);

    try {
      localStorage.removeItem('albaran_open_id');
    } catch {}
    setPendingOpenId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenId, albaranes]);

  useEffect(() => {
    const handler = (ev) => {
      const id = ev?.detail?.id;
      if (!id) return;
      setPendingOpenId(Number(id));
    };
    window.addEventListener('open-albaran', handler);
    return () => window.removeEventListener('open-albaran', handler);
  }, []);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [q, sort, selectedDomains, selectedEstados, dateFrom, dateTo, totalRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginated = useMemo(
    () => filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filtered, clampedPage, pageSize]
  );

  return (
    <>
      <div className="p-3 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">{t('albaranes.title')}</h1>
        </div>

        {/* ✅ Buscador + Filtros en la misma línea */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('albaranes.searchPlaceholder')}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
          </div>

          <button
            onClick={() => setFiltersOpen(true)}
            className="rounded-xl border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50"
            type="button"
          >
            {t('albaranes.filtersTitle')}
          </button>
        </div>

        {/* Rango de fechas rápido */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-gray-500">{t('albaranes.dateLabel')}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2"
              title="Limpiar fechas"
            >
              ×
            </button>
          )}
        </div>

        {/* Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeChips.map((ch) => (
              <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />
            ))}
            <button className="text-sm text-gray-600 underline ml-2 hover:text-gray-900 transition-colors" onClick={clearAll} type="button">
              {t('common.clear')}
            </button>
          </div>
        )}

        {/* Tabla responsive */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
              <div className="col-span-2">{t('albaranes.colID')}</div>
              <div className="col-span-2">{t('albaranes.colDate')}</div>
              <div className="col-span-4">{t('albaranes.colClient')}</div>
              <div className="col-span-2">{t('albaranes.colTotal')}</div>
              <div className="col-span-2">{t('albaranes.colStatus')}</div>
            </div>

            <ul>
              {loading && <li className="p-6 text-gray-500">{t('albaranes.loading')}</li>}

              {/* ✅ En vez de “notificación” inline con todo el texto, dejamos un aviso suave aquí
                  y el detalle ya va por toast (Sileo). */}
              {error && (
                <li className="p-6 text-gray-700">
                  No se pudieron cargar los albaranes.
                  <div className="text-xs text-gray-500 mt-1">{error}</div>
                </li>
              )}

              {!loading && !error && filtered.length === 0 && <li className="p-6 text-gray-500">{t('albaranes.noResults')}</li>}

              {paginated.map((a) => {
                const cli = clientesById.get(a.customer_id);
                const meta = ESTADO_META[a.status] || { label: a.status, className: 'bg-gray-100 text-gray-700 border-gray-300' };
                return (
                  <li
                    key={a.id}
                    className="grid grid-cols-12 px-4 py-3 border-t hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openDetail(a)}
                  >
                    <div className="col-span-2">#{a.id}</div>
                    <div className="col-span-2">{formatDate(a.date)}</div>

                    <div className="col-span-4">
                      <div className="font-medium">
                        {cli?.name} {cli?.surnames}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {cli?.dni ? `${cli.dni} · ` : ''}
                        {cli?.email}
                      </div>
                    </div>

                    <div className="col-span-2">{formatEUR(a.total)}</div>

                    <div className="col-span-2">
                      <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${meta.className}`}>{stateLabel(a.status)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Paginación */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 px-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{t('albaranes.pageSizeLabel')}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                data-testid="alb-page-size-select"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={clampedPage === 1}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                aria-label="Primera página"
              >«</button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={clampedPage === 1}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                aria-label="Página anterior"
              >‹</button>
              <span className="px-3">{clampedPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={clampedPage >= totalPages}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                aria-label="Página siguiente"
              >›</button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={clampedPage >= totalPages}
                className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                aria-label="Última página"
              >»</button>
            </div>
            <span className="text-sm text-gray-600">{t('albaranes.paginationInfo', { from: Math.min((clampedPage - 1) * pageSize + 1, filtered.length), to: Math.min(clampedPage * pageSize, filtered.length), total: filtered.length })}</span>
          </div>
        )}

        {/* Modal filtros */}
        <ModalCenter isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} maxWidth="max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('albaranes.filtersTitle')}</h2>
          </div>

          <section className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">{t('albaranes.orderLabel')}</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="fecha_desc">Fecha ↓</option>
                <option value="fecha_asc">Fecha ↑</option>
                <option value="total_desc">Total ↓</option>
                <option value="total_asc">Total ↑</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('albaranes.dateRange')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <span>—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('albaranes.totalRange')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={totalRange[0]}
                  onChange={(e) => setTotalRangeSafe(e.target.value, totalRange[1])}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2"
                />
                <span>—</span>
                <input
                  type="number"
                  min={0}
                  value={totalRange[1]}
                  onChange={(e) => setTotalRangeSafe(totalRange[0], e.target.value)}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('albaranes.rangeAvailable', { min: defaultMinTotal, max: defaultMaxTotal })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('albaranes.clientDomains')}</label>
              <div className="flex flex-wrap gap-2">
                {domains.length === 0 && <span className="text-sm text-gray-500">{t('albaranes.noDomains')}</span>}
                {domains.map((dom) => {
                  const active = selectedDomains.includes(dom);
                  return (
                    <button
                      key={dom}
                      onClick={() =>
                        setSelectedDomains((prev) => (prev.includes(dom) ? prev.filter((d) => d !== dom) : [...prev, dom]))
                      }
                      className={`px-3 py-1 rounded-full border ${
                        active ? 'btn-accent-tab' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      type="button"
                    >
                      {dom}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('albaranes.statusFilter')}</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ESTADO_META).map((es) => {
                  const active = selectedEstados.includes(es);
                  return (
                    <button
                      key={es}
                      onClick={() =>
                        setSelectedEstados((prev) => (prev.includes(es) ? prev.filter((x) => x !== es) : [...prev, es]))
                      }
                      className={`px-3 py-1 rounded-full border ${
                        active ? 'btn-accent-tab' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      type="button"
                    >
                      {stateLabel(es)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
              type="button"
            >
              {t('albaranes.clearFilters')}
            </button>
            <button
              onClick={() => setFiltersOpen(false)}
              className="px-4 py-2 rounded-xl btn-accent"
              type="button"
            >
              {t('albaranes.apply')}
            </button>
          </div>
        </ModalCenter>

        {/* ✅ Modal detalle albarán */}
        <ModalCenter isOpen={detailOpen} onClose={closeDetail} maxWidth="max-w-3xl" showClose={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('albaranes.detailTitle')}</h2>
            <div className="flex items-center gap-2">
              {selected && (
                <>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-sm dark:bg-gray-700 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/30"
                    type="button"
                    data-testid="albaran-delete-btn"
                  >
                    {t('albaranes.deleteBtn')}
                  </button>
                  <button
                    onClick={openEdit}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                    type="button"
                    data-testid="albaran-edit-btn"
                  >
                    {t('common.edit')}
                  </button>
                </>
              )}
              <button type="button" onClick={closeDetail} className={closeButtonClass} aria-label="Cerrar"><CloseIcon /></button>
            </div>
          </div>

          {!selected ? (
            <p className="text-gray-500">{t('common.loading')}</p>
          ) : (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailTab('albaran')}
                  className={`px-4 py-2 rounded-xl border ${
                    detailTab === 'albaran' ? 'btn-accent-tab' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t('albaranes.tabAlbaran')}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('cliente')}
                  className={`px-4 py-2 rounded-xl border ${
                    detailTab === 'cliente' ? 'btn-accent-tab' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t('albaranes.tabClient')}
                </button>
              </div>

              {detailTab === 'albaran' && (
                <>
              {/* cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('albaranes.colID')}</div>
                  <div className="font-medium">#{selected.id}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('albaranes.colDate')}</div>
                  <div className="font-medium">{formatDate(selected.date)}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('albaranes.colTotal')}</div>
                  <div className="font-medium">{formatEUR(selected.total)}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('albaranes.colStatus')}</div>
                  <div className="font-medium">
                    <span
                      className={`inline-block border px-2 py-1 rounded-lg text-xs ${
                        ESTADO_META[selected.status]?.className || 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                    >
                      {stateLabel(selected.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">{t('albaranes.colDesc')}</div>
                <div className="font-medium break-words">{selected.description || '—'}</div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t('albaranes.linesTitle')}</h3>
                  {linesEditing ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={closeLinesEdit}
                        disabled={linesSaving}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-600"
                        data-testid="lines-cancel-btn"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={saveLinesEdit}
                        disabled={linesSaving}
                        className="px-3 py-1.5 rounded-lg btn-accent text-sm disabled:opacity-50"
                        data-testid="lines-save-btn"
                      >
                        {linesSaving ? t('common.saving') : t('albaranes.linesEditSave')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openLinesEdit}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                      data-testid="lines-edit-btn"
                    >
                      {t('albaranes.linesEditBtn')}
                    </button>
                  )}
                </div>
                {detailError && <p className="text-red-600 mb-2">Error: {detailError}</p>}
                {linesError && <p className="text-red-600 mb-2">{linesError}</p>}
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left border-b">
                        {!linesEditing && <th className="p-2 w-24">{t('albaranes.colLineId')}</th>}
                        <th className="p-2">{t('albaranes.colProduct')}</th>
                        <th className="p-2 w-24">{t('albaranes.colQty')}</th>
                        <th className="p-2 w-28">{t('albaranes.colUnitPrice')}</th>
                        <th className="p-2 w-28">{t('albaranes.colSubtotal')}</th>
                        {linesEditing && <th className="p-2 w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {!linesEditing &&
                        (selected.items || []).map((ln) => (
                          <tr key={ln.id} className="border-b">
                            <td className="p-2">#{ln.id}</td>
                            <td className="p-2">{productsById.get(ln.product_id)?.name ?? ln.product_id}</td>
                            <td className="p-2">{ln.quantity}</td>
                            <td className="p-2">{formatEUR(ln.unit_price)}</td>
                            <td className="p-2">{formatEUR(ln.quantity * ln.unit_price)}</td>
                          </tr>
                        ))}
                      {!linesEditing && (!selected.items || selected.items.length === 0) && (
                        <tr>
                          <td className="p-3 text-sm text-gray-500" colSpan={5}>
                            {t('albaranes.noLines')}
                          </td>
                        </tr>
                      )}
                      {linesEditing &&
                        linesForm.map((row, idx) => (
                          <tr key={row._key ?? idx} className="border-b">
                            <td className="p-1">
                              <select
                                value={row.product_id}
                                onChange={(e) =>
                                  updateLineField(idx, 'product_id', Number(e.target.value))
                                }
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              >
                                <option value="">—</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateLineField(idx, 'quantity', Number(e.target.value))
                                }
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.unit_price}
                                onChange={(e) =>
                                  updateLineField(idx, 'unit_price', Number(e.target.value))
                                }
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="p-1 text-sm">
                              {formatEUR(row.quantity * row.unit_price)}
                            </td>
                            <td className="p-1">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="text-red-500 hover:text-red-700 px-1"
                                aria-label="Eliminar línea"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      {linesEditing && linesForm.length === 0 && (
                        <tr>
                          <td className="p-3 text-sm text-gray-500" colSpan={5}>
                            {t('albaranes.noLines')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {linesEditing && (
                  <button
                    type="button"
                    onClick={addLine}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    data-testid="lines-add-row-btn"
                  >
                    + {t('albaranes.linesEditAddRow')}
                  </button>
                )}
              </div>
                </>
              )}

              {detailTab === 'cliente' && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{t('albaranes.clientInfo')}</h3>
                    {selectedClient?.id && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          goToCliente(selectedClient.id);
                        }}
                      >
                        {t('albaranes.viewClient')}
                      </button>
                    )}
                  </div>
                  {selectedClient ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="text-xs text-gray-500">{t('albaranes.colName')}</div>
                        <div className="font-medium">{selectedClient.name} {selectedClient.surnames}</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="text-xs text-gray-500">{t('albaranes.colDNI')}</div>
                        <div className="font-medium">{selectedClient.dni || '—'}</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="text-xs text-gray-500">{t('albaranes.colEmail')}</div>
                        <div className="font-medium break-all">{selectedClient.email || '—'}</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="text-xs text-gray-500">{t('albaranes.colPhone')}</div>
                        <div className="font-medium">
                          {selectedClient.phone1 || '—'}
                          {selectedClient.phone2 ? ` · ${selectedClient.phone2}` : ''}
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:col-span-2">
                        <div className="text-xs text-gray-500">{t('albaranes.colCity')}</div>
                        <div className="font-medium">{selectedClient.city || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">{t('albaranes.loadingClient')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </ModalCenter>

        {/* Modal confirmar eliminar albarán */}
        <ConfirmDeleteModal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title={t('albaranes.deleteTitle')}
          message={t('albaranes.deleteConfirm', { id: selected?.id })}
          onConfirm={deleteAlbaran}
          loading={deleteLoading}
          confirmTestId="albaran-delete-confirm-btn"
          confirmLabel={deleteLoading ? t('common.saving') : t('albaranes.deleteBtn')}
          cancelLabel={t('common.cancel')}
        />

        {/* Modal editar albarán */}
        <ModalCenter isOpen={editOpen} onClose={closeEdit} maxWidth="max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('albaranes.editTitle')}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('albaranes.editDate')}</label>
              <input
                type="date"
                value={editForm.date || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('albaranes.editDescription')}</label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('albaranes.editStatus')}</label>
              <select
                value={editForm.status || 'FIANZA'}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="FIANZA">{t('albaranes.stateFianza')}</option>
                <option value="ALMACEN">{t('albaranes.stateAlmacen')}</option>
                <option value="RUTA">{t('albaranes.stateRuta')}</option>
                <option value="ENTREGADO">{t('albaranes.stateEntregado')}</option>
              </select>
            </div>

            {editError && <p className="text-red-600 text-sm">{editError}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={closeEdit}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              type="button"
              disabled={editSaving}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={saveEdit}
              className="px-4 py-2 rounded-xl btn-accent disabled:opacity-50"
              type="button"
              disabled={editSaving}
              data-testid="albaran-edit-save-btn"
            >
              {editSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </ModalCenter>
      </div>
    </>
  );
}
