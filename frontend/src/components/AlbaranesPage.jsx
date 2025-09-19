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
      <button className="text-gray-500 hover:text-gray-700" onClick={onRemove}>×</button>
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
function formatEUR(n) { return `${safeNumber(n).toFixed(2)} €`; }
function formatDate(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

const ESTADO_META = {
  FIANZA: { label: 'Fianza',   className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  ALMACEN: { label: 'Almacén', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  TRANSPORTE: { label: 'Ruta', className: 'bg-purple-100 text-purple-800 border-purple-300' },
  ENTREGADO: { label: 'Entregado', className: 'bg-green-100 text-green-800 border-green-300' },
};

// ===== Página =====
export default function AlbaranesPage() {
  const [albaranes, setAlbaranes] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // buscador + filtros
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 150);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('fecha_desc');
  const [totalMin, setTotalMin] = useState(0);
  const [totalMax, setTotalMax] = useState(9999999);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState([]); // NUEVO

  // detalle centrado
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailError, setDetailError] = useState(null);

  // carga inicial
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [resAlb, resCli] = await Promise.all([
          fetch(`${API_URL}albaranes/get`),
          fetch(`${API_URL}clientes/get`),
        ]);
        if (!resAlb.ok) throw new Error(`Albaranes HTTP ${resAlb.status}`);
        if (!resCli.ok) throw new Error(`Clientes HTTP ${resCli.status}`);
        const alb = await resAlb.json();
        const cli = await resCli.json();

        setAlbaranes(alb || []);
        setClientes(cli || []);

        const totals = (alb || []).map(a => safeNumber(a.total));
        if (totals.length) {
          const min = Math.min(...totals);
          const max = Math.max(...totals);
          setTotalMin(Math.floor(min));
          setTotalMax(Math.ceil(max));
        }
        setDateFrom('');
        setDateTo('');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const clientesById = useMemo(() => {
    const m = new Map();
    clientes.forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  const domains = useMemo(() => {
    const s = new Set();
    clientes.forEach(c => {
      const d = (c.email || '').split('@')[1];
      if (d) s.add(d.toLowerCase());
    });
    return Array.from(s).sort();
  }, [clientes]);

  const filtered = useMemo(() => {
    let list = [...albaranes];
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(a => {
        const cliente = clientesById.get(a.cliente_id);
        const enCliente =
          cliente &&
          (`${cliente.nombre || ''} ${cliente.apellidos || ''}`.toLowerCase().includes(t) ||
           (cliente.email || '').toLowerCase().includes(t) ||
           (cliente.dni || '').toLowerCase().includes(t));
        return (
          String(a.id).includes(t) ||
          (a.descripcion || '').toLowerCase().includes(t) ||
          enCliente
        );
      });
    }
    list = list.filter(a => {
      const tot = safeNumber(a.total);
      return tot >= totalMin && tot <= totalMax;
    });
    list = list.filter(a => {
      const f = formatDateISO(a.fecha);
      if (dateFrom && f < dateFrom) return false;
      if (dateTo && f > dateTo) return false;
      return true;
    });
    if (selectedDomains.length) {
      list = list.filter(a => {
        const cli = clientesById.get(a.cliente_id);
        const dom = (cli?.email || '').split('@')[1]?.toLowerCase() || '';
        return selectedDomains.includes(dom);
      });
    }
    if (selectedEstados.length) {
      list = list.filter(a => selectedEstados.includes(a.estado));
    }
    switch (sort) {
      case 'fecha_desc': list.sort((a,b)=> new Date(b.fecha) - new Date(a.fecha)); break;
      case 'fecha_asc':  list.sort((a,b)=> new Date(a.fecha) - new Date(b.fecha)); break;
      case 'total_desc': list.sort((a,b)=> safeNumber(b.total) - safeNumber(a.total)); break;
      case 'total_asc':  list.sort((a,b)=> safeNumber(a.total) - safeNumber(b.total)); break;
      default: break;
    }
    return list;
  }, [albaranes, clientesById, q, totalMin, totalMax, dateFrom, dateTo, selectedDomains, selectedEstados, sort]);

  const activeChips = [
    ...(q ? [{ key:'q', label:`Buscar: "${q}"`, onRemove:()=>setQuery('') }] : []),
    ...((dateFrom || dateTo) ? [{
      key:'fechas', label:`Fecha ${dateFrom || '—'} → ${dateTo || '—'}`,
      onRemove:()=>{ setDateFrom(''); setDateTo(''); }
    }] : []),
    ...((totalMin !== 0 || totalMax !== 9999999) ? [{
      key:'total', label:`Total ${totalMin}–${totalMax} €`,
      onRemove:()=>{ setTotalMin(0); setTotalMax(9999999); }
    }] : []),
    ...selectedDomains.map(dom => ({ key:`dom-${dom}`, label:`Dominio: ${dom}`, onRemove:()=> setSelectedDomains(prev => prev.filter(d => d !== dom)) })),
    ...selectedEstados.map(es => ({ key:`est-${es}`, label:`Estado: ${ESTADO_META[es]?.label || es}`, onRemove:()=> setSelectedEstados(prev => prev.filter(x => x !== es)) })),
    ...(sort !== 'fecha_desc' ? [{ key:'sort', label:{fecha_desc:'Fecha ↓', fecha_asc:'Fecha ↑', total_desc:'Total ↓', total_asc:'Total ↑'}[sort], onRemove:()=>setSort('fecha_desc') }] : []),
  ];

  function clearAll() {
    setQuery('');
    setSort('fecha_desc');
    setSelectedDomains([]);
    setSelectedEstados([]);
    setDateFrom('');
    setDateTo('');
    setTotalMin(0);
    setTotalMax(9999999);
  }

  async function openDetail(a) {
    setDetailError(null);
    setSelected(a);
    setSelectedClient(clientesById.get(a.cliente_id) || null);
    try {
      const [resA, resC] = await Promise.all([
        fetch(`${API_URL}albaranes/get/${a.id}`),
        fetch(`${API_URL}clientes/get/${a.cliente_id}`),
      ]);
      if (resA.ok) setSelected(await resA.json());
      if (resC.ok) setSelectedClient(await resC.json());
      if (!resA.ok && !resC.ok) setDetailError('No se pudo cargar el detalle.');
    } catch (e) {
      setDetailError(e.message);
    }
    setDetailOpen(true);
  }
  function closeDetail() {
    setDetailOpen(false);
    setSelected(null);
    setSelectedClient(null);
    setDetailError(null);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Albaranes</h1>
        <button
          onClick={()=>setFiltersOpen(true)}
          className="rounded-xl border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50"
        >
          Filtros
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <input
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="Buscar por id, descripción, cliente, DNI o email…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
      </div>

      {/* Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeChips.map(ch => <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />)}
          <button className="text-sm text-gray-600 underline ml-2" onClick={clearAll}>Limpiar todo</button>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-3">Cliente</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-1">Estado</div> {/* NUEVO */}
          <div className="col-span-2">Descripción</div>
        </div>
        <ul>
          {loading && <li className="p-6 text-gray-500">Cargando albaranes…</li>}
          {error && <li className="p-6 text-red-600">{error}</li>}
          {!loading && !error && filtered.length === 0 && (
            <li className="p-6 text-gray-500">Sin resultados</li>
          )}
          {filtered.map(a => {
            const cli = clientesById.get(a.cliente_id);
            const meta = ESTADO_META[a.estado] || { label: a.estado, className: 'bg-gray-100 text-gray-700 border-gray-300' };
            return (
              <li
                key={a.id}
                className="grid grid-cols-12 px-4 py-3 border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => openDetail(a)}
              >
                <div className="col-span-2">#{a.id}</div>
                <div className="col-span-2">{formatDate(a.fecha)}</div>
                <div className="col-span-3">
                  <div className="font-medium">{cli?.nombre} {cli?.apellidos}</div>
                  <div className="text-xs text-gray-500 truncate">{cli?.dni ? `${cli.dni} · ` : ''}{cli?.email}</div>
                </div>
                <div className="col-span-2">{formatEUR(a.total)}</div>
                <div className="col-span-1">
                  <span className={`inline-block border px-2 py-1 rounded-lg text-xs text-center ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="col-span-2 truncate" title={a.descripcion || ''}>{a.descripcion || '—'}</div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Modal filtros */}
      <ModalCenter isOpen={filtersOpen} onClose={()=>setFiltersOpen(false)} maxWidth="max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Filtros</h2>
          <button onClick={()=>setFiltersOpen(false)} className="text-gray-500 hover:text-gray-700">Cerrar</button>
        </div>

        <section className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Orden</label>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="fecha_desc">Fecha ↓</option>
              <option value="fecha_asc">Fecha ↑</option>
              <option value="total_desc">Total ↓</option>
              <option value="total_asc">Total ↑</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rango de fechas</label>
            <div className="flex items-center gap-3">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border rounded-lg px-3 py-2" />
              <span>—</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rango de total (€)</label>
            <div className="flex items-center gap-3">
              <input type="number" value={totalMin} onChange={e=>setTotalMin(Number(e.target.value)||0)} className="w-32 border rounded-lg px-3 py-2" />
              <span>—</span>
              <input type="number" value={totalMax} onChange={e=>setTotalMax(Number(e.target.value)||0)} className="w-32 border rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dominios de cliente</label>
            <div className="flex flex-wrap gap-2">
              {domains.length === 0 && <span className="text-sm text-gray-500">No hay dominios detectados.</span>}
              {domains.map(dom => {
                const active = selectedDomains.includes(dom);
                return (
                  <button
                    key={dom}
                    onClick={() =>
                      setSelectedDomains(prev => prev.includes(dom) ? prev.filter(d => d !== dom) : [...prev, dom])
                    }
                    className={`px-3 py-1 rounded-full border ${
                      active ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {dom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* NUEVO: Filtro por estado */}
          <div>
            <label className="block text-sm font-medium mb-2">Estados</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ESTADO_META).map(es => {
                const active = selectedEstados.includes(es);
                return (
                  <button
                    key={es}
                    onClick={() =>
                      setSelectedEstados(prev => prev.includes(es) ? prev.filter(x => x !== es) : [...prev, es])
                    }
                    className={`px-3 py-1 rounded-full border ${
                      active ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {ESTADO_META[es].label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <button onClick={clearAll} className="text-gray-600 underline">Limpiar filtros</button>
          <button onClick={()=>setFiltersOpen(false)} className="px-4 py-2 rounded-xl bg-black text-white">Aplicar</button>
        </div>
      </ModalCenter>

      {/* Modal detalle albarán */}
      <ModalCenter isOpen={detailOpen} onClose={closeDetail} maxWidth="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Detalle de albarán</h2>
          <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700">Cerrar</button>
        </div>

        {!selected ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          <div className="space-y-4">
            {/* Ficha albarán */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">ID</div>
                <div className="font-medium">#{selected.id}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">Fecha</div>
                <div className="font-medium">{formatDate(selected.fecha)}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-medium">{formatEUR(selected.total)}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">Cliente ID</div>
                <div className="font-medium">#{selected.cliente_id}</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">Estado</div>
                <div className="font-medium">
                  <span className={`inline-block border px-2 py-1 rounded-lg text-xs ${
                    ESTADO_META[selected.estado]?.className || 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {ESTADO_META[selected.estado]?.label || selected.estado}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-xs text-gray-500">Descripción</div>
              <div className="font-medium break-words">{selected.descripcion || '—'}</div>
            </div>

            {/* Cliente (resumen) */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Cliente</h3>
              {selectedClient ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500">Nombre</div>
                    <div className="font-medium">{selectedClient.nombre} {selectedClient.apellidos}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500">DNI</div>
                    <div className="font-medium">{selectedClient.dni || '—'}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-medium break-all">{selectedClient.email || '—'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Cargando cliente…</p>
              )}
            </div>

            {/* Líneas */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Líneas</h3>
              {detailError && <p className="text-red-600 mb-2">Error: {detailError}</p>}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2 w-24">ID línea</th>
                      <th className="p-2 w-28">Producto</th>
                      <th className="p-2 w-24">Cantidad</th>
                      <th className="p-2 w-28">P. Unitario</th>
                      <th className="p-2 w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.lineas || []).map(ln => (
                      <tr key={ln.id} className="border-b">
                        <td className="p-2">#{ln.id}</td>
                        <td className="p-2">{ln.producto_id}</td>
                        <td className="p-2">{ln.cantidad}</td>
                        <td className="p-2">{formatEUR(ln.precio_unitario)}</td>
                        <td className="p-2">{formatEUR(ln.cantidad * ln.precio_unitario)}</td>
                      </tr>
                    ))}
                    {(!selected.lineas || selected.lineas.length === 0) && (
                      <tr><td className="p-3 text-sm text-gray-500" colSpan={5}>Este albarán no tiene líneas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </ModalCenter>
    </div>
  );
}
