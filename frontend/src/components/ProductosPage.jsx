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
function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-sm">
      {label}
      <button className="text-gray-500 hover:text-gray-700" onClick={onRemove} aria-label={`Quitar ${label}`}>×</button>
    </span>
  );
}
const eur = (n)=> `${Number(n||0).toFixed(2)} €`;

// ===== Página =====
export default function ProductosPage() {
  // pestañas
  const [tab, setTab] = useState('listado'); // listado | gestion

  // datos
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  // estados base
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // filtros/buscador listado
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 150);
  const [provFilter, setProvFilter] = useState(''); // id proveedor o ''
  const [sort, setSort] = useState('nombre_az'); // nombre_az|nombre_za|precio_up|precio_down
  const sortLabels = { nombre_az:'Nombre A→Z', nombre_za:'Nombre Z→A', precio_up:'Precio ↑', precio_down:'Precio ↓' };

  // buscador en Altas/Bajas
  const [delQuery, setDelQuery] = useState('');

  // form alta
  const [fNombre, setFNombre] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fPrecio, setFPrecio] = useState('');
  const [fProveedor, setFProveedor] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // borrar
  const [delBusyId, setDelBusyId] = useState(null);
  const [delMsg, setDelMsg] = useState('');

  // carga inicial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr(null);
        const [rp, rpr] = await Promise.all([
          fetch(`${API_URL}productos/get`),
          fetch(`${API_URL}proveedores/get`),
        ]);
        if (!rp.ok) throw new Error(`Productos HTTP ${rp.status}`);
        if (!rpr.ok) throw new Error(`Proveedores HTTP ${rpr.status}`);
        setProductos(await rp.json());
        setProveedores(await rpr.json());
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // listado (pestaña Listado)
  const filtered = useMemo(() => {
    let list = [...productos];
    const t = q.trim().toLowerCase();
    if (t) {
      list = list.filter(p =>
        (p.nombre || '').toLowerCase().includes(t) ||
        (p.descripcion || '').toLowerCase().includes(t)
      );
    }
    if (provFilter) {
      list = list.filter(p => String(p.proveedor_id) === String(provFilter));
    }
    switch (sort) {
      case 'nombre_az':   list.sort((a,b)=> (a.nombre||'').localeCompare(b.nombre||'')); break;
      case 'nombre_za':   list.sort((a,b)=> (b.nombre||'').localeCompare(a.nombre||'')); break;
      case 'precio_up':   list.sort((a,b)=> (a.precio||0)-(b.precio||0)); break;
      case 'precio_down': list.sort((a,b)=> (b.precio||0)-(a.precio||0)); break;
      default: break;
    }
    return list;
  }, [productos, q, provFilter, sort]);

  // listado (pestaña Altas/Bajas con buscador)
  const gestionList = useMemo(() => {
    let list = [...productos];
    const t = delQuery.trim().toLowerCase();
    if (t) {
      list = list.filter(p => {
        const prov = proveedores.find(v => v.id === p.proveedor_id)?.nombre || '';
        return (
          String(p.id).includes(t) ||
          (p.nombre || '').toLowerCase().includes(t) ||
          (p.descripcion || '').toLowerCase().includes(t) ||
          prov.toLowerCase().includes(t)
        );
      });
    }
    // orden estable por nombre
    list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return list;
  }, [productos, delQuery, proveedores]);

  // helpers
  const provName = (id)=> proveedores.find(x=> x.id===id)?.nombre || `#${id}`;

  async function crearProducto(e) {
    e?.preventDefault?.();
    setSaveMsg('');
    if (!fNombre.trim() || !fPrecio || !fProveedor) {
      setSaveMsg('Nombre, precio y proveedor son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        nombre: fNombre.trim(),
        descripcion: fDesc.trim(),
        precio: Number(fPrecio),
        proveedor_id: Number(fProveedor),
      };
      const res = await fetch(`${API_URL}productos/post`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
      const nuevo = await res.json();
      setProductos(prev => [nuevo, ...prev]);
      setSaveMsg('Producto creado correctamente.');
      // limpia form
      setFNombre(''); setFDesc(''); setFPrecio(''); setFProveedor('');
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function borrarProducto(id) {
    setDelMsg('');
    if (!window.confirm(`¿Seguro que quieres eliminar el producto #${id}?`)) return;
    setDelBusyId(id);
    try {
      const res = await fetch(`${API_URL}productos/delete/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${await res.text()}`);
      setProductos(prev => prev.filter(p => p.id !== id));
      setDelMsg(`Producto #${id} eliminado.`);
    } catch (e) {
      setDelMsg(`Error eliminando #${id}: ${e.message}`);
    } finally {
      setDelBusyId(null);
    }
  }

  // UI
  if (loading) return <div className="p-6">Cargando productos…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  // chips activos (listado)
  const chips = [
    ...(q ? [{ key:'q', label:`Buscar: "${q}"`, onRemove:()=>setQuery('') }] : []),
    ...(provFilter ? [{
      key:'prov', label:`Proveedor: ${provName(Number(provFilter))}`,
      onRemove:()=> setProvFilter('')
    }] : []),
    ...(sort !== 'nombre_az' ? [{
      key:'sort', label:`Orden: ${sortLabels[sort] || ''}`,
      onRemove:()=> setSort('nombre_az')
    }] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
          <button
            className={`px-4 py-2 ${tab==='listado'?'bg-black text-white':'bg-white text-gray-700'}`}
            onClick={()=>setTab('listado')}
          >Listado</button>
          <button
            className={`px-4 py-2 border-l border-gray-300 ${tab==='gestion'?'bg-black text-white':'bg-white text-gray-700'}`}
            onClick={()=>setTab('gestion')}
          >Altas / Bajas</button>
        </div>
      </div>

      {tab === 'listado' ? (
        <>
          {/* Buscador y filtros */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <input
                  value={query}
                  onChange={e=>setQuery(e.target.value)}
                  placeholder="Buscar por nombre o descripción…"
                  className="border rounded-lg px-3 py-2 pr-8 w-full"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
              </div>

              <select
                value={provFilter}
                onChange={e=>setProvFilter(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">Todos los proveedores</option>
                {proveedores.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>

              <select value={sort} onChange={e=>setSort(e.target.value)} className="border rounded-lg px-3 py-2">
                <option value="nombre_az">Nombre A→Z</option>
                <option value="nombre_za">Nombre Z→A</option>
                <option value="precio_up">Precio ↑</option>
                <option value="precio_down">Precio ↓</option>
              </select>
            </div>

            {chips.length>0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map(ch=> <Chip key={ch.key} label={ch.label} onRemove={ch.onRemove} />)}
                <button
                  className="text-sm text-gray-600 underline ml-2"
                  onClick={()=>{ setQuery(''); setProvFilter(''); setSort('nombre_az'); }}
                >Limpiar filtros</button>
              </div>
            )}
          </div>

          {/* Tabla */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 text-sm font-medium text-gray-600 border-b">
              <div className="col-span-1">ID</div>
              <div className="col-span-4">Nombre</div>
              <div className="col-span-4">Descripción</div>
              <div className="col-span-1">Precio</div>
              <div className="col-span-2">Proveedor</div>
            </div>
            <ul>
              {filtered.length===0 && <li className="p-6 text-gray-500">Sin resultados</li>}
              {filtered.map(p=> (
                <li key={p.id} className="grid grid-cols-12 px-4 py-3 border-t">
                  <div className="col-span-1">#{p.id}</div>
                  <div className="col-span-4 font-medium">{p.nombre}</div>
                  <div className="col-span-4 truncate" title={p.descripcion || ''}>{p.descripcion || '—'}</div>
                  <div className="col-span-1">{eur(p.precio)}</div>
                  <div className="col-span-2">{provName(p.proveedor_id)}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* Alta de producto */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold">Dar de alta producto</h3>
            <form onSubmit={crearProducto} className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nombre *</label>
                <input value={fNombre} onChange={e=>setFNombre(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm mb-1">Precio *</label>
                <input type="number" step="0.01" value={fPrecio} onChange={e=>setFPrecio(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Descripción</label>
                <textarea value={fDesc} onChange={e=>setFDesc(e.target.value)} className="border rounded-lg px-3 py-2 w-full" rows={3}/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Proveedor *</label>
                <select value={fProveedor} onChange={e=>setFProveedor(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
                  <option value="">Selecciona proveedor</option>
                  {proveedores.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <button disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white">
                  {saving ? 'Guardando…' : 'Crear producto'}
                </button>
                {saveMsg && <span className={saveMsg.startsWith('Error')?'text-red-600':'text-green-700'}>{saveMsg}</span>}
              </div>
            </form>
          </section>

          {/* Baja (eliminar) */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Dar de baja (eliminar) producto</h3>
              <div className="relative">
                <input
                  value={delQuery}
                  onChange={e => setDelQuery(e.target.value)}
                  placeholder="Buscar por ID, nombre, descripción o proveedor…"
                  className="border rounded-lg px-3 py-2 pr-16 w-[320px]"
                />
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
                {delQuery && (
                  <button
                    type="button"
                    onClick={() => setDelQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="Limpiar"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="text-left p-2 w-20">ID</th>
                    <th className="text-left p-2">Nombre</th>
                    <th className="text-left p-2">Proveedor</th>
                    <th className="text-right p-2 w-28">Precio</th>
                    <th className="text-right p-2 w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gestionList.length===0 && (
                    <tr><td colSpan={5} className="p-3 text-gray-500">No hay productos que coincidan con la búsqueda.</td></tr>
                  )}
                  {gestionList.map(p=> (
                    <tr key={p.id} className="border-b">
                      <td className="p-2">#{p.id}</td>
                      <td className="p-2">{p.nombre}</td>
                      <td className="p-2">{provName(p.proveedor_id)}</td>
                      <td className="p-2 text-right">{eur(p.precio)}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={()=>borrarProducto(p.id)}
                          disabled={delBusyId===p.id}
                          className="px-3 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          title="Eliminar producto"
                        >
                          {delBusyId===p.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {delMsg && <div className={delMsg.startsWith('Error')?'text-red-600':'text-green-700'}>{delMsg}</div>}
          </section>
        </>
      )}
    </div>
  );
}
