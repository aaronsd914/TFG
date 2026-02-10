// frontend/src/components/ProductosPage.jsx
import React, { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:8000/api/';

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
    primary: 'bg-black text-white hover:bg-black/90',
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
              className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-lg"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Notice({ type = 'success', title, children, onClose }) {
  const styles = {
    success: {
      wrap: 'border-green-200 bg-green-50',
      dot: 'bg-green-600',
      title: 'text-green-900',
      text: 'text-green-800',
      btn: 'hover:bg-green-100',
    },
    error: {
      wrap: 'border-red-200 bg-red-50',
      dot: 'bg-red-600',
      title: 'text-red-900',
      text: 'text-red-800',
      btn: 'hover:bg-red-100',
    },
    info: {
      wrap: 'border-gray-200 bg-gray-50',
      dot: 'bg-gray-600',
      title: 'text-gray-900',
      text: 'text-gray-700',
      btn: 'hover:bg-gray-100',
    },
  }[type];

  return (
    <div className={`border rounded-2xl p-4 flex items-start justify-between gap-3 ${styles.wrap}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 inline-block w-2.5 h-2.5 rounded-full ${styles.dot}`} />
        <div>
          {title ? <div className={`font-semibold ${styles.title}`}>{title}</div> : null}
          <div className={`text-sm mt-1 ${styles.text}`}>{children}</div>
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${styles.btn}`}
          aria-label="Cerrar aviso"
        >
          ×
        </button>
      ) : null}
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
  // preferencias persistidas
  const [tab, setTab] = useLocalStorageState('productos.tab', 'listado'); // listado | gestion
  const [groupMode, setGroupMode] = useLocalStorageState('productos.groupMode', 'all'); // all | proveedor
  const [pageSize, setPageSize] = useLocalStorageState('productos.pageSize', 12);

  // datos
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

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
  const [soloConDescripcion, setSoloConDescripcion] = useState(false);
  const [soloPrecioMayor0, setSoloPrecioMayor0] = useState(false);

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
  const [createBanner, setCreateBanner] = useState(null);

  // editar (gestion)
  const [selectedId, setSelectedId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrecio, setEditPrecio] = useState('');
  const [editProveedor, setEditProveedor] = useState('');
  const [updating, setUpdating] = useState(false);

  // validación edición
  const [editTouched, setEditTouched] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editBanner, setEditBanner] = useState(null);

  // borrar
  const [delBusyId, setDelBusyId] = useState(null);

  // ✅ modal confirmación borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id,nombre}
  const [deleteModalMsg, setDeleteModalMsg] = useState(null); // {type,title,content}

  const provName = (id) => proveedores.find((x) => x.id === id)?.nombre || `#${id}`;

  async function fetchData() {
    try {
      setLoading(true);
      setErr(null);

      const [rp, rpr] = await Promise.all([fetch(`${API_URL}productos/get`), fetch(`${API_URL}proveedores/get`)]);
      if (!rp.ok) throw new Error(`Productos HTTP ${rp.status}`);
      if (!rpr.ok) throw new Error(`Proveedores HTTP ${rpr.status}`);

      const [ps, prs] = await Promise.all([rp.json(), rpr.json()]);
      setProductos(ps);
      setProveedores(prs);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
     
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, provFilter, minPrecio, maxPrecio, sort, pageSize, soloConDescripcion, soloPrecioMayor0, groupMode]);

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
          (p.nombre || '').toLowerCase().includes(t) ||
          (p.descripcion || '').toLowerCase().includes(t) ||
          String(p.id).includes(t) ||
          provName(p.proveedor_id).toLowerCase().includes(t)
      );
    }

    if (provFilter) list = list.filter((p) => String(p.proveedor_id) === String(provFilter));
    if (soloConDescripcion) list = list.filter((p) => (p.descripcion || '').trim().length > 0);
    if (soloPrecioMayor0) list = list.filter((p) => Number(p.precio || 0) > 0);

    const min = minPrecio === '' ? null : Number(minPrecio);
    const max = maxPrecio === '' ? null : Number(maxPrecio);

    if (!precioRangeInvalid) {
      if (min !== null && Number.isFinite(min)) list = list.filter((p) => Number(p.precio || 0) >= min);
      if (max !== null && Number.isFinite(max)) list = list.filter((p) => Number(p.precio || 0) <= max);
    }

    switch (sort) {
      case 'nombre_az':
        list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        break;
      case 'nombre_za':
        list.sort((a, b) => (b.nombre || '').localeCompare(a.nombre || ''));
        break;
      case 'precio_up':
        list.sort((a, b) => (a.precio || 0) - (b.precio || 0));
        break;
      case 'precio_down':
        list.sort((a, b) => (b.precio || 0) - (a.precio || 0));
        break;
      case 'prov_az':
        list.sort((a, b) => provName(a.proveedor_id).localeCompare(provName(b.proveedor_id)));
        break;
      case 'prov_za':
        list.sort((a, b) => provName(b.proveedor_id).localeCompare(provName(a.proveedor_id)));
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
    soloConDescripcion,
    soloPrecioMayor0,
    proveedores,
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
      const pid = Number(p.proveedor_id);
      if (!map.has(pid)) {
        const prov = proveedores.find((x) => x.id === pid) || { id: pid, nombre: `Proveedor #${pid}` };
        map.set(pid, { proveedor: prov, items: [] });
      }
      map.get(pid).items.push(p);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.proveedor?.nombre || '').localeCompare(b.proveedor?.nombre || ''));
    return arr;
  }, [filteredBase, proveedores]);

  // ===== GESTIÓN LISTA =====
  const gestionList = useMemo(() => {
    let list = [...productos];
    const t = gestionQuery.trim().toLowerCase();
    if (t) {
      list = list.filter((p) => {
        const prov = provName(p.proveedor_id);
        return (
          String(p.id).includes(t) ||
          (p.nombre || '').toLowerCase().includes(t) ||
          (p.descripcion || '').toLowerCase().includes(t) ||
          prov.toLowerCase().includes(t)
        );
      });
    }
    list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return list;
  }, [productos, gestionQuery, proveedores]);

  const selectedProduct = useMemo(() => productos.find((p) => p.id === selectedId) || null, [productos, selectedId]);

  // ✅ FIX: NO borramos el banner aquí (antes se iba al actualizar porque cambiaba el objeto del producto)
  useEffect(() => {
    if (!selectedProduct) return;
    setEditNombre(selectedProduct.nombre ?? '');
    setEditDesc(selectedProduct.descripcion ?? '');
    setEditPrecio(String(selectedProduct.precio ?? ''));
    setEditProveedor(String(selectedProduct.proveedor_id ?? ''));
    setEditTouched(false);
    setEditErrors({});
    // NO: setEditBanner(null);
  }, [selectedProduct]);

  // ===== Validaciones =====
  function validateCreate() {
    const missing = [];
    const errors = {};

    if (!fNombre.trim()) {
      errors.nombre = true;
      missing.push('Nombre');
    }

    const precioNum = Number(fPrecio);
    if (fPrecio === '' || !Number.isFinite(precioNum)) {
      errors.precio = true;
      missing.push('Precio');
    }

    if (!fProveedor) {
      errors.proveedor = true;
      missing.push('Proveedor');
    }

    if (!errors.precio && Number(precioNum) < 0) {
      errors.precio = true;
      missing.push('Precio (no puede ser negativo)');
    }

    return { ok: missing.length === 0, missing, errors, precioNum };
  }

  function validateEdit() {
    const missing = [];
    const errors = {};

    if (!editNombre.trim()) {
      errors.nombre = true;
      missing.push('Nombre');
    }

    const precioNum = Number(editPrecio);
    if (editPrecio === '' || !Number.isFinite(precioNum)) {
      errors.precio = true;
      missing.push('Precio');
    }

    if (!editProveedor) {
      errors.proveedor = true;
      missing.push('Proveedor');
    }

    if (!errors.precio && Number(precioNum) < 0) {
      errors.precio = true;
      missing.push('Precio (no puede ser negativo)');
    }

    return { ok: missing.length === 0, missing, errors, precioNum };
  }

  // ===== Acciones =====
  async function crearProducto(e) {
    e?.preventDefault?.();

    setCreateTouched(true);
    setCreateBanner(null);

    const v = validateCreate();
    setCreateErrors(v.errors);

    if (!v.ok) {
      setCreateBanner({
        type: 'error',
        title: 'Faltan campos obligatorios',
        content: `Completa: ${v.missing.join(', ')}.`,
      });
      return;
    }

    setSaving(true);
    try {
      const body = {
        nombre: fNombre.trim(),
        descripcion: fDesc.trim(),
        precio: v.precioNum,
        proveedor_id: Number(fProveedor),
      };

      const res = await fetch(`${API_URL}productos/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);

      const nuevo = await res.json();
      setProductos((prev) => [nuevo, ...prev]);

      setCreateBanner({
        type: 'success',
        title: 'Producto creado',
        content: `Se ha creado “${nuevo.nombre}” (${eur(nuevo.precio)}) con proveedor ${provName(nuevo.proveedor_id)}.`,
      });

      setFNombre('');
      setFDesc('');
      setFPrecio('');
      setFProveedor('');
      setCreateTouched(false);
      setCreateErrors({});
    } catch (e2) {
      setCreateBanner({
        type: 'error',
        title: 'No se pudo crear el producto',
        content: e2.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function actualizarProducto() {
    setEditTouched(true);
    // NO limpiamos el banner al empezar: queda lo anterior hasta que haya resultado nuevo
    // setEditBanner(null);

    if (!selectedProduct) {
      setEditBanner({ type: 'error', title: 'Selecciona un producto', content: 'Elige un producto de la lista para actualizar.' });
      return;
    }

    const v = validateEdit();
    setEditErrors(v.errors);

    if (!v.ok) {
      setEditBanner({
        type: 'error',
        title: 'Faltan campos obligatorios',
        content: `Completa: ${v.missing.join(', ')}.`,
      });
      return;
    }

    setUpdating(true);
    try {
      const id = selectedProduct.id;
      const body = {
        nombre: editNombre.trim(),
        descripcion: editDesc.trim(),
        precio: v.precioNum,
        proveedor_id: Number(editProveedor),
      };

      const res = await fetch(`${API_URL}productos/put/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);

      const updated = await res.json();
      setProductos((prev) => prev.map((p) => (p.id === id ? updated : p)));

      // ✅ persiste: ya NO se borra por el useEffect de selectedProduct
      setEditBanner({
        type: 'success',
        title: 'Producto actualizado',
        content: `Cambios guardados en “${updated.nombre}”.`,
      });

      setEditTouched(false);
      setEditErrors({});
    } catch (e2) {
      setEditBanner({
        type: 'error',
        title: 'No se pudo actualizar',
        content: e2.message,
      });
    } finally {
      setUpdating(false);
    }
  }

  function abrirModalBorrar(producto) {
    setDeleteTarget(producto ? { id: producto.id, nombre: producto.nombre } : null);
    setDeleteModalMsg(null);
    setDeleteModalOpen(true);
  }

  async function confirmarBorrado() {
    if (!deleteTarget?.id) return;
    const id = deleteTarget.id;

    setDeleteModalMsg(null);
    setDelBusyId(id);

    try {
      const res = await fetch(`${API_URL}productos/delete/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        // backend ahora devuelve 409 con detail si está referenciado
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

      // ok
      setProductos((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);

      setDeleteModalMsg({
        type: 'success',
        title: 'Producto eliminado',
        content: `Se ha eliminado “${deleteTarget.nombre}”.`,
      });

      // cerramos tras éxito con un pequeño delay (opcional). Si quieres, lo quito.
      setTimeout(() => {
        setDeleteModalOpen(false);
        setDeleteTarget(null);
        setDeleteModalMsg(null);
      }, 700);
    } catch (e2) {
      setDeleteModalMsg({
        type: 'error',
        title: 'No se pudo eliminar',
        content: e2.message,
      });
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
    setSoloConDescripcion(false);
    setSoloPrecioMayor0(false);
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
      sort !== 'nombre_az' ||
      soloConDescripcion ||
      soloPrecioMayor0
    );
  }

  function sortLabel(v) {
    const labels = {
      nombre_az: 'Nombre A→Z',
      nombre_za: 'Nombre Z→A',
      precio_up: 'Precio ↑',
      precio_down: 'Precio ↓',
      prov_az: 'Proveedor A→Z',
      prov_za: 'Proveedor Z→A',
    };
    return labels[v] || v;
  }

  const chips = useMemo(() => {
    const list = [];
    if (q) list.push({ key: 'q', label: `Buscar: "${q}"`, onRemove: () => setQuery('') });
    if (provFilter)
      list.push({
        key: 'prov',
        label: `Proveedor: ${provName(Number(provFilter))}`,
        onRemove: () => setProvFilter(''),
      });
    if (minPrecio !== '' || maxPrecio !== '')
      list.push({
        key: 'precio',
        label: `Precio: ${minPrecio !== '' ? `${minPrecio}€` : '—'} – ${maxPrecio !== '' ? `${maxPrecio}€` : '—'}`,
        onRemove: () => {
          setMinPrecio('');
          setMaxPrecio('');
        },
      });
    if (sort !== 'nombre_az')
      list.push({
        key: 'sort',
        label: `Orden: ${sortLabel(sort)}`,
        onRemove: () => setSort('nombre_az'),
      });
    if (soloConDescripcion) list.push({ key: 'desc', label: 'Solo con descripción', onRemove: () => setSoloConDescripcion(false) });
    if (soloPrecioMayor0) list.push({ key: 'p0', label: 'Precio > 0', onRemove: () => setSoloPrecioMayor0(false) });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, provFilter, minPrecio, maxPrecio, sort, soloConDescripcion, soloPrecioMayor0, proveedores]);

  // ===== UI =====
  if (loading) return <div className="p-6">Cargando productos…</div>;
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Productos</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${tab === 'listado' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setTab('listado')}
              type="button"
            >
              Listado
            </button>
            <button
              className={`px-4 py-2 text-sm border-l border-gray-300 ${
                tab === 'gestion' ? 'bg-black text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setTab('gestion')}
              type="button"
            >
              Gestión
            </button>
          </div>
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
                  placeholder="Buscar por ID, nombre, descripción o proveedor…"
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
                  Filtros {anyFilterActive() ? `(${chips.length})` : ''}
                </Button>

                <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGroupMode('all')}
                    className={`px-3 py-2 text-sm ${groupMode === 'all' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
                    title="Ver todos los productos"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupMode('proveedor')}
                    className={`px-3 py-2 text-sm border-l border-gray-300 ${
                      groupMode === 'proveedor' ? 'bg-black text-white' : 'bg-white text-gray-700'
                    }`}
                    title="Agrupar por proveedor"
                  >
                    Por proveedor
                  </button>
                </div>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {chips.map((ch) => (
                  <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />
                ))}
                <Button variant="secondary" onClick={clearFilters} className="h-8 px-3 py-1 rounded-lg">
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>

          {/* Modal filtros */}
          <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros de productos" maxWidth="max-w-4xl">
            <div className="space-y-4">
              <div className="grid lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4">
                  <label className="block text-sm mb-1">Proveedor</label>
                  <select value={provFilter} onChange={(e) => setProvFilter(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
                    <option value="">Todos los proveedores</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-sm mb-1">Orden</label>
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
                    <option value="nombre_az">Nombre A→Z</option>
                    <option value="nombre_za">Nombre Z→A</option>
                    <option value="precio_up">Precio ↑</option>
                    <option value="precio_down">Precio ↓</option>
                    <option value="prov_az">Proveedor A→Z</option>
                    <option value="prov_za">Proveedor Z→A</option>
                  </select>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-sm mb-1">Tamaño de página (modo “Todos”)</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border rounded-lg px-3 py-2 w-full"
                    disabled={groupMode !== 'all'}
                    title={groupMode !== 'all' ? 'La paginación se aplica en el modo “Todos”' : ''}
                  >
                    <option value={8}>8 / pág</option>
                    <option value={12}>12 / pág</option>
                    <option value={20}>20 / pág</option>
                    <option value={40}>40 / pág</option>
                  </select>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm mb-1">Precio mínimo (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={minPrecio}
                      onChange={(e) => setMinPrecio(clampNumberInput(e.target.value))}
                      className={`border rounded-lg px-3 py-2 w-full ${precioRangeInvalid ? 'border-red-400' : ''}`}
                      placeholder="Min €"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Precio máximo (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={maxPrecio}
                      onChange={(e) => setMaxPrecio(clampNumberInput(e.target.value))}
                      className={`border rounded-lg px-3 py-2 w-full ${precioRangeInvalid ? 'border-red-400' : ''}`}
                      placeholder="Max €"
                    />
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <label className="block text-sm mb-2">Filtros extra</label>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={soloConDescripcion} onChange={(e) => setSoloConDescripcion(e.target.checked)} />
                      Solo con descripción
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={soloPrecioMayor0} onChange={(e) => setSoloPrecioMayor0(e.target.checked)} />
                      Solo precio &gt; 0
                    </label>
                  </div>
                </div>
              </div>

              {precioRangeInvalid && (
                <div className="text-sm text-red-600">
                  El precio mínimo no puede ser mayor que el máximo. Corrige el rango para aplicar el filtro.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                <Button variant="secondary" onClick={clearFilters} type="button">
                  Limpiar filtros
                </Button>
                <Button variant="secondary" onClick={() => setFiltersOpen(false)} type="button">
                  Cerrar
                </Button>
              </div>
            </div>
          </Modal>

          {/* Contenido */}
          {listadoEmpty ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <div className="text-lg font-semibold">Sin resultados</div>
              <div className="text-gray-600 mt-1">Prueba a quitar filtros o buscar con otro texto.</div>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
                <Button variant="primary" onClick={() => setTab('gestion')}>
                  Crear producto
                </Button>
              </div>
            </div>
          ) : groupMode === 'all' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pageSlice.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">#{p.id}</div>
                        <div className="font-semibold truncate">{p.nombre}</div>
                      </div>
                      <div className="font-semibold">{eur(p.precio)}</div>
                    </div>

                    <div className="text-sm text-gray-700 mt-2">
                      <div className="text-xs text-gray-500 mb-1">Descripción</div>
                      <div className="max-h-16 overflow-hidden">{p.descripcion || '—'}</div>
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="text-gray-500">Proveedor:</span> {provName(p.proveedor_id)}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        className="px-3 py-2"
                        onClick={() => {
                          setTab('gestion');
                          setSelectedId(p.id);
                          setGestionQuery(String(p.id));
                          setEditBanner(null);
                        }}
                        type="button"
                      >
                        Gestionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Mostrando {(safePage - 1) * Number(pageSize || 12) + 1}–{Math.min(safePage * Number(pageSize || 12), filteredBase.length)} de{' '}
                  {filteredBase.length}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setPage(1)} disabled={safePage === 1} type="button">
                    «
                  </Button>
                  <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} type="button">
                    Anterior
                  </Button>
                  <div className="text-sm text-gray-700 px-2">
                    Página <b>{safePage}</b> / {totalPages}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    type="button"
                  >
                    Siguiente
                  </Button>
                  <Button variant="secondary" onClick={() => setPage(totalPages)} disabled={safePage === totalPages} type="button">
                    »
                  </Button>
                </div>
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
                          <div className="text-xs text-gray-500">Proveedor #{pid}</div>
                          <div className="text-lg font-semibold">{proveedor.nombre}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {items.length} producto{items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-gray-500 text-sm">{open ? 'Ocultar' : 'Ver'}</div>
                      </button>

                      {open && (
                        <div className="border-t bg-gray-50 p-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((p) => (
                              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs text-gray-500">#{p.id}</div>
                                    <div className="font-semibold truncate">{p.nombre}</div>
                                  </div>
                                  <div className="font-semibold">{eur(p.precio)}</div>
                                </div>

                                <div className="text-sm text-gray-700 mt-2">
                                  <div className="text-xs text-gray-500 mb-1">Descripción</div>
                                  <div className="max-h-16 overflow-hidden">{p.descripcion || '—'}</div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                  <Button
                                    variant="secondary"
                                    className="px-3 py-2"
                                    onClick={() => {
                                      setTab('gestion');
                                      setSelectedId(p.id);
                                      setGestionQuery(String(p.id));
                                      setEditBanner(null);
                                    }}
                                    type="button"
                                  >
                                    Gestionar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    const next = {};
                    for (const pc of providerCards) next[pc.proveedor.id] = true;
                    setOpenProviders(next);
                  }}
                >
                  Expandir todo
                </Button>
                <Button variant="secondary" type="button" onClick={() => setOpenProviders({})}>
                  Colapsar todo
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Alta de producto */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h3 className="font-semibold">Dar de alta producto</h3>
              <div className="text-sm text-gray-600">
                Campos con <span className="text-red-600 font-semibold">*</span> obligatorios
              </div>
            </div>

            {createBanner ? (
              <Notice type={createBanner.type} title={createBanner.title} onClose={() => setCreateBanner(null)}>
                {createBanner.content}
              </Notice>
            ) : null}

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
                <label className={labelReq(createTouched && !!createErrors.nombre)}>
                  Nombre<RequiredAsterisk />
                </label>
                <input
                  value={fNombre}
                  onChange={(e) => setFNombre(e.target.value)}
                  className={inputReq(createTouched && !!createErrors.nombre)}
                  placeholder="Ej: Mesa de comedor"
                />
              </div>

              <div>
                <label className={labelReq(createTouched && !!createErrors.precio)}>
                  Precio<RequiredAsterisk />
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fPrecio}
                  onChange={(e) => setFPrecio(clampNumberInput(e.target.value))}
                  className={inputReq(createTouched && !!createErrors.precio)}
                  placeholder="Ej: 199.99"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Descripción</label>
                <textarea
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full"
                  rows={3}
                  placeholder="Detalles, medidas, materiales…"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelReq(createTouched && !!createErrors.proveedor)}>
                  Proveedor<RequiredAsterisk />
                </label>
                <select
                  value={fProveedor}
                  onChange={(e) => setFProveedor(e.target.value)}
                  className={selectReq(createTouched && !!createErrors.proveedor)}
                >
                  <option value="">Selecciona proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : 'Crear producto'}
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
                    setCreateBanner(null);
                  }}
                  disabled={saving}
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </section>

          {/* Gestión */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <h3 className="font-semibold">Gestionar productos</h3>

              <div className="relative w-full lg:w-[420px]">
                <input
                  value={gestionQuery}
                  onChange={(e) => setGestionQuery(e.target.value)}
                  placeholder="Buscar por ID, nombre, descripción o proveedor…"
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
                <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 border-b">Resultados</div>
                <div className="max-h-[420px] overflow-auto">
                  {gestionList.length === 0 ? (
                    <div className="p-3 text-gray-500">No hay productos que coincidan.</div>
                  ) : (
                    <ul className="divide-y">
                      {gestionList.map((p) => {
                        const active = p.id === selectedId;
                        const btnClass = active
                          ? 'w-full text-left px-3 py-3 transition !bg-black !text-white hover:!bg-black/90 focus:outline-none'
                          : 'w-full text-left px-3 py-3 transition bg-white text-gray-900 hover:bg-gray-50 focus:outline-none';

                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(p.id);
                                // no tocamos editBanner aquí para que no desaparezca al pasar el ratón
                              }}
                              className={btnClass}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className={active ? 'text-xs text-white/70' : 'text-xs text-gray-500'}>#{p.id}</div>
                                  <div className={active ? 'font-semibold truncate text-white' : 'font-semibold truncate text-gray-900'}>
                                    {p.nombre}
                                  </div>
                                  <div className={active ? 'text-xs mt-1 text-white/80' : 'text-xs mt-1 text-gray-500'}>
                                    {provName(p.proveedor_id)}
                                  </div>
                                </div>
                                <div className={active ? 'font-semibold text-white' : 'font-semibold text-gray-900'}>{eur(p.precio)}</div>
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
                    Selecciona un producto de la lista para <b>actualizarlo</b> o <b>eliminarlo</b>.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-gray-500">Editando</div>
                        <div className="text-lg font-semibold">
                          #{selectedProduct.id} · {selectedProduct.nombre}
                        </div>
                      </div>

                      <Button
                        variant="danger"
                        type="button"
                        onClick={() => abrirModalBorrar(selectedProduct)}
                        disabled={delBusyId === selectedProduct.id}
                      >
                        Eliminar
                      </Button>
                    </div>

                    {editBanner ? (
                      <Notice type={editBanner.type} title={editBanner.title} onClose={() => setEditBanner(null)}>
                        {editBanner.content}
                      </Notice>
                    ) : null}

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
                        <label className={labelReq(editTouched && !!editErrors.nombre)}>
                          Nombre<RequiredAsterisk />
                        </label>
                        <input
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className={inputReq(editTouched && !!editErrors.nombre)}
                        />
                      </div>

                      <div>
                        <label className={labelReq(editTouched && !!editErrors.precio)}>
                          Precio<RequiredAsterisk />
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrecio}
                          onChange={(e) => setEditPrecio(clampNumberInput(e.target.value))}
                          className={inputReq(editTouched && !!editErrors.precio)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm mb-1">Descripción</label>
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="border rounded-lg px-3 py-2 w-full"
                          rows={3}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelReq(editTouched && !!editErrors.proveedor)}>
                          Proveedor<RequiredAsterisk />
                        </label>
                        <select
                          value={editProveedor}
                          onChange={(e) => setEditProveedor(e.target.value)}
                          className={selectReq(editTouched && !!editErrors.proveedor)}
                        >
                          <option value="">Selecciona proveedor</option>
                          {proveedores.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" onClick={actualizarProducto} disabled={updating}>
                        {updating ? 'Actualizando…' : 'Actualizar'}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditNombre(selectedProduct.nombre ?? '');
                          setEditDesc(selectedProduct.descripcion ?? '');
                          setEditPrecio(String(selectedProduct.precio ?? ''));
                          setEditProveedor(String(selectedProduct.proveedor_id ?? ''));
                          setEditTouched(false);
                          setEditErrors({});
                        }}
                        disabled={updating}
                      >
                        Revertir cambios
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
              setDeleteModalMsg(null);
            }}
            title="Confirmar eliminación"
            maxWidth="max-w-xl"
          >
            <div className="space-y-3">
              <div className="text-gray-800">
                ¿Seguro que quieres eliminar{' '}
                <b>
                  {deleteTarget ? `#${deleteTarget.id} · ${deleteTarget.nombre}` : 'este producto'}
                </b>
                ?
              </div>

              <div className="text-sm text-gray-600">
                Si el producto está usado en albaranes, no se podrá borrar.
              </div>

              {deleteModalMsg ? (
                <Notice
                  type={deleteModalMsg.type}
                  title={deleteModalMsg.title}
                  onClose={deleteModalMsg.type === 'error' ? () => setDeleteModalMsg(null) : null}
                >
                  {deleteModalMsg.content}
                </Notice>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    if (delBusyId) return;
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                    setDeleteModalMsg(null);
                  }}
                  disabled={!!delBusyId}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={confirmarBorrado}
                  disabled={!deleteTarget?.id || !!delBusyId}
                >
                  {delBusyId ? 'Eliminando…' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
