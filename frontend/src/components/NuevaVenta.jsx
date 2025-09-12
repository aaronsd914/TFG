import { useEffect, useMemo, useState, useRef } from 'react';

const API_URL = 'http://localhost:8000/api/'; // <-- cambia si tu backend usa otro host/puerto

export default function NuevaVenta() {
  
  // Cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState('');

  // Productos
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef(null);
  const [items, setItems] = useState([]); // {producto, cantidad, precio_unitario}


  useEffect(() => {
  const t = setTimeout(async () => {
    if (!query.trim()) {
      setSugerencias([]);
      setActiveIdx(-1);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}productos/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        setSugerencias([]);
        setActiveIdx(-1);
        return;
      }

      const data = await res.json();

      // Normalizador: minúsculas + sin acentos
      const normalize = (s = "") =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const nq = normalize(query);

      const scored = data
        .map((p) => ({
          p,
          score: normalize(p.nombre).indexOf(nq),
        }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, 8)
        .map((x) => x.p);

      setSugerencias(scored);
      setActiveIdx(scored.length ? 0 : -1);
    } catch (err) {
      console.error("Error buscando productos:", err);
      setSugerencias([]);
      setActiveIdx(-1);
    }
  }, 200);

  return () => clearTimeout(t);
}, [query]);


  function addItem(prod) {
    setItems(prev => {
      const idx = prev.findIndex(p => p.producto.id === prod.id);
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
    setItems(prev => prev.map(it => it.producto.id === id ? { ...it, cantidad } : it));
  }

  function removeItem(id) {
    setItems(prev => prev.filter(it => it.producto.id !== id));
  }

  function onKeyDown(e) {
    if (!sugerencias.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, sugerencias.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) addItem(sugerencias[activeIdx]);
    } else if (e.key === 'Escape') {
      setSugerencias([]);
      setActiveIdx(-1);
    }
  }

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

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.cantidad * (it.precio_unitario ?? it.producto.precio), 0),
    [items]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clienteNombre || !clienteEmail || items.length === 0) {
      alert('Completa los datos del cliente y añade al menos un producto.');
      return;
    }

    const payload = {
      fecha,
      descripcion,
      cliente: { nombre: clienteNombre, email: clienteEmail },
      items: items.map(it => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario ?? it.producto.precio,
      })),
    };

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

    setClienteNombre(''); setClienteEmail('');
    setDescripcion(''); setItems([]);
    alert('Albarán creado con éxito ✅');
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Nueva venta (Crear albarán)</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cliente */}
        <section className="bg-white p-4 rounded-xl shadow-sm lg:col-span-1">
          <h2 className="font-semibold mb-3">Cliente</h2>
          <label className="block text-sm mb-1">Nombre</label>
          <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="Nombre y apellidos" />
          <label className="block text-sm mb-1">Email</label>
          <input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 mb-3" placeholder="correo@dominio.com" />
          <label className="block text-sm mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 mb-3" />
          <label className="block text-sm mb-1">Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Observaciones…" />
        </section>

        {/* Productos */}
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

        {/* Guardar */}
        <div className="lg:col-span-3 flex justify-end">
          <button type="submit" className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">
            Guardar albarán
          </button>
        </div>
      </form>
    </div>
  );
}
