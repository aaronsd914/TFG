// components/NuevaVenta.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config.js';

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

export default function NuevaVenta() {
  const { t } = useTranslation();
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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  // ---- Productos ----
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef(null);
  const [items, setItems] = useState([]); // {producto, cantidad, precio_unitario}

  // ---- Fianza ----
  const [registrarFianza, setRegistrarFianza] = useState(false);
  const total = useMemo(
    () => Math.round(items.reduce((acc, it) => acc + it.quantity * (it.unit_price ?? it.producto.price), 0) * 100) / 100,
    [items]
  );
  const fianzaPorDefecto = useMemo(() => Number((total * 0.30).toFixed(2)), [total]);
  const [fianzaCantidad, setFianzaCantidad] = useState(''); // vacío = usar 30% auto

  // ---- Validación UI (errores) ----
  const [errors, setErrors] = useState({});

  function clearError(key) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
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
        <mark className="rounded bg-yellow-100">{text.slice(idx, idx + q.length)}</mark>
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
          if (!resAll.ok) throw new Error(t('newSale.errLoadClients'));
          const all = await resAll.json();
          const q = clientQuery.trim().toLowerCase();
          data = all.filter(
            (c) =>
              `${c.name || ''} ${c.surnames || ''}`.toLowerCase().includes(q) ||
              (c.email || '').toLowerCase().includes(q) ||
              (c.dni || '').toLowerCase().includes(q)
          );
        }
        setClientSugs(data.slice(0, 8));
        setClientActiveIdx(data.length ? 0 : -1);
      } catch (e) {
        console.warn('Client search error:', e);
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
    setClientQuery(`${c.name} ${c.surnames}${c.dni ? ' · ' + c.dni : c.email ? ' · ' + c.email : ''}`);
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
        const res = await fetch(`${API_URL}productos/search?q=${encodeURIComponent(query)}&limit=200`);
        if (!res.ok) {
          setSugerencias([]);
          setActiveIdx(-1);
          return;
        }
        const data = await res.json();
        const normalize = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const nq = normalize(query);
        const scored = data
          .map((p) => ({ p, score: normalize(p.name).indexOf(nq) }))
          .filter((x) => x.score >= 0)
          .sort((a, b) => a.score - b.score)
          .map((x) => x.p);

        setSugerencias(scored);
        setActiveIdx(scored.length ? 0 : -1);
      } catch (err) {
        console.warn('Product search error:', err);
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
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { producto: prod, quantity: 1, unit_price: prod.price }];
    });
    setQuery('');
    setSugerencias([]);
    setActiveIdx(-1);
    clearError('items');
  }

  function updateQuantity(id, val) {
    const quantity = Math.max(1, Number(val) || 1);
    setItems((prev) => prev.map((it) => (it.producto.id === id ? { ...it, quantity } : it)));
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

    const nextErrors = {};
    const missingFields = [];
    const formatIssues = [];
    const mark = (key) => { if (!nextErrors[key]) { nextErrors[key] = true; } };
    const markFormat = (key, msg) => {
      if (!nextErrors[key]) { nextErrors[key] = true; }
      formatIssues.push(msg);
    };

    if (items.length === 0) mark('items');

    if (useExisting) {
      if (!selectedClient) { mark('cliente'); missingFields.push(t('newSale.fieldClient')); }
    } else {
      if (!clienteNombre.trim()) { mark('clienteNombre'); missingFields.push(t('newSale.fieldName')); }
      if (!clienteApellidos.trim()) { mark('clienteApellidos'); missingFields.push(t('newSale.fieldSurnames')); }
      if (!clienteDni.trim()) { mark('clienteDni'); missingFields.push(t('newSale.fieldDNI')); }
      // email is optional – only validate format when provided
      if (!telefono1.trim()) { mark('telefono1'); missingFields.push(t('newSale.fieldPhone1')); }
      if (!calle.trim()) { mark('calle'); missingFields.push(t('newSale.fieldStreet')); }
      if (!numeroVivienda.trim()) { mark('numeroVivienda'); missingFields.push(t('newSale.fieldNumber')); }
      if (!ciudad.trim()) { mark('ciudad'); missingFields.push(t('newSale.fieldCity')); }
      if (!codigoPostal.trim()) { mark('codigoPostal'); missingFields.push(t('newSale.fieldPostCode')); }

      // Format validations (only when the field has a value)
      if (clienteDni.trim() && !(/^([XYZxyz]\d{7}[A-Za-z]|\d{8}[A-Za-z])$/).test(clienteDni.trim())) {
        markFormat('clienteDni', t('newSale.errDniFormat'));
      }
      if (telefono1.trim() && !(/^\d+$/).test(telefono1.trim())) {
        markFormat('telefono1', t('newSale.errPhoneFormat'));
      }
      if (telefono2.trim() && !(/^\d+$/).test(telefono2.trim())) {
        markFormat('telefono2', t('newSale.errPhoneFormat'));
      }
      if (codigoPostal.trim() && !(/^\d+$/).test(codigoPostal.trim())) {
        markFormat('codigoPostal', t('newSale.errPostalFormat'));
      }
      if (clienteEmail.trim()) {
        const emailParts = clienteEmail.trim().split('@');
        const validEmail = emailParts.length === 2 && emailParts[0].length > 0 && emailParts[1].includes('.') && !clienteEmail.includes(' ');
        if (!validEmail) markFormat('clienteEmail', t('newSale.errEmailFormat'));
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      let description = '';
      if (missingFields.length > 0) description += `${t('newSale.errMissingFields')}: ${missingFields.join(', ')}.`;
      if (formatIssues.length > 0) {
        if (description) description += ' ';
        description += formatIssues.join(' ');
      }
      if (!description) description = t('newSale.errNoProducts');

      try {
        sileo.warning({ title: t('newSale.toastFormError'), description });
      } catch {}
      return;
    }

    const payloadBase = {
      date,
      description,
      items: items.map((it) => ({
        product_id: it.producto.id,
        quantity: it.quantity,
        unit_price: it.unit_price ?? it.producto.price,
      })),
    };

    if (registrarFianza) {
      payloadBase.register_deposit = true;
      payloadBase.deposit_amount = fianzaCantidad === '' ? null : Math.round(Number(fianzaCantidad) * 100) / 100;
    } else {
      payloadBase.register_deposit = false;
    }

    let payload;
    if (useExisting) {
      payload = { ...payloadBase, customer_id: selectedClient.id };
    } else {
      payload = {
        ...payloadBase,
        customer: {
          name: clienteNombre.trim(),
          surnames: clienteApellidos.trim(),
          dni: clienteDni.trim(),
          email: clienteEmail.trim() || null,
          phone1: telefono1.trim(),
          phone2: telefono2.trim() || null,
          street: calle.trim(),
          house_number: numeroVivienda.trim(),
          floor_entrance: pisoPortal.trim() || null,
          city: ciudad.trim(),
          postal_code: codigoPostal.trim(),
        },
      };
    }

    try {
      const res = await fetch(`${API_URL}albaranes/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        try {
          sileo.error({
            title: t('newSale.toastCreateError'),
            description: body?.detail || res.statusText,
          });
        } catch {}
        return;
      }

      // Limpieza
      setItems([]);
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
      setRegistrarFianza(false);
      setFianzaCantidad('');
      setErrors({});

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

      // ✅ Notificación de éxito
      try {
        const albId = body?.id ? `#${body.id}` : '';
        sileo.success({
          title: t('newSale.toastCreated', { id: albId }).trim(),
          description: t('newSale.toastCreatedDesc'),
        });
      } catch {}

      // ✅ Descargar PDF y enviar email en paralelo e independientemente
      if (body?.id) {
        // 1) Descargar PDF
        (async () => {
          try {
            const pdfRes = await fetch(`${API_URL}albaranes/${body.id}/pdf`);
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              const today = new Date().toISOString().slice(0, 10);
              const clientName = (useExisting && selectedClient)
                ? `_${selectedClient.name}_${selectedClient.surnames}`.replace(/\s+/g, '_')
                : '';
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${today}_delivery_note_${body.id}${clientName}.pdf`;
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
              try { sileo.error({ title: t('newSale.toastPdfError'), description: t('newSale.toastPdfErrorDesc') }); } catch {}
            }
          } catch {
            try { sileo.error({ title: t('newSale.toastPdfError'), description: t('newSale.toastPdfErrorDesc') }); } catch {}
          }
        })();

        // 2) Enviar email al cliente (independiente del PDF)
        fetch(`${API_URL}albaranes/${body.id}/send-email`, { method: 'POST' }).catch(() => {});
      }
    } catch (e) {
      try {
        sileo.error({
          title: t('newSale.toastNetworkError'),
          description: e?.message || t('newSale.toastNetworkDesc'),
        });
      } catch {}
    }
  }

  const totalItems = useMemo(() => items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0), [items]);
  const fianzaFinal = registrarFianza ? (fianzaCantidad === '' ? fianzaPorDefecto : Number(fianzaCantidad || 0)) : 0;

  const clienteColSpan = useExisting ? 'lg:col-span-4' : 'lg:col-span-12';
  const productosColSpan = useExisting ? 'lg:col-span-8' : 'lg:col-span-12';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{t('newSale.title')}</h1>
        <p className="text-sm text-gray-600">
          {t('newSale.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ===== CLIENTE + DATOS VENTA ===== */}
        <div className={clienteColSpan}>
          <Section
            title={t('newSale.clientSection')}
            subtitle={t('newSale.clientSubtitle')}
            error={Boolean(errors.cliente)}
            right={
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                <span>{t('newSale.useExisting')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useExisting}
                  onClick={() => {
                    const next = !useExisting;
                    setUseExisting(next);
                    setErrors({});
                    if (!next) clearSelectedClient();
                  }}
                  className={[
                    'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none',
                    useExisting ? 'bg-blue-600' : 'bg-gray-300',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform',
                      useExisting ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')}
                  />
                </button>
              </label>
            }
          >
            {useExisting ? (
              <>
                <div className="mb-1">
                  <Label required>{t('newSale.fieldClient')}</Label>
                </div>
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
                    placeholder={t('newSale.searchClientPlaceholder')}
                    aria-label={t('newSale.searchClientLabel')}
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
                          <div className="px-3 py-3 text-sm text-gray-500">{t('newSale.noResults')}</div>
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
                                    {c.name} {c.surnames}
                                  </div>
                                  <div className="truncate text-xs text-gray-500">
                                    {c.dni ? `${c.dni} · ` : ''}
                                    {c.email || t('newSale.noResults')}
                                  </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                  ID {c.id}
                                </span>
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
                          {selectedClient.name} {selectedClient.surnames}
                        </div>
                        <div className="mt-1 truncate text-sm text-gray-600">
                          {selectedClient.dni ? selectedClient.dni : t('newSale.sinDNI')}
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
                        {t('newSale.removeItem')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <Field
                  label={t('newSale.fieldName')}
                  required
                  value={clienteNombre}
                  onChange={(e) => {
                    setClienteNombre(e.target.value);
                    clearError('clienteNombre');
                  }}
                  placeholder={t('newSale.placeholderName')}
                  error={Boolean(errors.clienteNombre)}
                />

                <Field
                  label={t('newSale.fieldSurnames')}
                  required
                  value={clienteApellidos}
                  onChange={(e) => {
                    setClienteApellidos(e.target.value);
                    clearError('clienteApellidos');
                  }}
                  placeholder={t('newSale.placeholderSurnames')}
                  error={Boolean(errors.clienteApellidos)}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={t('newSale.fieldDNI')}
                    required
                    value={clienteDni}
                    onChange={(e) => {
                      setClienteDni(e.target.value);
                      clearError('clienteDni');
                    }}
                    placeholder={t('newSale.placeholderDNI')}
                    error={Boolean(errors.clienteDni)}
                  />

                  <Field
                    label={t('newSale.fieldEmail')}
                    value={clienteEmail}
                    onChange={(e) => {
                      setClienteEmail(e.target.value);
                      clearError('clienteEmail');
                    }}
                    placeholder={t('newSale.placeholderEmail')}
                    error={Boolean(errors.clienteEmail)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={t('newSale.fieldPhone1')}
                    required
                    value={telefono1}
                    onChange={(e) => {
                      setTelefono1(e.target.value);
                      clearError('telefono1');
                    }}
                    placeholder={t('newSale.placeholderPhone')}
                    error={Boolean(errors.telefono1)}
                  />

                  <Field
                    label={t('newSale.fieldPhone2')}
                    value={telefono2}
                    onChange={(e) => setTelefono2(e.target.value)}
                    placeholder={t('newSale.placeholderPhone2')}
                  />
                </div>

                <Field
                  label={t('newSale.fieldStreet')}
                  required
                  value={calle}
                  onChange={(e) => {
                    setCalle(e.target.value);
                    clearError('calle');
                  }}
                  placeholder={t('newSale.placeholderStreet')}
                  error={Boolean(errors.calle)}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={t('newSale.fieldNumber')}
                    required
                    value={numeroVivienda}
                    onChange={(e) => {
                      setNumeroVivienda(e.target.value);
                      clearError('numeroVivienda');
                    }}
                    placeholder={t('newSale.placeholderNumber')}
                    error={Boolean(errors.numeroVivienda)}
                  />

                  <Field
                    label={t('newSale.fieldFloor')}
                    value={pisoPortal}
                    onChange={(e) => setPisoPortal(e.target.value)}
                    placeholder={t('newSale.placeholderFloor')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={t('newSale.fieldCity')}
                    required
                    value={ciudad}
                    onChange={(e) => {
                      setCiudad(e.target.value);
                      clearError('ciudad');
                    }}
                    placeholder={t('newSale.placeholderCity')}
                    error={Boolean(errors.ciudad)}
                  />

                  <Field
                    label={t('newSale.fieldPostCode')}
                    required
                    value={codigoPostal}
                    onChange={(e) => {
                      setCodigoPostal(e.target.value);
                      clearError('codigoPostal');
                    }}
                    placeholder={t('newSale.placeholderPostCode')}
                    error={Boolean(errors.codigoPostal)}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3">
              <Field label={t('newSale.fieldDate')} required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <TextArea
                label={t('newSale.fieldDescription')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t('newSale.placeholderNotes')}
              />
            </div>
          </Section>
        </div>

        {/* ===== PRODUCTOS ===== */}
        <div className={productosColSpan}>
          <Section title={t('newSale.productsSection')} subtitle={t('newSale.productsSubtitle')} error={Boolean(errors.items)}>
            <div className="relative">
              <Field
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('newSale.searchProductPlaceholder')}
                aria-label={t('newSale.searchProductLabel')}
                error={Boolean(errors.items) && items.length === 0}
              />

              {query ? (
                <div
                  ref={listRef}
                  className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
                >
                  <div className="max-h-80 overflow-auto p-1">
                    {sugerencias.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-500">{t('newSale.noResults')}</div>
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
                              <Highlight text={p.name} query={query} />
                            </div>
                            <div className="shrink-0 text-sm font-semibold text-gray-700">{formatEUR(p.price)}</div>
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
                      <th className="px-4 py-3">{t('newSale.colProduct')}</th>
                      <th className="px-4 py-3 w-32">{t('newSale.colQty')}</th>
                      <th className="px-4 py-3 w-40">{t('newSale.colPrice')}</th>
                      <th className="px-4 py-3 w-40">{t('newSale.colSubtotal')}</th>
                      <th className="px-4 py-3 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map((it) => {
                      const precio = it.unit_price ?? it.producto.price;
                      const subtotal = it.quantity * precio;
                      return (
                        <tr key={it.producto.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-gray-900">{it.producto.name}</div>
                            <div className="text-xs text-gray-500">ID {it.producto.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => updateQuantity(it.producto.id, e.target.value)}
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
                              title={t('newSale.removeTitle')}
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
                          <div className="text-sm font-semibold text-gray-700">{t('newSale.noProducts')}</div>
                          <div className="mt-1 text-sm text-gray-500">{t('newSale.noProductsHint')}</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600">
                    {t('newSale.linesSummary', { lines: items.length, items: totalItems })}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">{t('newSale.totalLabel')}</span>{' '}
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
                      {t('newSale.depositLabel', { amount: formatEUR(fianzaPorDefecto) })}
                    </label>

                    {registrarFianza ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-600">{t('newSale.depositAmount')}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={fianzaCantidad}
                          onChange={(e) => setFianzaCantidad(e.target.value)}
                          placeholder={String(fianzaPorDefecto.toFixed(2))}
                          className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                        />
                        <span className="text-xs text-gray-500">{t('newSale.depositEmpty', { amount: formatEUR(fianzaPorDefecto) })}</span>
                        <span className="ml-2 text-xs text-gray-500">{t('newSale.depositApplied', { amount: formatEUR(fianzaFinal) })}</span>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    className="rounded-2xl px-6 py-3 text-sm font-semibold shadow-sm btn-accent transition"
                  >
                    {t('newSale.submitBtn')}
                  </button>
                </div>
              </div>
            </div>
          </Section>
        </div>


      </form>
    </div>
  );
}
