import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';

import { API_URL } from '../config.js';
const LS_KEY = 'tfg_transportes_camiones_extra';
const LS_KEY_HIDDEN = 'tfg_transportes_camiones_hidden';
const LS_KEY_ACCEPTED = 'tfg_transportes_camiones_accepted';

function eur(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}
function fmtDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-ES');
}
function sumTotal(albaranes) {
  return Math.round((albaranes || []).reduce((acc, a) => acc + Number(a.total || 0), 0) * 100) / 100;
}
function clienteLabel(clientesMap, clienteId) {
  const c = clientesMap.get(clienteId);
  if (!c) return `Cliente #${clienteId}`;
  return `${c.name} ${c.surnames}`.trim();
}

function AlbaranCard({ a, clientesMap, draggable, onDragStart, onDragEnd, children }) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={draggable ? t('transport.dragHandle') : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">#{a.id}</div>
          <div className="text-sm text-gray-600 truncate">{clienteLabel(clientesMap, a.customer_id)}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-600">{fmtDate(a.date)}</div>
          <div className="font-semibold">{eur(a.total)}</div>
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function DropZoneHeader({ title, subtitle, right, isOver }) {
  return (
    <div className={`p-4 border-b ${isOver ? "bg-black/5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-sm text-gray-600">{subtitle}</div> : null}
        </div>
        {right}
      </div>
    </div>
  );
}

function ModalCenter({ isOpen, onClose, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function TransportePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [almacen, setAlmacen] = useState([]);
  const [rutas, setRutas] = useState({ camiones: [], sin_camion: [] });
  const [clientes, setClientes] = useState([]);

  const [search, setSearch] = useState('');

  const [camionesExtra, setCamionesExtra] = useState([]);
  const [nuevoCamion, setNuevoCamion] = useState('');
  const [camionesOcultos, setCamionesOcultos] = useState([]);

  const [camionesAceptados, setCamionesAceptados] = useState({});

  const [camionesModalOpen, setCamionesModalOpen] = useState(false);

  const [dragging, setDragging] = useState(null);
  const [overZone, setOverZone] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const cleaned = arr.map(Number).filter(n => Number.isInteger(n) && n > 0);
        setCamionesExtra(Array.from(new Set(cleaned)).sort((a, b) => a - b));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_HIDDEN);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const cleaned = arr.map(Number).filter(n => Number.isInteger(n) && n > 0);
        setCamionesOcultos(Array.from(new Set(cleaned)).sort((a, b) => a - b));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_ACCEPTED);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') setCamionesAceptados(obj);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(camionesExtra)); } catch { /* ignore */ }
  }, [camionesExtra]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY_HIDDEN, JSON.stringify(camionesOcultos)); } catch { /* ignore */ }
  }, [camionesOcultos]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY_ACCEPTED, JSON.stringify(camionesAceptados)); } catch { /* ignore */ }
  }, [camionesAceptados]);

  // When rutas changes (after any fetchAll), drop trucks and accepted flags
  // for trucks that no longer have RUTA albarans on the server.
  useEffect(() => {
    const serverSet = new Set((rutas.camiones || []).map(c => Number(c.camion_id)));
    setCamionesExtra(prev => {
      if (!prev || prev.length === 0) return prev;
      const next = prev.filter(cid => serverSet.has(cid));
      return next.length === prev.length ? prev : next;
    });
    setCamionesAceptados(prev => {
      if (!prev) return prev;
      const keys = Object.keys(prev);
      if (keys.every(k => serverSet.has(Number(k)))) return prev;
      const copy = { ...prev };
      keys.forEach(k => { if (!serverSet.has(Number(k))) delete copy[k]; });
      return copy;
    });
  }, [rutas]);

  const clientesMap = useMemo(() => {
    const m = new Map();
    (clientes || []).forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);


  // Filtrado general: almacén, en ruta y camiones
  const filterAlbaranes = useCallback((albaranes) => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return albaranes;
    return (albaranes || []).filter(a => {
      const idStr = String(a.id);
      const cli = clienteLabel(clientesMap, a.customer_id).toLowerCase();
      const totalStr = a.total !== undefined ? String(a.total) : '';
      const fechaStr = a.date ? String(a.date) : '';
      // Buscar en id, cliente, total y fecha
      return (
        idStr.includes(q) ||
        cli.includes(q) ||
        totalStr.includes(q) ||
        fechaStr.includes(q)
      );
    });
  }, [search, clientesMap]);

  // Filtrar almacén
  const almacenFiltrado = useMemo(() => filterAlbaranes(almacen), [almacen, filterAlbaranes]);
  // Filtrar en ruta (sin camión)
  const pendienteFiltrado = useMemo(() => filterAlbaranes(rutas.sin_camion || []), [rutas, filterAlbaranes]);
  // Filtrar camiones: para cada camión, filtrar sus albaranes
  const camionesMapFiltrado = useMemo(() => {
    const m = new Map();
    (rutas.camiones || []).forEach(c => m.set(Number(c.camion_id), filterAlbaranes(c.albaranes || [])));
    // También filtrar los camiones extra aunque estén vacíos
    camionesExtra.forEach(cid => {
      if (!m.has(cid)) m.set(cid, []);
    });
    return m;
  }, [rutas, filterAlbaranes, camionesExtra]);

  async function fetchAll() {
    try {
      setLoading(true);
      setErr(null);

      const [rAlm, rRut, rCli] = await Promise.all([
        fetch(`${API_URL}transporte/almacen`),
        fetch(`${API_URL}transporte/rutas`),
        fetch(`${API_URL}clientes/get`),
      ]);

      if (!rAlm.ok) throw new Error(`Almacén HTTP ${rAlm.status}`);
      if (!rRut.ok) throw new Error(`Rutas HTTP ${rRut.status}`);
      if (!rCli.ok) throw new Error(`Clientes HTTP ${rCli.status}`);

      const [alm, rut, cli] = await Promise.all([
        rAlm.json(),
        rRut.json(),
        rCli.json(),
      ]);

      setAlmacen(alm);
      setRutas(rut);
      setClientes(cli);

      // Persist newly-seen truck IDs so empty trucks remain visible until removed below
      try {
        const idsServer = (rut?.camiones || []).map(x => Number(x.camion_id)).filter(Boolean);
        if (idsServer.length) {
          setCamionesExtra(prev => {
            const merged = new Set([...(prev || []), ...idsServer]);
            return Array.from(merged)
              .map(Number)
              .filter(n => Number.isInteger(n) && n > 0)
              .sort((a, b) => a - b);
          });
        }
      } catch { /* ignore */ }
    } catch (e) {
      setErr(e.message);

      sileo.error({
        title: 'Error cargando Transporte',
        description: e?.message || 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  async function asignarA(camion_id, albaran_id) {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}transporte/ruta/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camion_id, albaran_ids: [albaran_id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({
          title: 'No se pudo asignar',
          description: j.detail || res.statusText,
        });
        return;
      }
      setCamionesOcultos(prev => prev.filter(x => x !== Number(camion_id)));
      // Aseguramos que el camión quede persistido.
      setCamionesExtra(prev => Array.from(new Set([...(prev || []), Number(camion_id)])).sort((a, b) => a - b));
      await fetchAll();

      sileo.success({
        title: `Asignado al camión ${camion_id}`,
        description: `Albarán #${albaran_id} añadido a la ruta.`,
      });
    } catch (e) {
      sileo.error({
        title: 'Error de red',
        description: e?.message || 'No se pudo conectar con el servidor.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function volverAlmacen(albaran_id) {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}transporte/ruta/quitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albaran_ids: [albaran_id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({
          title: 'No se pudo volver a Almacén',
          description: j.detail || res.statusText,
        });
        return;
      }
      await fetchAll();

      sileo.success({
        title: 'Devuelto a Almacén',
        description: `Albarán #${albaran_id} vuelto a ALMACÉN.`,
      });
    } catch (e) {
      sileo.error({
        title: 'Error de red',
        description: e?.message || 'No se pudo conectar con el servidor.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function ponerPendiente(albaran_id) {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}transporte/ruta/pendiente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albaran_ids: [albaran_id] }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({
          title: 'No se pudo poner en ruta',
          description: j.detail || res.statusText,
        });
        return;
      }
      await fetchAll();

      sileo.success({
        title: 'En ruta',
        description: `Albarán #${albaran_id} movido a “En ruta (pendiente camión)”.`,
      });
    } catch (e) {
      sileo.error({
        title: 'Error de red',
        description: e?.message || 'No se pudo conectar con el servidor.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function marcarEntregado(id) {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}albaranes/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENTREGADO' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        sileo.error({
          title: 'No se pudo marcar como entregado',
          description: j.detail || res.statusText,
        });
        return;
      }
      await fetchAll();

      sileo.success({
        title: 'Entregado',
        description: `Albarán #${id} marcado como ENTREGADO.`,
      });
    } catch (e) {
      sileo.error({
        title: 'Error de red',
        description: e?.message || 'No se pudo conectar con el servidor.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function liquidarCamion(camion_id) {
    const res = await fetch(`${API_URL}transporte/ruta/${camion_id}/liquidar`, { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.detail || res.statusText);
    return j;
  }

  async function descargarFactura(camion_id) {
    const res = await fetch(`${API_URL}transporte/ruta/${camion_id}/factura`);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      try {
        const j = JSON.parse(txt);
        sileo.error({
          title: 'No se pudo descargar la factura',
          description: j.detail || res.statusText,
        });
      } catch {
        sileo.error({
          title: 'No se pudo descargar la factura',
          description: txt || res.statusText,
        });
      }
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${new Date().toISOString().slice(0, 10)}_ruta_camion_${camion_id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function aceptarRuta(camion_id) {
    try {
      setProcessing(true);
      const liq = await liquidarCamion(camion_id);
      await descargarFactura(camion_id);

      setCamionesAceptados(prev => ({
        ...(prev || {}),
        [String(camion_id)]: new Date().toISOString(),
      }));

      sileo.success({
        title: `Ruta aceptada (Camión ${camion_id})`,
        description: `Gasto registrado: ${eur(liq.importe)} (7%) · Factura descargada.`,
      });
    } catch (e) {
      sileo.error({
        title: 'No se pudo aceptar la ruta',
        description: e?.message || 'Error desconocido',
      });
    } finally {
      setProcessing(false);
    }
  }

  // --- Drag & Drop helpers ---
  function onDragStartCard(payload) {
    return (e) => {
      setDragging(payload);
      try { e.dataTransfer.setData('text/plain', JSON.stringify(payload)); } catch {}
      e.dataTransfer.effectAllowed = 'move';
    };
  }
  function onDragEndCard() {
    setDragging(null);
    setOverZone(null);
  }

  function allowDrop(zoneKey) {
    return (e) => {
      e.preventDefault();
      setOverZone(zoneKey);
      e.dataTransfer.dropEffect = 'move';
    };
  }

  function onDropToCamion(camion_id) {
    return async (e) => {
      e.preventDefault();
      setOverZone(null);
      const payload = dragging;
      setDragging(null);
      if (!payload) return;

      // ✅ Flujo lógico: Almacén -> En ruta -> Camión
      // (y también permitimos atajo Almacén -> Camión)
      if (payload.from === 'sin_camion' || payload.from === 'almacen') {
        await asignarA(camion_id, payload.id);
      }
    };
  }

  // ✅ FIX: ahora es async
  async function onDropToAlmacen(e) {
    e.preventDefault();
    setOverZone(null);
    const payload = dragging;
    setDragging(null);
    if (!payload) return;
    if (payload.from === 'sin_camion' || (payload.from && payload.from.startsWith('camion:'))) {
      await volverAlmacen(payload.id);
    }
  }

  // ✅ FIX: ahora es async
  async function onDropToPendiente(e) {
    e.preventDefault();
    setOverZone(null);
    const payload = dragging;
    setDragging(null);
    if (!payload) return;
    // Desde almacén → En ruta, o desde camión → En ruta
    if (payload.from === 'almacen' || (payload.from && payload.from.startsWith('camion:'))) {
      await ponerPendiente(payload.id);
    }
  }

  function addCamionExtra() {
    const n = Number(nuevoCamion);
    if (!Number.isInteger(n) || n <= 0) {
      sileo.warning({
        title: 'Número inválido',
        description: 'El camión debe ser un número entero mayor que 0.',
      });
      return;
    }

    setCamionesExtra(prev => {
      const next = Array.from(new Set([...(prev || []), n])).sort((a, b) => a - b);
      return next;
    });

    setCamionesOcultos(prev => prev.filter(x => x !== n));
    setNuevoCamion('');

    sileo.success({
      title: 'Camión añadido',
      description: `Camión ${n} creado.`,
    });
  }
  function quitarCamion(cid) {
    setCamionesExtra(prev => prev.filter(x => x !== cid));
    setCamionesOcultos(prev => Array.from(new Set([...(prev || []), cid])).sort((a, b) => a - b));
    setCamionesAceptados(prev => {
      const copy = { ...(prev || {}) };
      delete copy[String(cid)];
      return copy;
    });

    sileo.success({
      title: 'Camión eliminado',
      description: `Camión ${cid} eliminado.`,
    });
  }

  const camionesMap = useMemo(() => {
    const m = new Map();
    (rutas.camiones || []).forEach(c => m.set(Number(c.camion_id), c.albaranes || []));
    return m;
  }, [rutas]);

  const camionesIdsServer = useMemo(() => {
    const ids = (rutas.camiones || []).map(c => Number(c.camion_id)).filter(Boolean);
    return Array.from(new Set(ids)).sort((a, b) => a - b);
  }, [rutas]);

  const allCamiones = useMemo(() => {
    const all = Array.from(new Set([...camionesIdsServer, ...camionesExtra])).sort((a, b) => a - b);
    return all.filter(cid => !camionesOcultos.includes(cid));
  }, [camionesIdsServer, camionesExtra, camionesOcultos]);

  function camionStyle(cid, albs) {
    const isEmpty = (albs || []).length === 0;
    const accepted = Boolean(camionesAceptados?.[String(cid)]);

    // vacío: otro color (y no desaparece)
    if (isEmpty) {
      return {
        box: 'bg-white',
        header: 'bg-gray-100',
        border: 'border-gray-200',
        badge: 'Vacío',
        badgeClass: 'bg-gray-100 border-gray-200 text-gray-700',
      };
    }
    if (accepted) {
      return {
        box: 'bg-green-50',
        header: 'bg-green-100',
        border: 'border-green-200',
        badge: 'Aceptada',
        badgeClass: 'bg-green-100 border-green-200 text-green-800',
      };
    }
    return {
      box: 'bg-gray-50',
      header: 'bg-gray-50',
      border: 'border-gray-200',
      badge: null,
      badgeClass: '',
    };
  }

  if (loading) {
    return <div className="p-3 md:p-6 text-gray-600">{t('transport.loading')}</div>;
  }
  if (err) {
    return <div className="p-3 md:p-6 text-red-600">{err}</div>;
  }

  return (
    <>
      <div className="p-3 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t('transport.title')}</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                <span>{t('transport.search')}</span>
                <button
                  onClick={() => setCamionesModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 ml-2"
                  disabled={processing}
                  type="button"
                >
                  {t('transport.trucks')}
                </button>
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('transport.searchPlaceholder')}
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="text-xs text-gray-500 mt-2">
                {t('transport.flowHint')} <span className="font-medium">{t('transport.flowRoute')}</span>.
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
        {/* ALMACÉN */}
        <div
          className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden bg-gray-50 transition-all duration-200 flex flex-col ${
            overZone === 'almacen' ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
          }`}
          onDragOver={allowDrop('almacen')}
          onDragEnter={allowDrop('almacen')}
          onDrop={onDropToAlmacen}
        >
          <DropZoneHeader
            title={t('transport.warehouse')}
            subtitle={t('transport.ordersCount', { n: almacenFiltrado.length })}
            isOver={overZone === 'almacen'}
          />
          <div className="p-4 space-y-3">
            {almacenFiltrado.map(a => (
              <AlbaranCard
                key={a.id}
                a={a}
                clientesMap={clientesMap}
                draggable={!processing}
                onDragStart={onDragStartCard({ id: a.id, from: 'almacen' })}
                onDragEnd={onDragEndCard}
              >
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 rounded-lg border btn-accent disabled:opacity-50 text-sm"
                    onClick={() => ponerPendiente(a.id)}
                    disabled={processing}
                    title={t('transport.moveToRoute')}
                  >
                    {t('transport.toRouteBtn')}
                  </button>
                </div>
              </AlbaranCard>
            ))}
            {almacenFiltrado.length === 0 && <div className="text-sm text-gray-600">{t('transport.noPedidos')}</div>}
          </div>
        </div>

        {/* PENDIENTE (sin camión) */}
        <div
          className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden bg-gray-50 transition-all duration-200 flex flex-col ${
            overZone === 'pendiente' ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
          }`}
          onDragOver={allowDrop('pendiente')}
          onDragEnter={allowDrop('pendiente')}
          onDrop={onDropToPendiente}
        >
          <DropZoneHeader
            title={t('transport.inRoutePending')}
            subtitle={t('transport.ordersCount', { n: pendienteFiltrado.length })}
            isOver={overZone === 'pendiente'}
          />
          <div className="p-4 space-y-3">
            {pendienteFiltrado.map(a => (
              <AlbaranCard
                key={a.id}
                a={a}
                clientesMap={clientesMap}
                draggable={!processing}
                onDragStart={onDragStartCard({ id: a.id, from: 'sin_camion' })}
                onDragEnd={onDragEndCard}
              >
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 rounded-lg border hover:bg-white/60 disabled:opacity-50 text-sm"
                    onClick={() => volverAlmacen(a.id)}
                    disabled={processing}
                  >
                    {t('transport.warehouse')}
                  </button>
                </div>
              </AlbaranCard>
            ))}
            {pendienteFiltrado.length === 0 && <div className="text-sm text-gray-600">{t('transport.nothingToAssign')}</div>}
          </div>
        </div>

        {/* CAMIONES */}
        {allCamiones.map((cid) => {
          const zoneKey = `camion:${cid}`;
          const albs = camionesMapFiltrado.get(cid) || [];
          const puedeQuitar = albs.length === 0;
          const st = camionStyle(cid, albs);

          return (
            <div
              key={cid}
              className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col ${st.box} ${
                overZone === zoneKey ? 'border-black ring-2 ring-black/20' : st.border
              }`}
              onDragOver={allowDrop(zoneKey)}
              onDragEnter={allowDrop(zoneKey)}
              onDrop={onDropToCamion(cid)}
            >
              <div className={`px-4 py-3 border-b ${st.header} ${overZone === zoneKey ? "bg-black/5" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{t('transport.truckLabel', { id: cid })}</div>
                      {st.badge ? (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.badgeClass}`}>{st.badge}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-600">
                      {albs.length} · {eur(sumTotal(albs))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        albs.length > 0 ? 'btn-accent' : 'opacity-40 cursor-not-allowed'
                      }`}
                      onClick={() => aceptarRuta(cid)}
                      disabled={processing || albs.length === 0}
                      title={albs.length > 0 ? t('transport.invoiceTitle') : t('transport.noAlbaranes')}
                    >
                      {t('transport.acceptRoute')}
                    </button>

                    <button
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        puedeQuitar ? 'hover:bg-white/60' : 'opacity-40 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (!puedeQuitar) {
                          sileo.warning({
                            title: t('transport.cannotDelete'),
                            description: t('transport.emptyTruckHint'),
                          });
                          return;
                        }
                        quitarCamion(cid);
                      }}
                      disabled={processing || !puedeQuitar}
                      title={puedeQuitar ? t('transport.deleteTruckTitle') : t('transport.emptyTruckFirst')}
                    >
                      {t('transport.removeBtn')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {albs.map(a => (
                  <AlbaranCard
                    key={a.id}
                    a={a}
                    clientesMap={clientesMap}
                    draggable={!processing}
                    onDragStart={onDragStartCard({ id: a.id, from: `camion:${cid}` })}
                    onDragEnd={onDragEndCard}
                  >
                    <div className="flex gap-2">
                      <button
                        className="flex-1 px-3 py-2 rounded-lg border btn-accent disabled:opacity-50 text-sm"
                        onClick={() => marcarEntregado(a.id)}
                        disabled={processing}
                      >
                        {t('transport.delivered')}
                      </button>
                      <button
                        className="flex-1 px-3 py-2 rounded-lg border hover:bg-white/60 disabled:opacity-50 text-sm"
                        onClick={() => volverAlmacen(a.id)}
                        disabled={processing}
                      >
                        {t('transport.warehouse')}
                      </button>
                    </div>
                  </AlbaranCard>
                ))}
                {albs.length === 0 && <div className="text-sm text-gray-600">{t('transport.dropHere')}</div>}
              </div>
            </div>
          );
        })}
        </div>

        {/* Modal camiones */}
        <ModalCenter isOpen={camionesModalOpen} onClose={() => setCamionesModalOpen(false)} maxWidth="max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('transport.trucks')}</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <div className="text-sm font-medium mb-2">{t('transport.addTruck')}</div>
              <div className="flex items-end gap-2">
                <input
                  value={nuevoCamion}
                  onChange={e => setNuevoCamion(e.target.value)}
                  type="number"
                  min={1}
                  className="border rounded-lg px-3 py-2 w-40"
                  placeholder={t('transport.truckPlaceholder')}
                />
                <button
                  onClick={addCamionExtra}
                  className="px-3 py-2 rounded-xl btn-accent disabled:opacity-50"
                  disabled={processing}
                  type="button"
                >
                  {t('transport.addBtn')}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {t('transport.truckNote')}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">{t('transport.list')}</div>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                {(allCamiones || []).length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">{t('transport.noTrucks')}</div>
                ) : (
                  <ul>
                    {allCamiones.map((cid) => {
                      const albs = camionesMap.get(cid) || [];
                      const puedeQuitar = albs.length === 0;
                      const accepted = Boolean(camionesAceptados?.[String(cid)]);
                      return (
                        <li key={cid} className="flex items-center justify-between gap-3 px-4 py-3 border-t first:border-t-0">
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {t('transport.truckLabel', { id: cid })}
                              {accepted ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-50 border-green-200 text-green-800">
                                  {t('transport.accepted')}
                                </span>
                              ) : null}
                              {albs.length === 0 ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-200 text-gray-700">
                                  {t('transport.emptyBadge')}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {t('transport.ordersCount', { n: albs.length })} · {eur(sumTotal(albs))}
                            </div>
                          </div>

                          <button
                            className={`text-xs px-3 py-2 rounded-xl border ${
                              puedeQuitar ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'
                            }`}
                            onClick={() => {
                              if (!puedeQuitar) {
                                sileo.warning({
                                  title: t('transport.cannotDelete'),
                                  description: t('transport.emptyTruckHint'),
                                });
                                return;
                              }
                              quitarCamion(cid);
                            }}
                            disabled={processing || !puedeQuitar}
                            type="button"
                          >
                            {t('transport.deleteBtn')}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </ModalCenter>
      </div>
    </>
  );
}
