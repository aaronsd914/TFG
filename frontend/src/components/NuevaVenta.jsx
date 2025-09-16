// components/NuevaVenta.jsx
import { useEffect, useMemo, useState, useRef } from 'react';

const API_URL = 'http://localhost:8000/api/';

export default function NuevaVenta() {
  // ---- Modo cliente ----
  const [useExisting, setUseExisting] = useState(true);

  // ---- Cliente existente (buscador) ----
  const [clientQuery, setClientQuery] = useState('');
  const [clientSugs, setClientSugs] = useState([]);
  const [clientActiveIdx, setClientActiveIdx] = useState(-1);
  const [selectedClient, setSelectedClient] = useState(null);
  const clientListRef = useRef(null);

  // ---- Cliente nuevo (extendido) ----
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteApellidos, setClienteApellidos] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [telefono1, setTelefono1] = useState('');
  const [telefono2, setTelefono2] = useState('');
  const [calle, setCalle] = useState('');
  const [numeroVivienda, setNumeroVivienda] = useState('');
  const [pisoPortal, setPisoPortal] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');

  // ---- Venta ----
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState('');

  // ---- Productos ----
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef(null);
  const [items, setItems] = useState([]); // {producto, cantidad, precio_unitario}

  // ====== Helpers ======
  function Highlight({ text, query }) {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 px-0.5 rounded">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  // ====== Buscar CLIENTES (existentes) ======
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!useExisting) return;
      if (!clientQuery.trim()) {
        setClientSugs([]);
        setClientActiveIdx(-1);
        return;
      }
      try {
        // Intenta /clientes/search; si no existe, cae a /clientes/get y filtra en cliente
        let data = [];
        const trySearch = await fetch(`${API_URL}clientes/search?q=${encodeURIComponent(clientQuery)}`);
        if (trySearch.ok) {
          data = await trySearch.json();
        } else {
          const resAll = await fetch(`${API_URL}clientes/get`);
          if (!resAll.ok) throw new Error('No se pudo cargar clientes.');
          const all = await resAll.json();
          const q = clientQuery.trim().toLowerCase();
          data = all.filter(c =>
            `${c.nombre || ''} ${c.apellidos || ''}`.toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.dni || '').toLowerCase().includes(q)
          );
        }
        setClientSugs(data.slice(0, 8));
        setClientActiveIdx(data.length ? 0 : -1);
      } catch (e) {
        console.error('Error buscando clientes:', e);
        setClientSugs([]);
        setClientActiveIdx(-1);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [clientQuery, useExisting]);

  function chooseClient(c) {
    setSelectedClient(c);
    setClientSugs([]);
    setClientQuery(`${c.nombre} ${c.apellidos}${c.dni ? ' · ' + c.dni : c.email ? ' · ' + c.email : ''}`);
  }
  function clearSelectedClient() {
    setSelectedClient(null);
    setClientQuery('');
  }
  function onClientKeyDown(e) {
    if (!clientSugs.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setClientActiveIdx(i => Math.min(i + 1, clientSugs.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setClientActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (clientActiveIdx >= 0) chooseClient(clientSugs[clientActiveIdx]); }
    else if (e.key === 'Escape') { setClientSugs([]); setClientActiveIdx(-1); }
  }

  // ====== Buscar PRODUCTOS ======
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setSugerencias([]);
        setActiveIdx(-1);
        return;
      }
      try {
        const res = await fetch(`${API_URL}productos/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          setSugerencias([]);
          setActiveIdx(-1);
          return;
        }
        const data = await res.json();
        const normalize = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const nq = normalize(query);
        const scored = data
          .map((p) => ({ p, score: normalize(p.nombre).indexOf(nq) }))
          .filter((x) => x.score >= 0)
          .sort((a, b) => a.score - b.score)
          .slice(0, 8)
          .map((x) => x.p);
        setSugerencias(scored);
        setActiveIdx(scored.length ? 0 : -1);
      } catch (err) {
        console.error('Error buscando productos:', err);
        setSugerencias([]);
        setActiveIdx(-1);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(prod) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.producto.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + 1 };
        return copy;
      }
      return [...prev, { producto: prod, cantidad: 1, precio_unitario: prod.precio }];
    });
    setQuery('');
    setSugerencias([]);
    setActiveIdx(-1);
  }

  function updateCantidad(id, val) {
    const cantidad = Math.max(1, Number(val) || 1);
    setItems((prev) => prev.map((it) => (it.producto.id === id ? { ...it, cantidad } : it)));
  }
  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.producto.id !== id));
  }
  function onKeyDown(e) {
    if (!sugerencias.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, sugerencias.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0) addItem(sugerencias[activeIdx]); }
    else if (e.key === 'Escape') { setSugerencias([]); setActiveIdx(-1); }
  }

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.cantidad * (it.precio_unitario ?? it.producto.precio), 0),
    [items]
  );

  // ====== Submit ======
  async function handleSubmit(e) {
    e.preventDefault();

    if (items.length === 0) {
      alert('Añade al menos un producto.');
      return;
    }

    let payloadBase = {
      fecha,
      descripcion,
      items: items.map((it) => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario ?? it.producto.precio,
      })),
    };

    let payload;
    if (useExisting) {
      if (!selectedClient) {
        alert('Selecciona un cliente existente o desactiva "Usar cliente existente".');
        return;
      }
      payload = { ...payloadBase, cliente_id: selectedClient.id };
    } else {
      if (!clienteNombre || !clienteApellidos || (!clienteDni && !clienteEmail)) {
        alert('Completa: nombre y apellidos, y DNI o email del nuevo cliente.');
        return;
      }
      payload = {
        ...payloadBase,
        cliente: {
          nombre: clienteNombre,
          apellidos: clienteApellidos,
          dni: clienteDni || null,
          email: clienteEmail || null,
          telefono1: telefono1 || null,
          telefono2: telefono2 || null,
          calle: calle || null,
          numero_vivienda: numeroVivienda || null,
          piso_portal: pisoPortal || null,
          ciudad: ciudad || null,
          codigo_postal: codigoPostal || null,
        },
      };
    }

    const res = await fetch(`${API_URL}albaranes/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Error al crear albarán: ${err.detail || res.statusText}`);
      return;
    }

    // Limpieza
    setItems([]);
    setDescripcion('');
    setFecha(new Date().toISOString().slice(0, 10));
    if (useExisting) {
      clearSelectedClient();
    } else {
      setClienteNombre(''); setClienteApellidos(''); setClienteDni('');
      setClienteEmail(''); setTelefono1(''); setTelefono2('');
      setCalle(''); setNumeroVivienda(''); setPisoPortal('');
      setCiudad(''); setCodigoPostal('');
    }
    alert('Albarán creado con éxito ✅');
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Nueva venta (Crear albarán)</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== CLIENTE ===== */}
        <section className="bg-white p-4 rounded-xl shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Cliente</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useExisting}
                onChange={e => { setUseExisting(e.target.checked); if (!e.target.checked) clearSelectedClient(); }}
              />
              Usar cliente existente
            </label>
          </div>

          {useExisting ? (
            <>
              <div className="relative">
                <input
                  value={clientQuery}
                  onChange={e => { setClientQuery(e.target.value); setSelectedClient(null); }}
                  onKeyDown={onClientKeyDown}
                  placeholder="Busca por nombre, apellidos, email o DNI…"
                  className="w-full border rounded-lg px-3 py-2"
                />
                {clientQuery && (
                  <div
                    ref={clientListRef}
                    className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-sm max-h-64 overflow-auto"
                  >
                    {clientSugs.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                    ) : (
                      clientSugs.map((c, i) => (
                        <button
                          type="button"
                          key={c.id}
                          onMouseDown={(e) => { e.preventDefault(); chooseClient(c); }}
                          onMouseEnter={() => setClientActiveIdx(i)}
                          className={`w-full text-left px-3 py-2 ${i === clientActiveIdx ? 'bg-gray-100' : 'bg-white'}`}
                        >
                          <div className="font-medium truncate">{c.nombre} {c.apellidos}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {c.dni ? `${c.dni} · ` : ''}{c.email || 'sin email'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedClient && (
                <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{selectedClient.nombre} {selectedClient.apellidos}</div>
                    <div className="text-gray-500">{selectedClient.dni}{selectedClient.email ? ` · ${selectedClient.email}` : ''}</div>
                  </div>
                  <button type="button" onClick={clearSelectedClient} className="text-red-600 text-sm">Quitar</button>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm mb-1">Nombre</label>
              <input value={clienteNombre} onChange={e=>setClienteNombre(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Nombre" />

              <label className="block text-sm mb-1">Apellidos</label>
              <input value={clienteApellidos} onChange={e=>setClienteApellidos(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Apellidos" />

              <label className="block text-sm mb-1">DNI (opcional pero recomendado)</label>
              <input value={clienteDni} onChange={e=>setClienteDni(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="00000000X" />

              <label className="block text-sm mb-1">Email</label>
              <input value={clienteEmail} onChange={e=>setClienteEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="correo@dominio.com" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Teléfono 1</label>
                  <input value={telefono1} onChange={e=>setTelefono1(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Móvil" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Teléfono 2 (opcional)</label>
                  <input value={telefono2} onChange={e=>setTelefono2(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Otro teléfono" />
                </div>
              </div>

              <label className="block text-sm mb-1">Calle</label>
              <input value={calle} onChange={e=>setCalle(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Calle" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Número</label>
                  <input value={numeroVivienda} onChange={e=>setNumeroVivienda(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="12B / s/n" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Piso/Portal (opcional)</label>
                  <input value={pisoPortal} onChange={e=>setPisoPortal(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="2A" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Ciudad</label>
                  <input value={ciudad} onChange={e=>setCiudad(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Ciudad" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Código postal</label>
                  <input value={codigoPostal} onChange={e=>setCodigoPostal(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="CP" />
                </div>
              </div>
            </>
          )}

          {/* Fecha y descripción (ambos modos) */}
          <label className="block text-sm mb-1 mt-2">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mb-3" />

          <label className="block text-sm mb-1">Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Observaciones…" />
        </section>

        {/* ===== PRODUCTOS ===== */}
        <section className="bg-white p-4 rounded-xl shadow-sm lg:col-span-2">
          <h2 className="font-semibold mb-3">Productos</h2>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar producto por nombre…"
              className="w-full border rounded-lg px-3 py-2"
            />
            {query && (
              <div
                ref={listRef}
                className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-sm max-h-64 overflow-auto"
              >
                {sugerencias.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                ) : (
                  sugerencias.map((p, i) => (
                    <button
                      type="button"
                      key={p.id}
                      onMouseDown={(e) => { e.preventDefault(); addItem(p); }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                        i === activeIdx ? 'bg-gray-100' : 'bg-white'
                      }`}
                    >
                      <span className="truncate">
                        <Highlight text={p.nombre} query={query} />
                      </span>
                      <span className="text-sm text-gray-500 ml-3 shrink-0">
                        {Number(p.precio).toFixed(2)} €
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Items seleccionados */}
          <div className="mt-4 border rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Producto</th>
                  <th className="p-2 w-28">Cantidad</th>
                  <th className="p-2 w-32">Precio</th>
                  <th className="p-2 w-32">Subtotal</th>
                  <th className="p-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.producto.id} className="border-b">
                    <td className="p-2">{it.producto.nombre}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={it.cantidad}
                        onChange={e => updateCantidad(it.producto.id, e.target.value)}
                        className="w-24 border rounded-lg px-2 py-1"
                      />
                    </td>
                    <td className="p-2">{Number(it.precio_unitario ?? it.producto.precio).toFixed(2)} €</td>
                    <td className="p-2">
                      {(it.cantidad * (it.precio_unitario ?? it.producto.precio)).toFixed(2)} €
                    </td>
                    <td className="p-2">
                      <button type="button" onClick={() => removeItem(it.producto.id)} className="text-red-600">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="p-3 text-sm text-gray-500" colSpan={5}>
                      No hay productos seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold">{total.toFixed(2)} €</div>
            </div>
          </div>
        </section>

        {/* ===== GUARDAR ===== */}
        <div className="lg:col-span-3 flex justify-end">
          <button type="submit" className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">
            Guardar albarán
          </button>
        </div>
      </form>
    </div>
  );
}
