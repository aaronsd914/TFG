import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  FIANZA: { label: 'Fianza', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  ALMACEN: { label: 'Almacén', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  TRANSPORTE: { label: 'Ruta', className: 'bg-purple-100 text-purple-800 border-purple-300' },
  ENTREGADO: { label: 'Entregado', className: 'bg-green-100 text-green-800 border-green-300' },
};

// ===== Página =====
export default function AlbaranesPage() {
  const navigate = useNavigate();

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

  // ✅ ID pendiente para abrir desde Clientes
  const [pendingOpenId, setPendingOpenId] = useState(null);

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
        const [resAlb, resCli] = await Promise.all([
          fetch(`${API_URL}albaranes/get`),
          fetch(`${API_URL}clientes/get`),
        ]);
        if (!resAlb.ok) throw new Error(`Albaranes HTTP ${resAlb.status}`);
        if (!resCli.ok) throw new Error(`Clientes HTTP ${resCli.status}`);

        const alb = await resAlb.json();
        const cli = await resCli.json();

        const albList = alb || [];
        setAlbaranes(albList);
        setClientes(cli || []);

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
        setError(e.message);
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
        const cliente = clientesById.get(a.cliente_id);
        const enCliente =
          cliente &&
          (`${cliente.nombre || ''} ${cliente.apellidos || ''}`.toLowerCase().includes(t) ||
            (cliente.email || '').toLowerCase().includes(t) ||
            (cliente.dni || '').toLowerCase().includes(t));

        return String(a.id).includes(t) || (a.descripcion || '').toLowerCase().includes(t) || enCliente;
      });
    }

    list = list.filter((a) => {
      const tot = safeNumber(a.total);
      return tot >= totalRange[0] && tot <= totalRange[1];
    });

    list = list.filter((a) => {
      const f = formatDateISO(a.fecha);
      if (dateFrom && f < dateFrom) return false;
      if (dateTo && f > dateTo) return false;
      return true;
    });

    if (selectedDomains.length) {
      list = list.filter((a) => {
        const cli = clientesById.get(a.cliente_id);
        const dom = (cli?.email || '').split('@')[1]?.toLowerCase() || '';
        return selectedDomains.includes(dom);
      });
    }

    if (selectedEstados.length) {
      list = list.filter((a) => selectedEstados.includes(a.estado));
    }

    switch (sort) {
      case 'fecha_desc':
        list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        break;
      case 'fecha_asc':
        list.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
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
    ...(q ? [{ key: 'q', label: `Buscar: "${q}"`, onRemove: () => setQuery('') }] : []),
    ...((dateFrom || dateTo)
      ? [
          {
            key: 'fechas',
            label: `Fecha ${dateFrom || '—'} → ${dateTo || '—'}`,
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
            label: `Total ${totalRange[0]}–${totalRange[1]} €`,
            onRemove: () => setTotalRange([defaultMinTotal, defaultMaxTotal]),
          },
        ]
      : []),
    ...selectedDomains.map((dom) => ({
      key: `dom-${dom}`,
      label: `Dominio: ${dom}`,
      onRemove: () => setSelectedDomains((prev) => prev.filter((d) => d !== dom)),
    })),
    ...selectedEstados.map((es) => ({
      key: `est-${es}`,
      label: `Estado: ${ESTADO_META[es]?.label || es}`,
      onRemove: () => setSelectedEstados((prev) => prev.filter((x) => x !== es)),
    })),
    ...(sort !== 'fecha_desc'
      ? [
          {
            key: 'sort',
            label: `Orden: ${({ fecha_desc: 'Fecha ↓', fecha_asc: 'Fecha ↑', total_desc: 'Total ↓', total_asc: 'Total ↑' })[sort]}`,
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Albaranes</h1>
      </div>

      {/* ✅ Buscador + Filtros en la misma línea */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por id, descripción, cliente, DNI o email…"
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

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Fecha</div>
          <div className="col-span-3">Cliente</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Descripción</div>
        </div>

        <ul>
          {loading && <li className="p-6 text-gray-500">Cargando albaranes…</li>}
          {error && <li className="p-6 text-red-600">{error}</li>}
          {!loading && !error && filtered.length === 0 && <li className="p-6 text-gray-500">Sin resultados</li>}

          {filtered.map((a) => {
            const cli = clientesById.get(a.cliente_id);
            const meta =
              ESTADO_META[a.estado] || { label: a.estado, className: 'bg-gray-100 text-gray-700 border-gray-300' };
            return (
              <li
                key={a.id}
                className="grid grid-cols-12 px-4 py-3 border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => openDetail(a)}
              >
                <div className="col-span-2">#{a.id}</div>
                <div className="col-span-2">{formatDate(a.fecha)}</div>

                <div className="col-span-3">
                  <div className="font-medium">
                    {cli?.nombre} {cli?.apellidos}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {cli?.dni ? `${cli.dni} · ` : ''}
                    {cli?.email}
                  </div>
                </div>

                <div className="col-span-2">{formatEUR(a.total)}</div>

                <div className="col-span-1">
                  <span className={`inline-block border px-2 py-1 rounded-lg text-xs text-center ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="col-span-2 truncate" title={a.descripcion || ''}>
                  {a.descripcion || '—'}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Modal filtros */}
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
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="fecha_desc">Fecha ↓</option>
              <option value="fecha_asc">Fecha ↑</option>
              <option value="total_desc">Total ↓</option>
              <option value="total_asc">Total ↑</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rango de fechas</label>
            <div className="flex items-center gap-3">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
              <span>—</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rango de total (€)</label>
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
              Rango disponible: {defaultMinTotal}–{defaultMaxTotal} €
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dominios de cliente</label>
            <div className="flex flex-wrap gap-2">
              {domains.length === 0 && <span className="text-sm text-gray-500">No hay dominios detectados.</span>}
              {domains.map((dom) => {
                const active = selectedDomains.includes(dom);
                return (
                  <button
                    key={dom}
                    onClick={() =>
                      setSelectedDomains((prev) => (prev.includes(dom) ? prev.filter((d) => d !== dom) : [...prev, dom]))
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

          <div>
            <label className="block text-sm font-medium mb-2">Estados</label>
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
                      active ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    type="button"
                  >
                    {ESTADO_META[es].label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <button onClick={clearAll} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 hover:bg-gray-300" type="button">
            Limpiar filtros
          </button>
          <button onClick={() => setFiltersOpen(false)} className="px-4 py-2 rounded-xl bg-black text-white" type="button">
            Aplicar
          </button>
        </div>
      </ModalCenter>

      {/* ✅ Modal detalle albarán */}
      <ModalCenter isOpen={detailOpen} onClose={closeDetail} maxWidth="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Detalle de albarán</h2>
          <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700" type="button">
            Cerrar
          </button>
        </div>

        {!selected ? (
          <p className="text-gray-500">Cargando…</p>
        ) : (
          <div className="space-y-4">
            {/* cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <div className="text-xs text-gray-500">Estado</div>
                <div className="font-medium">
                  <span
                    className={`inline-block border px-2 py-1 rounded-lg text-xs ${
                      ESTADO_META[selected.estado]?.className || 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}
                  >
                    {ESTADO_META[selected.estado]?.label || selected.estado}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="text-xs text-gray-500">Descripción</div>
              <div className="font-medium break-words">{selected.descripcion || '—'}</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Cliente</h3>

                {/* ✅ Botón claro */}
                {selectedClient?.id && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:scale-[0.98] text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToCliente(selectedClient.id);
                    }}
                    title="Ver cliente en Clientes"
                  >
                    Ver cliente <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>

              {selectedClient ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="text-xs text-gray-500">Nombre</div>
                    {/* ✅ Ahora es “pill button” en vez de subrayado */}
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black text-white hover:bg-gray-800 active:scale-[0.98] text-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        goToCliente(selectedClient.id);
                      }}
                      title="Ir a Clientes"
                    >
                      {selectedClient.nombre} {selectedClient.apellidos}
                      <span aria-hidden="true">↗</span>
                    </button>
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
                    {(selected.lineas || []).map((ln) => (
                      <tr key={ln.id} className="border-b">
                        <td className="p-2">#{ln.id}</td>
                        <td className="p-2">{ln.producto_id}</td>
                        <td className="p-2">{ln.cantidad}</td>
                        <td className="p-2">{formatEUR(ln.precio_unitario)}</td>
                        <td className="p-2">{formatEUR(ln.cantidad * ln.precio_unitario)}</td>
                      </tr>
                    ))}
                    {(!selected.lineas || selected.lineas.length === 0) && (
                      <tr>
                        <td className="p-3 text-sm text-gray-500" colSpan={5}>
                          Este albarán no tiene líneas.
                        </td>
                      </tr>
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
