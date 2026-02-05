// components/NuevaVenta.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = 'http://localhost:8000/api/';

function formatEUR(n) {
  const num = Number(n || 0);
  return `${num.toFixed(2)} €`;
}

function Label({ children, required }) {
  return (
    <span className="text-sm font-medium text-gray-700">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
}

function Field({ label, required, hint, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label ? (
        <div className="flex items-end justify-between gap-3 mb-1">
          <label className="block">
            <Label required={required}>{label}</Label>
          </label>
          {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
        </div>
      ) : null}

      <input
        {...props}
        className={[
          'w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200',
          props.disabled ? 'bg-gray-50 text-gray-500' : '',
        ].join(' ')}
      />
    </div>
  );
}

function TextArea({ label, required, hint, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label ? (
        <div className="flex items-end justify-between gap-3 mb-1">
          <label className="block">
            <Label required={required}>{label}</Label>
          </label>
          {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
        </div>
      ) : null}

      <textarea
        {...props}
        className={[
          'w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200',
          props.disabled ? 'bg-gray-50 text-gray-500' : '',
        ].join(' ')}
      />
    </div>
  );
}

function Section({ title, subtitle, right, error, children }) {
  return (
    <section
      className={[
        'rounded-2xl border bg-white shadow-sm',
        error ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Toast({ show, message, onClose }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-green-500" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-green-800">Operación completada</div>
          <div className="text-sm text-green-700">{message}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded-lg px-2 py-1 text-sm font-semibold text-green-800 hover:bg-green-100"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

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

  // ---- Fianza ----
  const [registrarFianza, setRegistrarFianza] = useState(false);
  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.cantidad * (it.precio_unitario ?? it.producto.precio), 0),
    [items]
  );
  const fianzaPorDefecto = useMemo(() => Number((total * 0.30).toFixed(2)), [total]);
  const [fianzaCantidad, setFianzaCantidad] = useState(''); // vacío = usar 30% auto

  // ---- Validación UI (errores) ----
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  // ---- Mensaje de confirmación (toast) ----
  const [toast, setToast] = useState({ show: false, message: '' });

  function showToast(message) {
    setToast({ show: true, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ show: false, message: '' }), 3500);
  }

  function clearError(key) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setFormError((prev) => (prev ? '' : prev));
  }

  // ====== Helpers ======
  function Highlight({ text, query }) {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-yellow-100 px-1 py-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  // ====== Buscar CLIENTES (existentes) ======
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!useExisting) return;

      // ✅ Si ya hay cliente seleccionado, cerramos el buscador (no sugerencias)
      if (selectedClient) {
        setClientSugs([]);
        setClientActiveIdx(-1);
        return;
      }

      if (!clientQuery.trim()) {
        setClientSugs([]);
        setClientActiveIdx(-1);
        return;
      }

      try {
        let data = [];
        const trySearch = await fetch(`${API_URL}clientes/search?q=${encodeURIComponent(clientQuery)}`);
        if (trySearch.ok) {
          data = await trySearch.json();
        } else {
          const resAll = await fetch(`${API_URL}clientes/get`);
          if (!resAll.ok) throw new Error('No se pudo cargar clientes.');
          const all = await resAll.json();
          const q = clientQuery.trim().toLowerCase();
          data = all.filter(
            (c) =>
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
  }, [clientQuery, useExisting, selectedClient]);

  function chooseClient(c) {
    setSelectedClient(c);
    setClientSugs([]);
    setClientActiveIdx(-1);
    setClientQuery(`${c.nombre} ${c.apellidos}${c.dni ? ' · ' + c.dni : c.email ? ' · ' + c.email : ''}`);
    clearError('cliente');
  }

  function clearSelectedClient() {
    setSelectedClient(null);
    setClientQuery('');
    setClientSugs([]);
    setClientActiveIdx(-1);
  }

  function onClientKeyDown(e) {
    if (!clientSugs.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setClientActiveIdx((i) => Math.min(i + 1, clientSugs.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setClientActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (clientActiveIdx >= 0) chooseClient(clientSugs[clientActiveIdx]);
    } else if (e.key === 'Escape') {
      setClientSugs([]);
      setClientActiveIdx(-1);
    }
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
    clearError('items');
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

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, sugerencias.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) addItem(sugerencias[activeIdx]);
    } else if (e.key === 'Escape') {
      setSugerencias([]);
      setActiveIdx(-1);
    }
  }

  // ====== Submit ======
  async function handleSubmit(e) {
    e.preventDefault();

    setErrors({});
    setFormError('');

    const nextErrors = {};
    const requiredLabels = {
      clienteNombre: 'Nombre',
      clienteApellidos: 'Apellidos',
      clienteDni: 'DNI',
      clienteEmail: 'Email',
      telefono1: 'Teléfono 1',
      calle: 'Calle',
      numeroVivienda: 'Número',
      ciudad: 'Ciudad',
      codigoPostal: 'Código postal',
      cliente: 'Cliente',
      items: 'Productos',
    };

    const mark = (key) => {
      if (!nextErrors[key]) nextErrors[key] = true;
    };

    if (items.length === 0) mark('items');

    if (useExisting) {
      if (!selectedClient) mark('cliente');
    } else {
      if (!clienteNombre.trim()) mark('clienteNombre');
      if (!clienteApellidos.trim()) mark('clienteApellidos');
      if (!clienteDni.trim()) mark('clienteDni');
      if (!clienteEmail.trim()) mark('clienteEmail');
      if (!telefono1.trim()) mark('telefono1');
      if (!calle.trim()) mark('calle');
      if (!numeroVivienda.trim()) mark('numeroVivienda');
      if (!ciudad.trim()) mark('ciudad');
      if (!codigoPostal.trim()) mark('codigoPostal');
    }

    const firstErrorKey = Object.keys(nextErrors)[0];
    if (firstErrorKey) {
      setErrors(nextErrors);
      setFormError(`${requiredLabels[firstErrorKey]} es obligatorio`);
      return;
    }

    const payloadBase = {
      fecha,
      descripcion,
      items: items.map((it) => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario ?? it.producto.precio,
      })),
    };

    if (registrarFianza) {
      payloadBase.registrar_fianza = true;
      payloadBase.fianza_cantidad = fianzaCantidad === '' ? null : Number(fianzaCantidad);
    } else {
      payloadBase.registrar_fianza = false;
    }

    let payload;
    if (useExisting) {
      payload = { ...payloadBase, cliente_id: selectedClient.id };
    } else {
      payload = {
        ...payloadBase,
        cliente: {
          nombre: clienteNombre.trim(),
          apellidos: clienteApellidos.trim(),
          dni: clienteDni.trim(),
          email: clienteEmail.trim(),
          telefono1: telefono1.trim(),
          telefono2: telefono2.trim() || null,
          calle: calle.trim(),
          numero_vivienda: numeroVivienda.trim(),
          piso_portal: pisoPortal.trim() || null,
          ciudad: ciudad.trim(),
          codigo_postal: codigoPostal.trim(),
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
      setFormError(`Error al crear albarán: ${err.detail || res.statusText}`);
      return;
    }

    // Limpieza
    setItems([]);
    setDescripcion('');
    setFecha(new Date().toISOString().slice(0, 10));
    setRegistrarFianza(false);
    setFianzaCantidad('');
    setErrors({});
    setFormError('');

    if (useExisting) {
      clearSelectedClient();
    } else {
      setClienteNombre('');
      setClienteApellidos('');
      setClienteDni('');
      setClienteEmail('');
      setTelefono1('');
      setTelefono2('');
      setCalle('');
      setNumeroVivienda('');
      setPisoPortal('');
      setCiudad('');
      setCodigoPostal('');
    }

    showToast('El albarán se ha creado correctamente y se ha enviado al cliente por correo electrónico.');
  }

  const totalItems = useMemo(() => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0), [items]);
  const fianzaFinal = registrarFianza ? (fianzaCantidad === '' ? fianzaPorDefecto : Number(fianzaCantidad || 0)) : 0;

  const clienteColSpan = useExisting ? 'lg:col-span-4' : 'lg:col-span-12';
  const productosColSpan = useExisting ? 'lg:col-span-8' : 'lg:col-span-12';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Toast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: '' })} />

      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Nueva venta</h1>
        <p className="text-sm text-gray-600">Crea un albarán seleccionando cliente y productos. Opcionalmente puedes registrar una fianza.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ===== CLIENTE + DATOS VENTA ===== */}
        <div className={clienteColSpan}>
          <Section
            title="Cliente"
            subtitle="Elige un cliente existente o registra uno nuevo."
            error={Boolean(errors.cliente)}
            right={
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={useExisting}
                  onChange={(e) => {
                    setUseExisting(e.target.checked);
                    setErrors({});
                    setFormError('');
                    if (!e.target.checked) clearSelectedClient();
                  }}
                  className="h-4 w-4"
                />
                <span className="text-gray-700">Usar existente</span>
              </label>
            }
          >
            {useExisting ? (
              <>
                <div className="relative">
                  <Field
                    value={clientQuery}
                    onChange={(e) => {
                      setClientQuery(e.target.value);
                      // ✅ Si editas el input, permitimos volver a buscar (des-selecciona)
                      if (selectedClient) setSelectedClient(null);
                      clearError('cliente');
                    }}
                    onKeyDown={onClientKeyDown}
                    placeholder="Busca por nombre, apellidos, email o DNI…"
                    aria-label="Buscar cliente"
                    error={Boolean(errors.cliente)}
                  />

                  {/* ✅ Solo mostramos el desplegable si NO hay cliente seleccionado */}
                  {clientQuery && !selectedClient ? (
                    <div
                      ref={clientListRef}
                      className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
                    >
                      <div className="max-h-64 overflow-auto p-1">
                        {clientSugs.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-500">Sin resultados</div>
                        ) : (
                          clientSugs.map((c, i) => (
                            <button
                              type="button"
                              key={c.id}
                              onMouseDown={(ev) => {
                                ev.preventDefault();
                                chooseClient(c);
                              }}
                              onMouseEnter={() => setClientActiveIdx(i)}
                              className={[
                                'w-full rounded-xl px-3 py-2 text-left transition',
                                i === clientActiveIdx ? 'bg-gray-100' : 'hover:bg-gray-50',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-900">
                                    {c.nombre} {c.apellidos}
                                  </div>
                                  <div className="truncate text-xs text-gray-500">
                                    {c.dni ? `${c.dni} · ` : ''}
                                    {c.email || 'sin email'}
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">ID {c.id}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedClient ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">
                          {selectedClient.nombre} {selectedClient.apellidos}
                        </div>
                        <div className="mt-1 truncate text-sm text-gray-600">
                          {selectedClient.dni ? selectedClient.dni : 'Sin DNI'}
                          {selectedClient.email ? ` · ${selectedClient.email}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          clearSelectedClient();
                          clearError('cliente');
                        }}
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <Field
                  label="Nombre"
                  required
                  value={clienteNombre}
                  onChange={(e) => {
                    setClienteNombre(e.target.value);
                    clearError('clienteNombre');
                  }}
                  placeholder="Nombre"
                  error={Boolean(errors.clienteNombre)}
                />

                <Field
                  label="Apellidos"
                  required
                  value={clienteApellidos}
                  onChange={(e) => {
                    setClienteApellidos(e.target.value);
                    clearError('clienteApellidos');
                  }}
                  placeholder="Apellidos"
                  error={Boolean(errors.clienteApellidos)}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="DNI"
                    required
                    value={clienteDni}
                    onChange={(e) => {
                      setClienteDni(e.target.value);
                      clearError('clienteDni');
                    }}
                    placeholder="00000000X"
                    error={Boolean(errors.clienteDni)}
                  />

                  <Field
                    label="Email"
                    required
                    value={clienteEmail}
                    onChange={(e) => {
                      setClienteEmail(e.target.value);
                      clearError('clienteEmail');
                    }}
                    placeholder="correo@dominio.com"
                    type="email"
                    error={Boolean(errors.clienteEmail)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Teléfono 1"
                    required
                    value={telefono1}
                    onChange={(e) => {
                      setTelefono1(e.target.value);
                      clearError('telefono1');
                    }}
                    placeholder="Móvil"
                    error={Boolean(errors.telefono1)}
                  />

                  <Field label="Teléfono 2" value={telefono2} onChange={(e) => setTelefono2(e.target.value)} placeholder="Otro teléfono" />
                </div>

                <Field
                  label="Calle"
                  required
                  value={calle}
                  onChange={(e) => {
                    setCalle(e.target.value);
                    clearError('calle');
                  }}
                  placeholder="Calle"
                  error={Boolean(errors.calle)}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Número"
                    required
                    value={numeroVivienda}
                    onChange={(e) => {
                      setNumeroVivienda(e.target.value);
                      clearError('numeroVivienda');
                    }}
                    placeholder="12B / s/n"
                    error={Boolean(errors.numeroVivienda)}
                  />

                  <Field label="Piso/Portal" value={pisoPortal} onChange={(e) => setPisoPortal(e.target.value)} placeholder="2A" />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Ciudad"
                    required
                    value={ciudad}
                    onChange={(e) => {
                      setCiudad(e.target.value);
                      clearError('ciudad');
                    }}
                    placeholder="Ciudad"
                    error={Boolean(errors.ciudad)}
                  />

                  <Field
                    label="Código postal"
                    required
                    value={codigoPostal}
                    onChange={(e) => {
                      setCodigoPostal(e.target.value);
                      clearError('codigoPostal');
                    }}
                    placeholder="CP"
                    error={Boolean(errors.codigoPostal)}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3">
              <Field label="Fecha" required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <TextArea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Observaciones…" />
            </div>
          </Section>
        </div>

        {/* ===== PRODUCTOS ===== */}
        <div className={productosColSpan}>
          <Section title="Productos" subtitle="Busca productos y ajusta cantidades." error={Boolean(errors.items)}>
            <div className="relative">
              <Field
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar producto por nombre…"
                aria-label="Buscar producto"
                error={Boolean(errors.items) && items.length === 0}
              />

              {query ? (
                <div ref={listRef} className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <div className="max-h-72 overflow-auto p-1">
                    {sugerencias.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-gray-500">Sin resultados</div>
                    ) : (
                      sugerencias.map((p, i) => (
                        <button
                          type="button"
                          key={p.id}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            addItem(p);
                          }}
                          onMouseEnter={() => setActiveIdx(i)}
                          className={[
                            'w-full rounded-xl px-3 py-2 text-left transition',
                            i === activeIdx ? 'bg-gray-100' : 'hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 truncate text-sm font-medium text-gray-900">
                              <Highlight text={p.nombre} query={query} />
                            </div>
                            <div className="shrink-0 text-sm font-semibold text-gray-700">{formatEUR(p.precio)}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
              <div className="overflow-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 w-32">Cantidad</th>
                      <th className="px-4 py-3 w-40">Precio</th>
                      <th className="px-4 py-3 w-40">Subtotal</th>
                      <th className="px-4 py-3 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map((it) => {
                      const precio = it.precio_unitario ?? it.producto.precio;
                      const subtotal = it.cantidad * precio;
                      return (
                        <tr key={it.producto.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{it.producto.nombre}</div>
                            <div className="text-xs text-gray-500">ID {it.producto.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={it.cantidad}
                              onChange={(e) => updateCantidad(it.producto.id, e.target.value)}
                              className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-800">{formatEUR(precio)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-bold text-gray-900">{formatEUR(subtotal)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(it.producto.id)}
                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                              title="Quitar"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center">
                          <div className="text-sm font-semibold text-gray-700">No hay productos seleccionados</div>
                          <div className="mt-1 text-sm text-gray-500">Usa el buscador para añadir productos a la venta.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600">
                    {items.length} línea(s) · {totalItems} unidad(es)
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Total:</span>{' '}
                    <span className="font-extrabold text-gray-900">{formatEUR(total)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={registrarFianza}
                        onChange={(e) => setRegistrarFianza(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Registrar fianza (30% por defecto: {formatEUR(fianzaPorDefecto)})
                    </label>

                    {registrarFianza ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-600">Importe:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={fianzaCantidad}
                          onChange={(e) => setFianzaCantidad(e.target.value)}
                          placeholder={String(fianzaPorDefecto.toFixed(2))}
                          className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                        />
                        <span className="text-xs text-gray-500">(vacío = {formatEUR(fianzaPorDefecto)})</span>
                        <span className="ml-2 text-xs text-gray-500">Aplicada: {formatEUR(fianzaFinal)}</span>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    className="rounded-2xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-200"
                  >
                    Guardar albarán
                  </button>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-12">{formError ? <div className="text-sm font-semibold text-red-600">{formError}</div> : null}</div>
      </form>
    </div>
  );
}
