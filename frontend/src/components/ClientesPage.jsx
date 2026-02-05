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

  // detalle (modal centrado)
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('info'); // info | albaranes

  // albaranes del cliente
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({}); // { [albaranId]: { open, loading, error, lineas } }

  // ✅ ID pendiente para abrir detalle (desde Albaranes)
  const [pendingOpenClienteId, setPendingOpenClienteId] = useState(null);

  // Carga inicial de clientes
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}clientes/get`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json || []);
        if (json?.length) {
          const ids = json.map((c) => c.id);
          setIdRange([Math.min(...ids), Math.max(...ids)]);
        } else {
          setIdRange([0, 999999]);
        }
      } catch (e) {
        setError(e.message);
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

    const c = data.find((x) => x.id === Number(pendingOpenClienteId));
    if (!c) return;

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

  // Evitar negativos + rango coherente
  function setIdRangeSafe(nextMin, nextMax) {
    let min = Number.isFinite(Number(nextMin)) ? Number(nextMin) : 0;
    let max = Number.isFinite(Number(nextMax)) ? Number(nextMax) : defaultMax;

    min = Math.max(0, min);
    max = Math.max(0, max);
    if (max < min) max = min;

    setIdRange([min, max]);
  }

  // Aplicación de buscador + filtros + orden
  const filtered = useMemo(() => {
    let list = [...data];

    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter((c) =>
        `${c.nombre || ''} ${c.apellidos || ''}`.toLowerCase().includes(t) ||
        (c.email || '').toLowerCase().includes(t) ||
        (c.dni || '').toLowerCase().includes(t)
      );
    }

    list = list.filter((c) => c.id >= idRange[0] && c.id <= idRange[1]);

    if (selectedDomains.length) {
      list = list.filter((c) =>
        selectedDomains.includes((c.email?.split('@')[1] || '').toLowerCase())
      );
    }

    switch (sort) {
      case 'az': list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')); break;
      case 'za': list.sort((a, b) => (b.nombre || '').localeCompare(a.nombre || '')); break;
      case 'id_up': list.sort((a, b) => a.id - b.id); break;
      case 'id_down': list.sort((a, b) => b.id - a.id); break;
      default: break;
    }

    return list;
  }, [data, q, idRange, selectedDomains, sort]);

  // Chips de filtros activos
  const activeChips = [
    ...(q ? [{ key: 'q', label: `Buscar: "${q}"`, onRemove: () => setQuery('') }] : []),
    ...((idRange[0] !== defaultMin || idRange[1] !== defaultMax)
      ? [{ key: 'id', label: `ID ${idRange[0]}–${idRange[1]}`, onRemove: () => setIdRange([defaultMin, defaultMax]) }]
      : []),
    ...selectedDomains.map((dom) => ({
      key: `dom-${dom}`,
      label: `Dominio: ${dom}`,
      onRemove: () => setSelectedDomains((prev) => prev.filter((d) => d !== dom))
    })),
    ...(sort !== 'az'
      ? [{ key: 'sort', label: `Orden: ${({ az:'A→Z', za:'Z→A', id_up:'ID↑', id_down:'ID↓' })[sort]}`, onRemove: () => setSort('az') }]
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
        data = (all || []).filter((a) => a.cliente_id === clienteId);
      }
      setOrders(Array.isArray(data) ? data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) : []);
    } catch (e) {
      setOrders([]);
      setOrdersError(e.message);
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
      setExpanded((prev) => ({ ...prev, [id]: { ...prev[id], open: true, loading: false, lineas: full.lineas || [] } }));
    } catch (e) {
      setExpanded((prev) => ({ ...prev, [id]: { ...prev[id], open: true, loading: false, error: e.message } }));
    }
  }

  function openAlbaranInAlbaranesPage(albaranId) {
    try {
      localStorage.setItem('albaran_open_id', String(albaranId));
    } catch {}
    window.dispatchEvent(new CustomEvent('open-albaran', { detail: { id: albaranId } }));
    window.location.href = '/albaranes'; // ajusta si tu ruta es otra
  }

  const totalClientesRegistrados = data.length;

  return (
    <div className="p-6">
      {/* Título + contador */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Clientes registrados: <span className="font-medium text-gray-700">{totalClientesRegistrados}</span>
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
            placeholder="Buscar por nombre, apellidos, email o DNI…"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
        </div>

        <button
          onClick={() => setFiltersOpen(true)}
          className="rounded-xl border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50"
          type="button"
        >
          Filtros
        </button>
      </div>

      {/* Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeChips.map((ch) => (
            <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />
          ))}
          <button className="text-sm text-gray-600 underline ml-2" onClick={clearAll} type="button">
            Limpiar todo
          </button>
        </div>
      )}

      {/* Tabla de clientes */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
          <div className="col-span-2">ID</div>
          <div className="col-span-4">Nombre</div>
          <div className="col-span-3">DNI</div>
          <div className="col-span-3">Email</div>
        </div>
        <ul>
          {loading && <li className="p-6 text-gray-500">Cargando clientes…</li>}
          {error && <li className="p-6 text-red-600">{error}</li>}
          {!loading && !error && filtered.length === 0 && <li className="p-6 text-gray-500">Sin resultados</li>}

          {filtered.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-12 px-4 py-3 border-t hover:bg-gray-50 cursor-pointer"
              onClick={() => openDetail(c)}
            >
              <div className="col-span-2">{c.id}</div>
              <div className="col-span-4">{c.nombre} {c.apellidos || ''}</div>
              <div className="col-span-3">{c.dni || '—'}</div>
              <div className="col-span-3 truncate">{c.email || '—'}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal de filtros */}
      <ModalCenter isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} maxWidth="max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Filtros</h2>
          <button onClick={() => setFiltersOpen(false)} className="text-gray-500 hover:text-gray-700" type="button">
            Cerrar
          </button>
        </div>

        <section className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Orden</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="az">Nombre A→Z</option>
              <option value="za">Nombre Z→A</option>
              <option value="id_up">ID ascendente</option>
              <option value="id_down">ID descendente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rango de ID</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={idRange[0]}
                onChange={(e) => setIdRangeSafe(e.target.value, idRange[1])}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2"
              />
              <span>—</span>
              <input
                type="number"
                min={0}
                value={idRange[1]}
                onChange={(e) => setIdRangeSafe(idRange[0], e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dominios de email</label>
            <div className="flex flex-wrap gap-2">
              {domains.length === 0 && <span className="text-sm text-gray-500">No hay dominios detectados aún.</span>}
              {domains.map((dom) => {
                const active = selectedDomains.includes(dom);
                return (
                  <button
                    key={dom}
                    onClick={() =>
                      setSelectedDomains((prev) =>
                        prev.includes(dom) ? prev.filter((d) => d !== dom) : [...prev, dom]
                      )
                    }
                    className={`px-3 py-1 rounded-full border ${
                      active ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300"
            type="button"
          >
            Limpiar filtros
          </button>
          <button
            onClick={() => setFiltersOpen(false)}
            className="px-4 py-2 rounded-xl bg-black text-white"
            type="button"
          >
            Aplicar
          </button>
        </div>
      </ModalCenter>

      {/* Modal Detalle Cliente */}
      <ModalCenter isOpen={detailOpen} onClose={closeDetail} maxWidth="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Detalle de cliente</h2>
          <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700" type="button">
            Cerrar
          </button>
        </div>

        {!selected ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`px-4 py-2 rounded-xl border ${detailTab === 'info' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Información
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('albaranes')}
                className={`px-4 py-2 rounded-xl border ${detailTab === 'albaranes' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Albaranes
              </button>
            </div>

            {detailTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">ID</div>
                  <div className="font-medium">#{selected.id}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Nombre</div>
                  <div className="font-medium">{selected.nombre} {selected.apellidos || ''}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">DNI</div>
                  <div className="font-medium break-all">{selected.dni || '—'}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:col-span-2">
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="font-medium break-all">{selected.email || '—'}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Teléfonos</div>
                  <div className="font-medium break-all">
                    {selected.telefono1 || '—'}{selected.telefono2 ? ` · ${selected.telefono2}` : ''}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:col-span-3">
                  <div className="text-xs text-gray-500">Dirección</div>
                  <div className="font-medium break-words">
                    {[
                      selected.calle,
                      selected.numero_vivienda,
                      selected.piso_portal ? `(${selected.piso_portal})` : null,
                      selected.codigo_postal,
                      selected.ciudad
                    ].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'albaranes' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Albaranes</h3>
                  {ordersLoading && <span className="text-sm text-gray-500">Cargando…</span>}
                </div>

                {ordersError && <p className="text-red-600 mb-2">Error: {ordersError}</p>}

                {!ordersLoading && !ordersError && (
                  <>
                    {orders.length === 0 ? (
                      <p className="text-gray-500">Este cliente no tiene albaranes.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="text-left border-b bg-gray-50">
                              <th className="p-2 w-24">ID</th>
                              <th className="p-2 w-36">Fecha</th>
                              <th className="p-2">Descripción</th>
                              <th className="p-2 w-28">Estado</th>
                              <th className="p-2 w-32">Total</th>
                              <th className="p-2 w-40"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((alb) => {
                              const isOpen = !!expanded[alb.id]?.open;
                              const isLoading = !!expanded[alb.id]?.loading;
                              const err = expanded[alb.id]?.error;
                              const lineas = expanded[alb.id]?.lineas || [];
                              const meta =
                                ESTADO_META[alb.estado] || { label: alb.estado, className: 'bg-gray-100 text-gray-700 border-gray-300' };

                              return (
                                <React.Fragment key={alb.id}>
                                  <tr className="border-b hover:bg-gray-50">
                                    <td className="p-2">#{alb.id}</td>
                                    <td className="p-2">{formatDate(alb.fecha)}</td>
                                    <td className="p-2 truncate" title={alb.descripcion || ''}>{alb.descripcion || '—'}</td>
                                    <td className="p-2">
                                      <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${meta.className}`}>
                                        {meta.label}
                                      </span>
                                    </td>
                                    <td className="p-2">{formatEUR(alb.total)}</td>
                                    <td className="p-2">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                                          onClick={() => openAlbaranInAlbaranesPage(alb.id)}
                                          title="Abrir en Albaranes"
                                        >
                                          Abrir
                                        </button>
                                        <button
                                          type="button"
                                          className="inline-flex items-center justify-center"
                                          onClick={() => toggleExpand(alb)}
                                          aria-label={isOpen ? 'Ocultar líneas' : 'Ver líneas'}
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
                                          {isLoading && <div className="text-sm text-gray-500">Cargando líneas…</div>}
                                          {err && <div className="text-sm text-red-600">Error: {err}</div>}
                                          {!isLoading && !err && (
                                            <div className="border rounded-xl overflow-hidden bg-white">
                                              <table className="w-full border-collapse">
                                                <thead>
                                                  <tr className="text-left border-b bg-gray-50">
                                                    <th className="p-2 w-28">ID línea</th>
                                                    <th className="p-2 w-28">Producto</th>
                                                    <th className="p-2 w-24">Cantidad</th>
                                                    <th className="p-2 w-28">P. Unitario</th>
                                                    <th className="p-2 w-28">Subtotal</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {lineas.length === 0 && (
                                                    <tr><td className="p-3 text-sm text-gray-500" colSpan={5}>No hay líneas para este albarán.</td></tr>
                                                  )}
                                                  {lineas.map((ln) => (
                                                    <tr key={ln.id} className="border-b">
                                                      <td className="p-2">#{ln.id}</td>
                                                      <td className="p-2">{ln.producto_id}</td>
                                                      <td className="p-2">{ln.cantidad}</td>
                                                      <td className="p-2">{formatEUR(ln.precio_unitario)}</td>
                                                      <td className="p-2">{formatEUR(ln.cantidad * ln.precio_unitario)}</td>
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
    </div>
  );
}
