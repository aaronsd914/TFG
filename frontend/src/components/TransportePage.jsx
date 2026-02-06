import React, { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:8000/api/';
const LS_KEY = 'tfg_transportes_camiones_extra';

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
  return (albaranes || []).reduce((acc, a) => acc + Number(a.total || 0), 0);
}
function clienteLabel(clientesMap, clienteId) {
  const c = clientesMap.get(clienteId);
  if (!c) return `Cliente #${clienteId}`;
  return `${c.nombre} ${c.apellidos}`.trim();
}

function AlbaranCard({ a, clientesMap, draggable, onDragStart, onDragEnd, children }) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={draggable ? "Arrastra para mover" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">#{a.id}</div>
          <div className="text-sm text-gray-600 truncate">{clienteLabel(clientesMap, a.cliente_id)}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-600">{fmtDate(a.fecha)}</div>
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

export default function TransportePage() {
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
    try { localStorage.setItem(LS_KEY, JSON.stringify(camionesExtra)); } catch { /* ignore */ }
  }, [camionesExtra]);

  const clientesMap = useMemo(() => {
    const m = new Map();
    (clientes || []).forEach(c => m.set(c.id, c));
    return m;
  }, [clientes]);

  const almacenFiltrado = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return almacen;
    return (almacen || []).filter(a => {
      const idStr = String(a.id);
      const cli = clienteLabel(clientesMap, a.cliente_id).toLowerCase();
      return idStr.includes(q) || cli.includes(q);
    });
  }, [almacen, search, clientesMap]);

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

      setAlmacen(await rAlm.json());
      setRutas(await rRut.json());
      setClientes(await rCli.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

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
        alert(j.detail || res.statusText);
        return;
      }
      setCamionesOcultos(prev => prev.filter(x => x !== Number(camion_id)));
      await fetchAll();
    } catch (e) {
      alert(`Error de red: ${e.message}`);
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
        alert(j.detail || res.statusText);
        return;
      }
      await fetchAll();
    } catch (e) {
      alert(`Error de red: ${e.message}`);
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
        alert(j.detail || res.statusText);
        return;
      }
      await fetchAll();
    } catch (e) {
      alert(`Error de red: ${e.message}`);
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
        body: JSON.stringify({ estado: 'ENTREGADO' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.detail || res.statusText);
        return;
      }
      await fetchAll();
    } catch (e) {
      alert(`Error de red: ${e.message}`);
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
        alert(j.detail || res.statusText);
      } catch {
        alert(txt || res.statusText);
      }
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_ruta_camion_${camion_id}.pdf`;
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
      alert(`Gasto de transporte registrado: ${eur(liq.importe)} (7%)`);
    } catch (e) {
      alert(e.message);
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

      // Solo movemos desde "sin_camion" al camión (los de almacen van con botón/atajo, o si quieres también lo añadimos)
      if (payload.from === 'sin_camion') {
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
    if (payload.from && payload.from.startsWith('camion:')) {
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
    if (payload.from && payload.from.startsWith('camion:')) {
      await ponerPendiente(payload.id);
    }
  }

  function addCamionExtra() {
    const n = Number(nuevoCamion);
    if (!Number.isInteger(n) || n <= 0) return;
    setCamionesExtra(prev => Array.from(new Set([...prev, n])).sort((a, b) => a - b));
    setNuevoCamion('');
  }
  function quitarCamion(cid) {
    setCamionesExtra(prev => prev.filter(x => x !== cid));
    setCamionesOcultos(prev => prev.filter(x => x !== cid));
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

  if (loading) {
    return <div className="p-6 text-gray-600">Cargando…</div>;
  }
  if (err) {
    return <div className="p-6 text-red-600">{err}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transporte</h1>
        <button
          onClick={fetchAll}
          className="px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
          disabled={processing}
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Buscar</div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ID o cliente…"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-end gap-2">
            <div>
              <div className="text-sm text-gray-600 mb-1">Añadir camión</div>
              <input
                value={nuevoCamion}
                onChange={e => setNuevoCamion(e.target.value)}
                type="number"
                min={1}
                className="border rounded-lg px-3 py-2 w-32"
                placeholder="Nº"
              />
            </div>
            <button
              onClick={addCamionExtra}
              className="px-3 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
              disabled={processing}
            >
              Añadir
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {/* ALMACÉN */}
        <div
          className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden bg-gray-50 ${
            overZone === 'almacen' ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
          }`}
          onDragOver={allowDrop('almacen')}
          onDragEnter={allowDrop('almacen')}
          onDrop={onDropToAlmacen}
        >
          <DropZoneHeader
            title="Almacén"
            subtitle={`${almacenFiltrado.length} pedidos`}
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
                    className="flex-1 px-3 py-2 rounded-lg border bg-black text-white hover:opacity-90 disabled:opacity-50 text-sm"
                    onClick={() => asignarA(1, a.id)}
                    disabled={processing}
                    title="Asignar al camión 1 rápido (arrastrar para otros)"
                  >
                    → Ruta
                  </button>
                </div>
              </AlbaranCard>
            ))}
            {almacenFiltrado.length === 0 && <div className="text-sm text-gray-600">Sin pedidos.</div>}
          </div>
        </div>

        {/* PENDIENTE (sin camión) */}
        <div
          className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden bg-gray-50 ${
            overZone === 'pendiente' ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
          }`}
          onDragOver={allowDrop('pendiente')}
          onDragEnter={allowDrop('pendiente')}
          onDrop={onDropToPendiente}
        >
          <DropZoneHeader
            title="En ruta (pendiente camión)"
            subtitle={`${(rutas.sin_camion || []).length} pedidos`}
            isOver={overZone === 'pendiente'}
          />
          <div className="p-4 space-y-3">
            {(rutas.sin_camion || []).map(a => (
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
                    className="flex-1 px-3 py-2 rounded-lg border bg-black text-white hover:opacity-90 disabled:opacity-50 text-sm"
                    onClick={() => marcarEntregado(a.id)}
                    disabled={processing}
                  >
                    ✓ Entregado
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded-lg border hover:bg-white/60 disabled:opacity-50 text-sm"
                    onClick={() => volverAlmacen(a.id)}
                    disabled={processing}
                  >
                    ↩ Almacén
                  </button>
                </div>
              </AlbaranCard>
            ))}
            {(rutas.sin_camion || []).length === 0 && <div className="text-sm text-gray-600">Nada por asignar.</div>}
          </div>
        </div>

        {/* CAMIONES */}
        {allCamiones.map((cid) => {
          const zoneKey = `camion:${cid}`;
          const albs = camionesMap.get(cid) || [];
          const puedeQuitar = albs.length === 0;

          return (
            <div
              key={cid}
              className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden bg-gray-50 ${
                overZone === zoneKey ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
              }`}
              onDragOver={allowDrop(zoneKey)}
              onDragEnter={allowDrop(zoneKey)}
              onDrop={onDropToCamion(cid)}
            >
              <div className={`px-4 py-3 border-b ${overZone === zoneKey ? "bg-black/5" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">Camión {cid}</div>
                    <div className="text-xs text-gray-600">
                      {albs.length} · {eur(sumTotal(albs))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        albs.length > 0 ? 'bg-black text-white hover:opacity-90' : 'opacity-40 cursor-not-allowed'
                      }`}
                      onClick={() => aceptarRuta(cid)}
                      disabled={processing || albs.length === 0}
                      title={albs.length > 0 ? "Registrar gasto (7%) y descargar factura" : "No hay albaranes en este camión"}
                    >
                      Aceptar ruta
                    </button>

                    <button
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        puedeQuitar ? 'hover:bg-white/60' : 'opacity-40 cursor-not-allowed'
                      }`}
                      onClick={() => quitarCamion(cid)}
                      disabled={processing || !puedeQuitar}
                      title={puedeQuitar ? "Eliminar camión (solo si está vacío)" : "Vacía el camión para eliminarlo"}
                    >
                      Quitar
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
                        className="flex-1 px-3 py-2 rounded-lg border bg-black text-white hover:opacity-90 disabled:opacity-50 text-sm"
                        onClick={() => marcarEntregado(a.id)}
                        disabled={processing}
                      >
                        ✓ Entregado
                      </button>
                      <button
                        className="flex-1 px-3 py-2 rounded-lg border hover:bg-white/60 disabled:opacity-50 text-sm"
                        onClick={() => volverAlmacen(a.id)}
                        disabled={processing}
                      >
                        ↩ Almacén
                      </button>
                    </div>
                  </AlbaranCard>
                ))}
                {albs.length === 0 && <div className="text-sm text-gray-600">Arrastra aquí para asignar.</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
