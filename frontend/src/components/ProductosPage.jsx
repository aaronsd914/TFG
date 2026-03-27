// frontend/src/components/ProductosPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';
import { Pagination } from './ui/Pagination.jsx';
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

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function clampNumberInput(v) {
  if (v === '' || v === null || typeof v === 'undefined') return '';
  const num = Number(v);
  if (!Number.isFinite(num)) return '';
  if (num < 0) return '0';
  return String(num);
}

function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[1px]';
  const variants = {
    primary: 'btn-accent',
    secondary: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-800 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props} />;
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm">
      {label}
      <button
        className="text-gray-500 hover:text-gray-700"
        onClick={onRemove}
        aria-label={`Quitar ${label}`}
        type="button"
      >
        ×
      </button>
    </span>
  );
}

function Modal({ open, onClose, title, children, maxWidth = 'max-w-3xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [key, state]);

  return [state, setState];
}

function RequiredAsterisk() {
  return <span className="text-red-600 font-semibold"> *</span>;
}

// ===== Página =====
export default function ProductosPage() {
  const { t } = useTranslation();
  // preferencias persistidas
  const [tab, setTab] = useLocalStorageState('productos.tab', 'listado'); // listado | gestion
  const [groupMode, setGroupMode] = useLocalStorageState('productos.groupMode', 'all'); // all | proveedor
  const [pageSize, setPageSize] = useLocalStorageState('productos.pageSize', 12);

  // datos
  const [productos, setProductos] = useState([]);
  const [suppliers, setProveedores] = useState([]);

  // estados base
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // buscador + filtros (listado)
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 150);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [provFilter, setProvFilter] = useState('');
  const [minPrecio, setMinPrecio] = useState('');
  const [maxPrecio, setMaxPrecio] = useState('');
  const [sort, setSort] = useState('nombre_az');

  // paginación (modo all)
  const [page, setPage] = useState(1);

  // expand/collapse en modo proveedor
  const [openProviders, setOpenProviders] = useState(() => ({}));

  // buscador (gestion)
  const [gestionQuery, setGestionQuery] = useState('');

  // alta
  const [fNombre, setFNombre] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fPrecio, setFPrecio] = useState('');
  const [fProveedor, setFProveedor] = useState('');
  const [saving, setSaving] = useState(false);

  // validación alta
  const [createTouched, setCreateTouched] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  // editar (gestion)
  const [selectedId, setSelectedId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [updating, setUpdating] = useState(false);

  // validación edición
  const [editTouched, setEditTouched] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // borrar
  const [delBusyId, setDelBusyId] = useState(null);

  // ✅ modal confirmación borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id,nombre}

  // modal creación (accesible desde cualquier tab)
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const supplierName = (id) => suppliers.find((x) => x.id === id)?.name || `#${id}`;

  async function fetchData() {
    try {
      setLoading(true);
      setErr(null);

      const [rp, rpr] = await Promise.all([fetch(`${API_URL}productos/get`), fetch(`${API_URL}proveedores/get`)]);
      if (!rp.ok) throw new Error(`Productos HTTP ${rp.status}`);
      if (!rpr.ok) throw new Error(`suppliers HTTP ${rpr.status}`);

      const [ps, prs] = await Promise.all([rp.json(), rpr.json()]);
      setProductos(ps);
      setProveedores(prs);
    } catch (e) {
      setErr(e.message);
      try {
        sileo.error({ title: '❌ Error cargando productos', description: e.message });
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, provFilter, minPrecio, maxPrecio, sort, pageSize, groupMode]);

  const precioRangeInvalid = useMemo(() => {
    if (minPrecio === '' || maxPrecio === '') return false;
    const min = Number(minPrecio);
    const max = Number(maxPrecio);
    return Number.isFinite(min) && Number.isFinite(max) && min > max;
  }, [minPrecio, maxPrecio]);

  // ===== FILTRADO BASE =====
  const filteredBase = useMemo(() => {
    let list = [...productos];
    const t = q.trim().toLowerCase();

    if (t) {
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(t) ||
          (p.description || '').toLowerCase().includes(t) ||
          supplierName(p.supplier_id).toLowerCase().includes(t)
      );
    }

    if (provFilter) list = list.filter((p) => String(p.supplier_id) === String(provFilter));

    const min = minPrecio === '' ? null : Number(minPrecio);
    const max = maxPrecio === '' ? null : Number(maxPrecio);

    if (!precioRangeInvalid) {
      if (min !== null && Number.isFinite(min)) list = list.filter((p) => Number(p.price || 0) >= min);
      if (max !== null && Number.isFinite(max)) list = list.filter((p) => Number(p.price || 0) <= max);
    }

    switch (sort) {
      case 'nombre_az':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'nombre_za':
        list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'precio_up':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'precio_down':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'prov_az':
        list.sort((a, b) => supplierName(a.supplier_id).localeCompare(supplierName(b.supplier_id)));
        break;
      case 'prov_za':
        list.sort((a, b) => supplierName(b.supplier_id).localeCompare(supplierName(a.supplier_id)));
        break;
      default:
        break;
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productos,
    q,
    provFilter,
    minPrecio,
    maxPrecio,
    sort,
    precioRangeInvalid,
    suppliers,
  ]);

  // ===== MODO ALL (tarjetas + paginación) =====
  const totalPages = Math.max(1, Math.ceil(filteredBase.length / Number(pageSize || 12)));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageSlice = useMemo(() => {
    const size = Number(pageSize || 12);
    const start = (safePage - 1) * size;
    return filteredBase.slice(start, start + size);
  }, [filteredBase, safePage, pageSize]);

  // ===== MODO PROVEEDOR =====
  const providerCards = useMemo(() => {
    const map = new Map();
    for (const p of filteredBase) {
      const pid = Number(p.supplier_id);
      if (!map.has(pid)) {
        const prov = suppliers.find((x) => x.id === pid) || { id: pid, nombre: `Proveedor #${pid}` };
        map.set(pid, { proveedor: prov, items: [] });
      }
      map.get(pid).items.push(p);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.supplier?.name || '').localeCompare(b.supplier?.name || ''));
    return arr;
  }, [filteredBase, suppliers]);

  // ===== GESTIÓN LISTA =====
  const gestionList = useMemo(() => {
    let list = [...productos];
    const t = gestionQuery.trim().toLowerCase();
    if (t) {
      list = list.filter((p) => {
        const prov = supplierName(p.supplier_id);
        return (
          (p.name || '').toLowerCase().includes(t) ||
          (p.description || '').toLowerCase().includes(t) ||
          prov.toLowerCase().includes(t)
        );
      });
    }
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, gestionQuery, suppliers]);

  const selectedProduct = useMemo(() => productos.find((p) => p.id === selectedId) || null, [productos, selectedId]);

  useEffect(() => {
    if (!selectedProduct) return;
    setEditName(selectedProduct.name ?? '');
    setEditDescription(selectedProduct.description ?? '');
    setEditPrice(String(selectedProduct.price ?? ''));
    setEditSupplier(String(selectedProduct.supplier_id ?? ''));
    setEditTouched(false);
    setEditErrors({});
  }, [selectedProduct]);

  // ===== Validaciones =====
  function validateCreate() {
    const missing = [];
    const errors = {};

    if (!fNombre.trim()) {
      errors.name = true;
      missing.push('Nombre');
    }

    const priceNum = Number(fPrecio);
    if (fPrecio === '' || !Number.isFinite(priceNum)) {
      errors.price = true;
      missing.push('Precio');
    }

    if (!fProveedor) {
      errors.proveedor = true;
      missing.push('Proveedor');
    }

    if (!errors.price && Number(priceNum) < 0) {
      errors.price = true;
      missing.push('Precio (no puede ser negativo)');
    }

    return { ok: missing.length === 0, missing, errors, priceNum };
  }

  function validateEdit() {
    const missing = [];
    const errors = {};

    if (!editName.trim()) {
      errors.name = true;
      missing.push('Nombre');
    }

    const priceNum = Number(editPrice);
    if (editPrice === '' || !Number.isFinite(priceNum)) {
      errors.price = true;
      missing.push('Precio');
    }

    if (!editSupplier) {
      errors.proveedor = true;
      missing.push('Proveedor');
    }

    if (!errors.price && Number(priceNum) < 0) {
      errors.price = true;
      missing.push('Precio (no puede ser negativo)');
    }

    return { ok: missing.length === 0, missing, errors, priceNum };
  }

  // ===== Acciones =====
  async function crearProducto(e) {
    e?.preventDefault?.();

    setCreateTouched(true);
    const v = validateCreate();
    setCreateErrors(v.errors);

    if (!v.ok) {
      const msg = `Completa: ${v.missing.join(', ')}.`;
      try {
        sileo.warning({ title: '⚠️ Faltan campos obligatorios', description: msg });
      } catch {}
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: fNombre.trim(),
        description: fDesc.trim(),
        price: v.priceNum,
        supplier_id: Number(fProveedor),
      };

      const res = await fetch(`${API_URL}productos/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);

      const nuevo = await res.json();
      setProductos((prev) => [nuevo, ...prev]);

      try {
        sileo.success({
          title: '📦 Producto creado',
          description: `“${nuevo.name}” · ${eur(nuevo.price)} · Proveedor: ${supplierName(nuevo.supplier_id)}`,
        });
      } catch {}

      setFNombre('');
      setFDesc('');
      setFPrecio('');
      setFProveedor('');
      setCreateTouched(false);
      setCreateErrors({});
      setCreateModalOpen(false);
    } catch (e2) {
      try {
        sileo.error({ title: '❌ No se pudo crear el producto', description: e2.message });
      } catch {}
    } finally {
      setSaving(false);
    }
  }

  async function actualizarProducto() {
    setEditTouched(true);

    if (!selectedProduct) {
      try {
        sileo.warning({ title: '⚠️ Selecciona un producto', description: 'Elige un producto de la lista para actualizar.' });
      } catch {}
      return;
    }

    const v = validateEdit();
    setEditErrors(v.errors);

    if (!v.ok) {
      const msg = `Completa: ${v.missing.join(', ')}.`;
      try {
        sileo.warning({ title: '⚠️ Faltan campos obligatorios', description: msg });
      } catch {}
      return;
    }

    setUpdating(true);
    try {
      const id = selectedProduct.id;
      const body = {
        name: editName.trim(),
        description: editDescription.trim(),
        price: v.priceNum,
        supplier_id: Number(editSupplier),
      };

      const res = await fetch(`${API_URL}productos/put/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);

      const updated = await res.json();
      setProductos((prev) => prev.map((p) => (p.id === id ? updated : p)));

      try {
        sileo.success({ title: '✏️ Producto actualizado', description: `Cambios guardados en “${updated.name}”.` });
      } catch {}

      setEditTouched(false);
      setEditErrors({});
    } catch (e2) {
      try {
        sileo.error({ title: '❌ No se pudo actualizar', description: e2.message });
      } catch {}
    } finally {
      setUpdating(false);
    }
  }

  function abrirModalBorrar(producto) {
    setDeleteTarget(producto ? { id: producto.id, nombre: producto.name } : null);
    setDeleteModalOpen(true);
  }

  async function confirmarBorrado() {
    if (!deleteTarget?.id) return;
    const id = deleteTarget.id;

    setDelBusyId(id);

    try {
      const res = await fetch(`${API_URL}productos/delete/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const txt = await res.text();
        let msg = txt;
        try {
          const j = JSON.parse(txt);
          msg = j?.detail || j?.message || txt;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      setProductos((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);

      try {
        sileo.success({ title: '🗑️ Producto eliminado', description: `Se ha eliminado “${deleteTarget.name}”.` });
      } catch {}

      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (e2) {
      try {
        sileo.error({ title: '⛔ No se pudo eliminar', description: e2.message });
      } catch {}
    } finally {
      setDelBusyId(null);
    }
  }

  function clearFilters() {
    setQuery('');
    setProvFilter('');
    setMinPrecio('');
    setMaxPrecio('');
    setSort('nombre_az');
    setPage(1);
  }

  function toggleProviderOpen(pid) {
    setOpenProviders((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  function anyFilterActive() {
    return (
      (q || '').trim() ||
      provFilter ||
      minPrecio !== '' ||
      maxPrecio !== '' ||
      sort !== 'nombre_az'
    );
  }

  function sortLabel(v) {
    const labels = {
      nombre_az: t('products.orderNameAZ'),
      nombre_za: t('products.orderNameZA'),
      precio_up: t('products.orderPriceUp'),
      precio_down: t('products.orderPriceDown'),
      prov_az: t('products.orderSupplierAZ'),
      prov_za: t('products.orderSupplierZA'),
    };
    return labels[v] || v;
  }

  const chips = useMemo(() => {
    const list = [];
    if (q) list.push({ key: 'q', label: t('products.chipSearch', { q }), onRemove: () => setQuery('') });
    if (provFilter)
      list.push({
        key: 'prov',
        label: t('products.chipSupplier', { name: supplierName(Number(provFilter)) }),
        onRemove: () => setProvFilter(''),
      });
    if (minPrecio !== '' || maxPrecio !== '')
      list.push({
        key: 'precio',
        label: `${t('products.priceLabel')}: ${minPrecio !== '' ? `${minPrecio}€` : '—'} – ${maxPrecio !== '' ? `${maxPrecio}€` : '—'}`,
        onRemove: () => {
          setMinPrecio('');
          setMaxPrecio('');
        },
      });
    if (sort !== 'nombre_az')
      list.push({
        key: 'sort',
        label: t('products.chipOrder', { label: sortLabel(sort) }),
        onRemove: () => setSort('nombre_az'),
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, provFilter, minPrecio, maxPrecio, sort, suppliers]);

  // ===== UI =====
  if (loading) return <div className="p-6">{t('products.loading')}</div>;
  if (err) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-red-600">Error: {err}</div>
        <Button variant="secondary" onClick={() => fetchData()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const listadoEmpty = groupMode === 'all' ? filteredBase.length === 0 : providerCards.length === 0;

  // helpers clases error
  const labelReq = (isErr) => (isErr ? 'text-sm mb-1 text-red-700 font-medium' : 'text-sm mb-1');
  const inputReq = (isErr) =>
    isErr
      ? 'border border-red-400 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-200'
      : 'border rounded-lg px-3 py-2 w-full';
  const selectReq = inputReq;

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{t('products.title')}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${tab === 'listado' ? 'btn-accent' : 'bg-white text-gray-700'}`}
              onClick={() => setTab('listado')}
              type="button"
            >
              {t('products.tabList')}
            </button>
            <button
              className={`px-4 py-2 text-sm border-l border-gray-300 ${
                tab === 'gestion' ? 'btn-accent' : 'bg-white text-gray-700'
              }`}
              onClick={() => setTab('gestion')}
              type="button"
            >
              {t('products.tabManage')}
            </button>
          </div>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)} type="button">
            {t('products.newProduct')}
          </Button>
        </div>
      </div>

      {tab === 'listado' ? (
        <>
          {/* Barra superior */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('products.searchPlaceholder')}
                  className="border rounded-lg px-3 py-2 pr-20 w-full"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="Limpiar"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant={anyFilterActive() ? 'primary' : 'secondary'} onClick={() => setFiltersOpen(true)} type="button">
                  {t('products.filterBtn')} {anyFilterActive() ? `(${chips.length})` : ''}
                </Button>

                <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGroupMode('all')}
                    className={`px-3 py-2 text-sm ${groupMode === 'all' ? 'btn-accent' : 'bg-white text-gray-700'}`}
                    title={t('products.viewAll')}
                  >
                    {t('products.viewAllBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode('proveedor')}
                    className={`px-3 py-2 text-sm border-l border-gray-300 ${
                      groupMode === 'proveedor' ? 'btn-accent' : 'bg-white text-gray-700'
                    }`}
                    title={t('products.groupBySupplier')}
                  >
                    {t('products.bySupplier')}
                  </button>
                </div>
                {groupMode === 'proveedor' && (
                  <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const next = {};
                        for (const pc of providerCards) next[pc.proveedor.id] = true;
                        setOpenProviders(next);
                      }}
                      className="px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50"
                    >
                      {t('products.expandAll')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenProviders({})}
                      className="px-3 py-2 text-sm border-l border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      {t('products.collapseAll')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {chips.map((ch) => (
                  <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />
                ))}
                <Button variant="secondary" onClick={clearFilters} className="h-8 px-3 py-1 rounded-lg">
                  {t('products.clearFilters')}
                </Button>
              </div>
            )}
          </div>

          {/* Modal filtros */}
          <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('products.filtersTitle')} maxWidth="max-w-4xl">
            <div className="space-y-4">
              <div className="grid lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4">
                  <label className="block text-sm mb-1">{t('products.supplierLabel')}</label>
                  <select value={provFilter} onChange={(e) => setProvFilter(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
                    <option value="">{t('products.allSuppliers')}</option>
                    {suppliers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-sm mb-1">{t('products.orderLabel')}</label>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
                    <option value="nombre_az">{t('products.orderNameAZ')}</option>
                    <option value="nombre_za">{t('products.orderNameZA')}</option>
                    <option value="precio_up">{t('products.orderPriceUp')}</option>
                    <option value="precio_down">{t('products.orderPriceDown')}</option>
                    <option value="prov_az">{t('products.orderSupplierAZ')}</option>
                    <option value="prov_za">{t('products.orderSupplierZA')}</option>
                  </select>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-sm mb-1">{t('products.pageSizeLabel')}</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border rounded-lg px-3 py-2 w-full"
                    disabled={groupMode !== 'all'}
                    title={groupMode !== 'all' ? t('products.pageSizeDisabled') : ''}
                  >
                    <option value={8}>8 / pág</option>
                    <option value={12}>12 / pág</option>
                    <option value={20}>20 / pág</option>
                    <option value={40}>40 / pág</option>
                  </select>
                </div>

                <div className="lg:col-span-6">
                  <label className="block text-sm mb-1">{t('products.minPriceLabel')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={minPrecio}
                      onChange={(e) => setMinPrecio(clampNumberInput(e.target.value))}
                      className={`border rounded-lg px-3 py-2 w-full ${precioRangeInvalid ? 'border-red-400' : ''}`}
                    placeholder={t('products.minPricePlaceholder') || 'Min €'}
                  />
                </div>
                <div className="lg:col-span-6">
                  <label className="block text-sm mb-1">{t('products.maxPriceLabel')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={maxPrecio}
                      onChange={(e) => setMaxPrecio(clampNumberInput(e.target.value))}
                      className={`border rounded-lg px-3 py-2 w-full ${precioRangeInvalid ? 'border-red-400' : ''}`}
                    placeholder={t('products.maxPricePlaceholder') || 'Max €'}
                  />
                </div>
              </div>

              {precioRangeInvalid && (
                <div className="text-sm text-red-600">
                  {t('products.priceRangeError')}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                <Button variant="secondary" onClick={clearFilters} type="button">
                  {t('products.clearFilters')}
                </Button>
                <Button variant="secondary" onClick={() => setFiltersOpen(false)} type="button">
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Contenido */}
          {listadoEmpty ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <div className="text-lg font-semibold">{t('products.noResults')}</div>
              <div className="text-gray-600 mt-1">{t('products.noResultsHint')}</div>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" onClick={clearFilters}>
                  {t('products.clearFilters')}
                </Button>
                <Button variant="primary" onClick={() => setTab('gestion')}>
                  {t('products.createProduct')}
                </Button>
              </div>
            </div>
          ) : groupMode === 'all' ? (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pageSlice.map((p) => (
                    <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">#{p.id}</div>
                          <div className="font-semibold truncate">{p.name}</div>
                        </div>
                        <div className="font-semibold">{eur(p.price)}</div>
                      </div>

                      <div className="text-sm text-gray-700 mt-2">
                        <div className="text-xs text-gray-500 mb-1">{t('products.descriptionLabel')}</div>
                        <div className="max-h-16 overflow-hidden">{p.description || '—'}</div>
                      </div>

                      <div className="mt-3 text-sm">
                        <span className="text-gray-500">{t('products.supplierPrefix')}</span> {supplierName(p.supplier_id)}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="secondary"
                          className="px-3 py-2"
                          onClick={() => {
                            setTab('gestion');
                            setSelectedId(p.id);
                            setGestionQuery(String(p.id));
                          }}
                          type="button"
                        >
                          {t('products.manageBtn')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  {t('products.showingRange', {
                    from: (safePage - 1) * Number(pageSize || 12) + 1,
                    to: Math.min(safePage * Number(pageSize || 12), filteredBase.length),
                    total: filteredBase.length,
                  })}
                </div>
                <Pagination
                  page={safePage}
                  total={filteredBase.length}
                  pageSize={Number(pageSize || 12)}
                  onChange={setPage}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3">
                {providerCards.map(({ proveedor, items }) => {
                  const pid = proveedor.id;
                  const open = !!openProviders[pid];
                  return (
                    <div key={pid} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleProviderOpen(pid)}
                        className="w-full text-left px-4 py-4 hover:bg-gray-50 transition flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs text-gray-500">{t('products.supplierNumber', { id: pid })}</div>
                          <div className="text-lg font-semibold">{proveedor.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {items.length} {items.length !== 1 ? t('products.productPlural') : t('products.productSingular')}
                          </div>
                        </div>
                        <div className="text-gray-500 text-sm">{open ? t('products.hide') : t('products.show')}</div>
                      </button>

                      {open && (
                        <div className="border-t bg-gray-50 p-4">
                          <div className="overflow-x-auto">
                            <div className="min-w-[600px] grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {items.map((p) => (
                                <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-xs text-gray-500">#{p.id}</div>
                                      <div className="font-semibold truncate">{p.name}</div>
                                    </div>
                                    <div className="font-semibold">{eur(p.price)}</div>
                                  </div>

                                  <div className="text-sm text-gray-700 mt-2">
                                    <div className="text-xs text-gray-500 mb-1">{t('products.descriptionLabel')}</div>
                                    <div className="max-h-16 overflow-hidden">{p.description || '—'}</div>
                                  </div>

                                  <div className="mt-4 flex gap-2">
                                    <Button
                                      variant="secondary"
                                      className="px-3 py-2"
                                      onClick={() => {
                                        setTab('gestion');
                                        setSelectedId(p.id);
                                        setGestionQuery(String(p.id));
                                      }}
                                      type="button"
                                    >
                                      {t('products.manageBtn')}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>


            </>
          )}
        </>
      ) : (
        <>
          {/* Gestión */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <h3 className="font-semibold">{t('products.manage')}</h3>

              <div className="relative w-full lg:w-[420px]">
                <input
                  value={gestionQuery}
                  onChange={(e) => setGestionQuery(e.target.value)}
                  placeholder={t('products.searchPlaceholder')}
                  className="border rounded-lg px-3 py-2 pr-16 w-full"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
                {gestionQuery && (
                  <button
                    type="button"
                    onClick={() => setGestionQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="Limpiar"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-3">
              {/* Lista */}
              <div className="lg:col-span-5 border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 border-b">{t('products.results')}</div>
                <div className="max-h-[420px] overflow-auto">
                  {gestionList.length === 0 ? (
                    <div className="p-3 text-gray-500">{t('products.noManageResults')}</div>
                  ) : (
                    <ul className="divide-y">
                      {gestionList.map((p) => {
                        const active = p.id === selectedId;
                        const btnClass = active
                          ? 'w-full text-left px-3 py-3 transition !bg-[var(--fg-accent)] !text-white hover:opacity-85 focus:outline-none'
                          : 'w-full text-left px-3 py-3 transition bg-white text-gray-900 hover:bg-gray-50 focus:outline-none';

                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(p.id);
                              }}
                              className={btnClass}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className={active ? 'font-semibold truncate text-white' : 'font-semibold truncate text-gray-900'}>
                                    {p.name}
                                  </div>
                                  <div className={active ? 'text-xs mt-1 text-white/80' : 'text-xs mt-1 text-gray-500'}>
                                    {supplierName(p.supplier_id)}
                                  </div>
                                </div>
                                <div className={active ? 'font-semibold text-white' : 'font-semibold text-gray-900'}>{eur(p.price)}</div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="lg:col-span-7 border rounded-xl p-4">
                {!selectedProduct ? (
                  <div className="text-gray-600">
                    {t('products.selectProduct')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-gray-500">{t('products.editing')}</div>
                        <div className="text-lg font-semibold">
                          #{selectedProduct.id} · {selectedProduct.name}
                        </div>
                      </div>

                      <Button
                        variant="danger"
                        type="button"
                        onClick={() => abrirModalBorrar(selectedProduct)}
                        disabled={delBusyId === selectedProduct.id}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>

                    <div
                      className="grid md:grid-cols-2 gap-3"
                      onChange={() => {
                        if (editTouched) {
                          const v = validateEdit();
                          setEditErrors(v.errors);
                        }
                      }}
                    >
                      <div>
                        <label className={labelReq(editTouched && !!editErrors.name)}>
                          {t('products.nameLabel')}<RequiredAsterisk />
                        </label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputReq(editTouched && !!editErrors.name)}
                        />
                      </div>

                      <div>
                        <label className={labelReq(editTouched && !!editErrors.price)}>
                          {t('products.priceLabel')}<RequiredAsterisk />
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(clampNumberInput(e.target.value))}
                          className={inputReq(editTouched && !!editErrors.price)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm mb-1">{t('products.descriptionLabel')}</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="border rounded-lg px-3 py-2 w-full"
                          rows={3}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelReq(editTouched && !!editErrors.proveedor)}>
                          {t('products.supplierLabel')}<RequiredAsterisk />
                        </label>
                        <select
                          value={editSupplier}
                          onChange={(e) => setEditSupplier(e.target.value)}
                          className={selectReq(editTouched && !!editErrors.proveedor)}
                        >
                          <option value="">{t('products.selectSupplier')}</option>
                          {suppliers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" onClick={actualizarProducto} disabled={updating}>
                        {updating ? t('products.updating') : t('products.update')}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditName(selectedProduct.name ?? '');
                          setEditDescription(selectedProduct.description ?? '');
                          setEditPrice(String(selectedProduct.price ?? ''));
                          setEditSupplier(String(selectedProduct.supplier_id ?? ''));
                          setEditTouched(false);
                          setEditErrors({});
                        }}
                        disabled={updating}
                      >
                        {t('products.revert')}
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Nota: la actualización usa <code>PUT /api/productos/put/{'{id}'}</code>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ✅ Modal confirmación borrar */}
          <Modal
            open={deleteModalOpen}
            onClose={() => {
              if (delBusyId) return;
              setDeleteModalOpen(false);
              setDeleteTarget(null);
            }}
            title={t('products.confirmDelete')}
            maxWidth="max-w-xl"
          >
            <div className="space-y-3">
              <div className="text-gray-800">
                {t('products.deleteConfirmText')}{' '}
                <b>{deleteTarget ? `#${deleteTarget.id} · ${deleteTarget.name}` : t('products.thisProduct')}</b>?
              </div>

              <div className="text-sm text-gray-600">{t('products.usedInAlbaranes')}</div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    if (delBusyId) return;
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                  }}
                  disabled={!!delBusyId}
                >
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" type="button" onClick={confirmarBorrado} disabled={!deleteTarget?.id || !!delBusyId}>
                  {delBusyId ? t('products.deleting') : t('common.delete')}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ✅ Modal: Crear nuevo producto — siempre montado, disponible desde cualquier tab */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateTouched(false);
          setCreateErrors({});
        }}
        title={t('products.newProduct')}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={crearProducto}
          className="grid md:grid-cols-2 gap-3"
          onChange={() => {
            if (createTouched) {
              const v = validateCreate();
              setCreateErrors(v.errors);
            }
          }}
        >
          <div>
            <label className={labelReq(createTouched && !!createErrors.name)}>
              {t('products.nameLabel')}<RequiredAsterisk />
            </label>
            <input
              value={fNombre}
              onChange={(e) => setFNombre(e.target.value)}
              className={inputReq(createTouched && !!createErrors.name)}
              placeholder={t('products.namePlaceholder')}
            />
          </div>

          <div>
            <label className={labelReq(createTouched && !!createErrors.price)}>
              {t('products.priceLabel')}<RequiredAsterisk />
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fPrecio}
              onChange={(e) => setFPrecio(clampNumberInput(e.target.value))}
              className={inputReq(createTouched && !!createErrors.price)}
              placeholder={t('products.pricePlaceholder')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">{t('products.descriptionLabel')}</label>
            <textarea
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
              rows={3}
              placeholder={t('products.descPlaceholder')}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelReq(createTouched && !!createErrors.proveedor)}>
              {t('products.supplierLabel')}<RequiredAsterisk />
            </label>
            <select
              value={fProveedor}
              onChange={(e) => setFProveedor(e.target.value)}
              className={selectReq(createTouched && !!createErrors.proveedor)}
            >
              <option value="">{t('products.selectSupplier')}</option>
              {suppliers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? t('products.saving') : t('products.createProduct')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFNombre('');
                setFDesc('');
                setFPrecio('');
                setFProveedor('');
                setCreateTouched(false);
                setCreateErrors({});
              }}
              disabled={saving}
            >
              {t('products.clean')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
