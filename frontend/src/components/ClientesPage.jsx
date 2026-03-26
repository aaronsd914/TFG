import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import { useTranslation } from 'react-i18next';

import { API_URL } from '../config.js';

// ===== Helpers =====
function useDebouncedValue(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function ModalCenter({ isOpen, onClose, children, maxWidth = 'max-w-3xl' }) {
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

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm">
      {label}
      <button className="text-gray-500 hover:text-gray-700" onClick={onRemove} aria-label={`Quitar ${label}`} type="button">
        ×
      </button>
    </span>
  );
}

function safeNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n) {
  return `${safeNumber(n).toFixed(2)} €`;
}

function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

const ESTADO_META = {
  FIANZA: { label: 'Fianza', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  ALMACEN: { label: 'Almacén', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  TRANSPORTE: { label: 'Ruta', className: 'bg-purple-100 text-purple-800 border-purple-300' },
  ENTREGADO: { label: 'Entregado', className: 'bg-green-100 text-green-800 border-green-300' },
};

function Chevron({ open }) {
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-700"
      aria-hidden="true"
      title={open ? 'Ocultar líneas' : 'Ver líneas'}
    >
      {open ? '▲' : '▼'}
    </span>
  );
}

// ===== Página =====
export default function ClientesPage() {
  const { t } = useTranslation();

  const stateLabel = (key) => ({
    FIANZA: t('albaranes.stateFianza'),
    ALMACEN: t('albaranes.stateAlmacen'),
    TRANSPORTE: t('albaranes.stateRuta'),
    ENTREGADO: t('albaranes.stateEntregado'),
  })[key] || key;

  // base
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // buscador
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 150);

  // filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('az'); // az|za|id_up|id_down
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [idRange, setIdRange] = useState([0, 999999]);
  const navigate = useNavigate();

  // detalle (modal centrado)
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('info'); // info | albaranes

  // edición de cliente
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // albaranes del cliente
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({}); // { [albaranId]: { open, loading, error, items } }

  // paginación
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // validación edición
  const [editErrors, setEditErrors] = useState({});

  // mapa id→nombre de productos (para mostrar en líneas de albarán)
  const [productMap, setProductMap] = useState({});

  // ✅ ID pendiente para abrir detalle (desde Albaranes)
  const [pendingOpenClienteId, setPendingOpenClienteId] = useState(null);

  function toastError(title, errLike) {
    const description =
      typeof errLike === 'string'
        ? errLike
        : errLike?.message
        ? errLike.message
        : 'Ha ocurrido un error inesperado.';
    try {
      sileo.error({ title, description });
    } catch {}
  }

  function toastWarning(title, description) {
    try {
      sileo.warning({ title, description });
    } catch {}
  }

  // Carga inicial de clientes + productos
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [resClientes, resProductos] = await Promise.all([
          fetch(`${API_URL}clientes/get`),
          fetch(`${API_URL}productos/get`),
        ]);
        if (!resClientes.ok) throw new Error(`HTTP ${resClientes.status}`);
        const json = await resClientes.json();
        setData(json || []);
        if (json?.length) {
          const ids = json.map((c) => c.id);
          setIdRange([Math.min(...ids), Math.max(...ids)]);
        } else {
          setIdRange([0, 999999]);
        }
        if (resProductos.ok) {
          const prods = await resProductos.json();
          const map = {};
          (prods || []).forEach((p) => { map[p.id] = p.name; });
          setProductMap(map);
        }
      } catch (e) {
        setError(e.message);
        toastError('Error cargando clientes', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Leer localStorage para abrir cliente automáticamente
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cliente_open_id');
      if (stored) setPendingOpenClienteId(Number(stored));
    } catch {}
  }, []);

  // ✅ Cuando ya tengo la lista de clientes, abro el detalle
  useEffect(() => {
    if (!pendingOpenClienteId) return;
    if (!data || data.length === 0) return;

    const wanted = Number(pendingOpenClienteId);
    const c = data.find((x) => x.id === wanted);

    if (!c) {
      toastWarning('Cliente no encontrado', `No se ha encontrado el cliente #${wanted} en la lista.`);
      try {
        localStorage.removeItem('cliente_open_id');
      } catch {}
      setPendingOpenClienteId(null);
      return;
    }

    openDetail(c);

    try {
      localStorage.removeItem('cliente_open_id');
    } catch {}
    setPendingOpenClienteId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpenClienteId, data]);

  // Dominios únicos
  const domains = useMemo(() => {
    const set = new Set();
    data.forEach((c) => {
      const d = (c.email || '').split('@')[1];
      if (d) set.add(d.toLowerCase());
    });
    return Array.from(set).sort();
  }, [data]);

  const defaultMin = data.length ? Math.min(...data.map((d) => d.id)) : 0;
  const defaultMax = data.length ? Math.max(...data.map((d) => d.id)) : 999999;

  // Aplicación de buscador + filtros + orden

  // Reset página si cambia búsqueda/filtros
  useEffect(() => { setCurrentPage(1); }, [q, idRange, selectedDomains, sort]);

  const filtered = useMemo(() => {
    let list = [...data];

    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(
        (c) =>
          `${c.name || ''} ${c.surnames || ''}`.toLowerCase().includes(t) ||
          (c.email || '').toLowerCase().includes(t) ||
          (c.dni || '').toLowerCase().includes(t) ||
          (c.phone1 || '').toLowerCase().includes(t)
      );
    }

    list = list.filter((c) => c.id >= idRange[0] && c.id <= idRange[1]);

    if (selectedDomains.length) {
      list = list.filter((c) => selectedDomains.includes((c.email?.split('@')[1] || '').toLowerCase()));
    }

    switch (sort) {
      case 'az':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'za':
        list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'id_up':
        list.sort((a, b) => a.id - b.id);
        break;
      case 'id_down':
        list.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    return list;
  }, [data, q, idRange, selectedDomains, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  // Chips de filtros activos
  const activeChips = [
    ...(q ? [{ key: 'q', label: `${t('common.search')}: "${q}"`, onRemove: () => setQuery('') }] : []),
    ...(idRange[0] !== defaultMin || idRange[1] !== defaultMax
      ? [{ key: 'id', label: `ID ${idRange[0]}–${idRange[1]}`, onRemove: () => setIdRange([defaultMin, defaultMax]) }]
      : []),
    ...selectedDomains.map((dom) => ({
      key: `dom-${dom}`,
      label: `${t('clients.emailDomains')}: ${dom}`,
      onRemove: () => setSelectedDomains((prev) => prev.filter((d) => d !== dom)),
    })),
    ...(sort !== 'az'
      ? [
          {
            key: 'sort',
            label: `${t('clients.orderLabel')}: ${({ az: 'A→Z', za: 'Z→A', id_up: 'ID↑', id_down: 'ID↓' })[sort]}`,
            onRemove: () => setSort('az'),
          },
        ]
      : []),
  ];

  function clearAll() {
    setQuery('');
    setSelectedDomains([]);
    setSort('az');
    setIdRange([defaultMin, defaultMax]);
  }

  async function loadOrders(clienteId) {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      let res = await fetch(`${API_URL}albaranes/by-cliente/${clienteId}`);
      let data;
      if (res.ok) {
        data = await res.json();
      } else {
        const resAll = await fetch(`${API_URL}albaranes/get`);
        if (!resAll.ok) throw new Error(`HTTP ${resAll.status}`);
        const all = await resAll.json();
        data = (all || []).filter((a) => a.customer_id === clienteId);
      }
      setOrders(Array.isArray(data) ? data.sort((a, b) => new Date(b.date) - new Date(a.date)) : []);
    } catch (e) {
      setOrders([]);
      setOrdersError(e.message);
      toastError('Error cargando albaranes del cliente', e);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function openDetail(c) {
    setDetailTab('info');
    try {
      const resCli = await fetch(`${API_URL}clientes/get/${c.id}`);
      setSelected(resCli.ok ? await resCli.json() : c);
    } catch {
      setSelected(c);
      // aquí no meto toast: seguimos con fallback y no es un fallo crítico
    }
    await loadOrders(c.id);
    setExpanded({});
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelected(null);
    setOrders([]);
    setOrdersError(null);
    setOrdersLoading(false);
    setExpanded({});
  }

  function openEdit() {
    if (!selected) return;
    setEditForm({
      name: selected.name || '',
      surnames: selected.surnames || '',
      dni: selected.dni || '',
      email: selected.email || '',
      phone1: selected.phone1 || '',
      phone2: selected.phone2 || '',
      street: selected.street || '',
      house_number: selected.house_number || '',
      floor_entrance: selected.floor_entrance || '',
      city: selected.city || '',
      postal_code: selected.postal_code || '',
    });
    setEditError(null);
    setEditErrors({});
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditForm({});
    setEditError(null);
    setEditErrors({});
  }

  async function saveEdit() {
    if (!selected) return;

    // Validación campos obligatorios
    const errs = {};
    const REQUIRED = ['name', 'surnames', 'dni', 'phone1', 'street', 'house_number', 'city', 'postal_code', 'email'];
    REQUIRED.forEach((k) => { if (!(editForm[k] || '').trim()) errs[k] = true; });
    // Validar formato DNI
    if (editForm.dni && editForm.dni.trim() && !(/^([XYZxyz]\d{7}[A-Za-z]|\d{8}[A-Za-z])$/).test(editForm.dni.trim())) errs.dni = true;
    // Validar email si se rellena
    if (editForm.email && editForm.email.trim()) {
      const parts = editForm.email.trim().split('@');
      if (!(parts.length === 2 && parts[0].length > 0 && parts[1].includes('.') && !editForm.email.includes(' '))) errs.email = true;
    }
    // Validar teléfonos
    if (editForm.phone1 && editForm.phone1.trim() && !(/^\d+$/).test(editForm.phone1.trim())) errs.phone1 = true;
    if (editForm.phone2 && editForm.phone2.trim() && !(/^\d+$/).test(editForm.phone2.trim())) errs.phone2 = true;
    // Validar código postal
    if (editForm.postal_code && editForm.postal_code.trim() && !(/^\d+$/).test(editForm.postal_code.trim())) errs.postal_code = true;

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      sileo.error({ title: t('clients.editValidationTitle'), description: t('clients.editValidationDesc') });
      return;
    }
    setEditErrors({});

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`${API_URL}clientes/put/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          surnames: editForm.surnames,
          dni: editForm.dni || null,
          email: editForm.email || null,
          phone1: editForm.phone1 || null,
          phone2: editForm.phone2 || null,
          street: editForm.street || null,
          house_number: editForm.house_number || null,
          floor_entrance: editForm.floor_entrance || null,
          city: editForm.city || null,
          postal_code: editForm.postal_code || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setSelected(updated);
      setData((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      closeEdit();
      sileo.success({ title: t('clients.editSuccess') });
    } catch (e) {
      const msg = e?.message || t('clients.editError');
      setEditError(msg);
      sileo.error({ title: t('clients.editError'), description: msg });
    } finally {
      setEditSaving(false);
    }
  }

  // Cargar líneas bajo demanda
  async function toggleExpand(albaran) {
    const id = albaran.id;
    const current = expanded[id];
    if (current?.open) {
      setExpanded((prev) => ({ ...prev, [id]: { ...prev[id], open: false } }));
      return;
    }
    setExpanded((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), open: true, loading: true, error: null } }));
    try {
      const res = await fetch(`${API_URL}albaranes/get/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const full = await res.json();
      setExpanded((prev) => ({ ...prev, [id]: { ...prev[id], open: true, loading: false, items: full.items || [] } }));
    } catch (e) {
      setExpanded((prev) => ({ ...prev, [id]: { ...prev[id], open: true, loading: false, error: e.message } }));
      toastError('Error cargando líneas del albarán', e);
    }
  }

  function openAlbaranInAlbaranesPage(albaranId) {
    try {
      localStorage.setItem('albaran_open_id', String(albaranId));
    } catch {}
    navigate('/albaranes');
  }

  const totalClientesRegistrados = data.length;

  return (
    <div className="p-3 md:p-6">
      {/* Título + contador */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('clients.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('clients.registeredCount')} <span className="font-medium text-gray-700">{totalClientesRegistrados}</span>
          </p>
        </div>
      </div>

      {/* Buscador + Filtros al lado */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
        </div>

        <button
          onClick={() => setFiltersOpen(true)}
          className="rounded-xl border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50"
          type="button"
        >
          {t('common.filters')}
        </button>
      </div>

      {/* Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeChips.map((ch) => (
            <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />
          ))}
          <button className="text-sm text-gray-600 underline ml-2 hover:text-gray-900 transition-colors" onClick={clearAll} type="button">
            Limpiar todo
          </button>
        </div>
      )}

      {/* Tabla de clientes */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white mt-4">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
            <div className="col-span-4">{t('clients.colNameHeader')}</div>
            <div className="col-span-2">{t('clients.colPhone')}</div>
            <div className="col-span-4">{t('clients.colEmail')}</div>
            <div className="col-span-2">{t('clients.colDNI')}</div>
          </div>

          <ul>
            {loading && <li className="p-6 text-gray-500">{t('clients.loading')}</li>}
            {error && (
              <li className="p-6 text-gray-700">
                {t('clients.loadError')}
                <div className="text-xs text-gray-500 mt-1">{error}</div>
              </li>
            )}
            {!loading && !error && filtered.length === 0 && <li className="p-6 text-gray-500">{t('clients.noResults')}</li>}
            {paginated.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-12 px-4 py-5 border-t hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openDetail(c)}
              >
                <div className="col-span-4">{c.name} {c.surnames}</div>
                <div className="col-span-2">{c.phone1 || '—'}</div>
                <div className="col-span-4">{c.email}</div>
                <div className="col-span-2">{c.dni}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Controles de paginación */}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>{t('clients.pageSizeLabel')}:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-1"
              data-testid="page-size-select"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={clampedPage === 1}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >«</button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage === 1}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >‹</button>
            <span className="px-3">{clampedPage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage === totalPages}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >›</button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={clampedPage === totalPages}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >»</button>
          </div>
          <span>{t('clients.paginationInfo', { from: (clampedPage - 1) * pageSize + 1, to: Math.min(clampedPage * pageSize, filtered.length), total: filtered.length })}</span>
        </div>
      )}

      {/* Modal de filtros */}
      <ModalCenter isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} maxWidth="max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('clients.filtersTitle')}</h2>
          <button onClick={() => setFiltersOpen(false)} className="text-gray-500 hover:text-gray-700" type="button">
            {t('common.close')}
          </button>
        </div>

        <section className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t('clients.orderLabel')}</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="az">{t('clients.orderAZ')}</option>
              <option value="za">{t('clients.orderZA')}</option>
              <option value="id_up">{t('clients.orderAsc')}</option>
              <option value="id_down">{t('clients.orderDesc')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('clients.emailDomains')}</label>
            <div className="flex flex-wrap gap-2">
              {domains.length === 0 && <span className="text-sm text-gray-500">{t('clients.noDomains')}</span>}
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
        </section>

        <div className="mt-8 flex items-center justify-between">
          <button onClick={clearAll} className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600" type="button">
            {t('clients.clearFilters')}
          </button>
          <button onClick={() => setFiltersOpen(false)} className="px-4 py-2 rounded-xl btn-accent" type="button">
            {t('clients.apply')}
          </button>
        </div>
      </ModalCenter>

      {/* Modal Detalle Cliente */}
      <ModalCenter isOpen={detailOpen} onClose={closeDetail} maxWidth="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('clients.detailTitle')}</h2>
          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={openEdit}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                type="button"
                data-testid="cliente-edit-btn"
              >
                {t('common.edit')}
              </button>
            )}
            <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700" type="button">
              {t('common.close')}
            </button>
          </div>
        </div>

        {!selected ? (
          <p className="text-gray-500">{t('common.loading')}</p>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`px-4 py-2 rounded-xl border ${
                  detailTab === 'info' ? 'btn-accent-tab' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('clients.tabInfo')}
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('albaranes')}
                className={`px-4 py-2 rounded-xl border ${
                  detailTab === 'albaranes'
                    ? 'btn-accent-tab'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('clients.tabDeliveries')}
              </button>
            </div>

            {detailTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('clients.colID')}</div>
                  <div className="font-medium">#{selected.id}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('clients.colName')}</div>
                  <div className="font-medium">
                    {selected.name} {selected.surnames || ''}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('clients.colDNI')}</div>
                  <div className="font-medium break-all">{selected.dni || '—'}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:col-span-2">
                  <div className="text-xs text-gray-500">{t('clients.colEmail')}</div>
                  <div className="font-medium break-all">{selected.email || '—'}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">{t('clients.colPhones')}</div>
                  <div className="font-medium break-all">
                    {selected.phone1 || '—'}
                    {selected.phone2 ? ` · ${selected.phone2}` : ''}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:col-span-3">
                  <div className="text-xs text-gray-500">{t('clients.colAddress')}</div>
                  <div className="font-medium break-words">
                    {[
                      selected.street,
                      selected.house_number,
                      selected.floor_entrance ? `(${selected.floor_entrance})` : null,
                      selected.postal_code,
                      selected.city,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'albaranes' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{t('clients.deliveries')}</h3>
                  {ordersLoading && <span className="text-sm text-gray-500">{t('common.loading')}</span>}
                </div>

                {ordersError && <p className="text-red-600 mb-2">Error: {ordersError}</p>}

                {!ordersLoading && !ordersError && (
                  <>
                    {orders.length === 0 ? (
                      <p className="text-gray-500">{t('clients.noDeliveries')}</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="text-left border-b bg-gray-50">
                              <th className="p-2 w-24">{t('clients.colID')}</th>
                              <th className="p-2 w-36">{t('clients.colDate')}</th>
                              <th className="p-2">{t('clients.colDesc')}</th>
                              <th className="p-2 w-28">{t('clients.colStatus')}</th>
                              <th className="p-2 w-32">{t('clients.colTotal')}</th>
                              <th className="p-2 w-40"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((alb) => {
                              const isOpen = !!expanded[alb.id]?.open;
                              const isLoading = !!expanded[alb.id]?.loading;
                              const err = expanded[alb.id]?.error;
                              const lineas = expanded[alb.id]?.items || [];
                              const meta =
                                ESTADO_META[alb.status] || { label: alb.status, className: 'bg-gray-100 text-gray-700 border-gray-300' };

                              return (
                                <React.Fragment key={alb.id}>
                                  <tr className="border-b hover:bg-gray-50">
                                    <td className="p-2">#{alb.id}</td>
                                    <td className="p-2">{formatDate(alb.date)}</td>
                                    <td className="p-2 truncate" title={alb.description || ''}>
                                      {alb.description || '—'}
                                    </td>
                                    <td className="p-2">
                                      <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${meta.className}`}>
                                        {stateLabel(alb.status)}
                                      </span>
                                    </td>
                                    <td className="p-2">{formatEUR(alb.total)}</td>
                                    <td className="p-2">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                                          onClick={() => openAlbaranInAlbaranesPage(alb.id)}
                                          title={t('clients.openInAlbaranesTitle')}
                                        >
                                          {t('clients.openInAlbaranes')}
                                        </button>
                                        <button
                                          type="button"
                                          className="inline-flex items-center justify-center"
                                          onClick={() => toggleExpand(alb)}
                                          aria-label={isOpen ? t('clients.hideLines') : t('clients.showLines')}
                                        >
                                          <Chevron open={isOpen} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {isOpen && (
                                    <tr className="border-b bg-gray-50">
                                      <td colSpan={6} className="p-0">
                                        <div className="p-3">
                                          {isLoading && <div className="text-sm text-gray-500">{t('clients.loadingLines')}</div>}
                                          {err && <div className="text-sm text-red-600">Error: {err}</div>}
                                          {!isLoading && !err && (
                                            <div className="border rounded-xl overflow-hidden bg-white">
                                              <table className="w-full border-collapse">
                                                <thead>
                                                  <tr className="text-left border-b bg-gray-50">
                                                    <th className="p-2">{t('clients.colProduct')}</th>
                                                    <th className="p-2 w-24">{t('clients.colQty')}</th>
                                                    <th className="p-2 w-28">{t('clients.colUnitPrice')}</th>
                                                    <th className="p-2 w-28">{t('clients.colSubtotal')}</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {lineas.length === 0 && (
                                                    <tr>
                                                      <td className="p-3 text-sm text-gray-500" colSpan={5}>
                                                          {t('clients.noLines')}
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {lineas.map((ln) => (
                                                    <tr key={ln.id} className="border-b">
                                                      <td className="p-2">{productMap[ln.product_id] || `#${ln.product_id}`}</td>
                                                      <td className="p-2">{ln.quantity}</td>
                                                      <td className="p-2">{formatEUR(ln.unit_price)}</td>
                                                      <td className="p-2">{formatEUR(ln.quantity * ln.unit_price)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </ModalCenter>

      {/* Modal editar cliente */}
      <ModalCenter isOpen={editOpen} onClose={closeEdit} maxWidth="max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('clients.editTitle')}</h2>
          <button onClick={closeEdit} className="text-gray-500 hover:text-gray-700" type="button">
            {t('common.close')}
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{key:'name',label:t('clients.editName'),req:true,type:'text'},
              {key:'surnames',label:t('clients.editSurnames'),req:true,type:'text'},
              {key:'dni',label:t('clients.editDni'),req:true,type:'text'},
              {key:'email',label:t('clients.editEmail'),req:true,type:'email'},
              {key:'phone1',label:t('clients.editPhone1'),req:true,type:'text'},
              {key:'phone2',label:t('clients.editPhone2'),req:false,type:'text'},
              {key:'street',label:t('clients.editStreet'),req:true,type:'text'},
              {key:'house_number',label:t('clients.editHouseNumber'),req:true,type:'text'},
              {key:'floor_entrance',label:t('clients.editFloorEntrance'),req:false,type:'text'},
              {key:'city',label:t('clients.editCity'),req:true,type:'text'},
              {key:'postal_code',label:t('clients.editPostalCode'),req:true,type:'text'},
            ].map(({key, label, req, type}) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {label}{req && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type={type}
                  value={editForm[key] || ''}
                  onChange={(e) => { setEditForm((f) => ({ ...f, [key]: e.target.value })); setEditErrors((err) => { const c = {...err}; delete c[key]; return c; }); }}
                  className={`w-full rounded-lg px-3 py-2 border ${
                    editErrors[key] ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-200'
                  }`}
                />
              </div>
            ))}
          </div>

          {editError && <p className="text-red-600 text-sm">{editError}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeEdit}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
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
            data-testid="cliente-edit-save-btn"
          >
            {editSaving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </ModalCenter>
    </div>
  );
}
