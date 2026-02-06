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
        alert(j.detail || res.statusText); // <-- aquí te salía "Not Found" si el endpoint no existía
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

  // ✅ Descargar factura PDF del camión
  async function descargarFactura(camion_id) {
    try {
      setProcessing(true);
      const res = await fetch(`${API_URL}transporte/ruta/${camion_id}/factura`);
      if (!res.ok) {
        // puede venir JSON con detail
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
    } catch (e) {
      alert(`Error descargando PDF: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  }

  // --- Drag & Drop helpers ---
  function onDragStartCard(payload) {
    return (e) => {
      setDragging(payload);
      setOverZone(null);
      e.dataTransfer.setData('application/json', JSON.stringify(payload));
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
      if (overZone !== zoneKey) setOverZone(zoneKey);
      e.dataTransfer.dropEffect = 'move';
    };
  }
  function readPayload(e) {
    let payload = dragging;
    if (!payload) {
      try { payload = JSON.parse(e.dataTransfer.getData('application/json')); } catch { /* ignore */ }
    }
    return payload;
  }
  function onDropToCamion(camion_id) {
    return async (e) => {
      e.preventDefault();
      const payload = readPayload(e);
      setOverZone(null);
      if (!payload?.id) return;
      if (processing) return;
      await asignarA(Number(camion_id), Number(payload.id));
    };
  }
  function onDropToAlmacen() {
    return async (e) => {
      e.preventDefault();
      const payload = readPayload(e);
      setOverZone(null);
      if (!payload?.id) return;
      if (payload.from === 'almacen') return;
      if (processing) return;
      await volverAlmacen(Number(payload.id));
    };
  }
  function onDropToPendiente() {
    return async (e) => {
      e.preventDefault();
      const payload = readPayload(e);
      setOverZone(null);
      if (!payload?.id) return;
      if (payload.from === 'sin_camion') return;
      if (processing) return;
      await ponerPendiente(Number(payload.id));
    };
  }

  // Camiones: backend + extra
  const camionesFromBackend = useMemo(() => {
    return (rutas.camiones || []).map(c => Number(c.camion_id)).filter(n => Number.isInteger(n) && n > 0);
  }, [rutas]);

  const camionesMap = useMemo(() => {
    const m = new Map();
    (rutas.camiones || []).forEach(c => m.set(Number(c.camion_id), c.albaranes || []));
    return m;
  }, [rutas]);

  const allCamiones = useMemo(() => {
    const set = new Set([...camionesFromBackend, ...camionesExtra]);
    return Array.from(set).filter(cid => !camionesOcultos.includes(cid)).sort((a, b) => a - b);
  }, [camionesFromBackend, camionesExtra, camionesOcultos]);

  function addCamion() {
    const cid = Number(nuevoCamion);
    if (!Number.isInteger(cid) || cid <= 0) {
      alert('El ID del camión debe ser un entero > 0');
      return;
    }
    setCamionesExtra(prev => Array.from(new Set([...prev, cid])).sort((a, b) => a - b));
    setCamionesOcultos(prev => prev.filter(x => x !== cid));
    setNuevoCamion('');
  }

  function quitarCamion(cid) {
    const albs = camionesMap.get(cid) || [];
    if (albs.length > 0) {
      alert(`No puedes quitar el camión ${cid} porque tiene albaranes asignados.`);
      return;
    }
    if (camionesExtra.includes(cid)) {
      setCamionesExtra(prev => prev.filter(x => x !== cid));
      return;
    }
    setCamionesOcultos(prev => Array.from(new Set([...prev, cid])).sort((a, b) => a - b));
  }

  const nEnRuta = useMemo(() => {
    const cam = rutas.camiones || [];
    const sin = rutas.sin_camion || [];
    return cam.reduce((acc, c) => acc + (c.albaranes?.length || 0), 0) + (sin.length || 0);
  }, [rutas]);

  const totalEnRuta = useMemo(() => {
    const cam = rutas.camiones || [];
    const sin = rutas.sin_camion || [];
    return cam.reduce((acc, c) => acc + sumTotal(c.albaranes), 0) + sumTotal(sin);
  }, [rutas]);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Transporte</h1>
          <div className="text-sm text-gray-600">
            Arrastra albaranes del almacén a un camión. Puedes soltarlos en “Pendiente” para dejarlos sin camión.
          </div>
          {!loading && (
            <div className="text-xs text-gray-500 mt-1">
              En ruta: {nEnRuta} · {eur(totalEnRuta)}
            </div>
          )}
        </div>

        <button
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 self-start"
          onClick={fetchAll}
          disabled={loading || processing}
        >
          Recargar
        </button>
      </div>

      {loading && <div className="text-gray-500">Cargando…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 mt-4">
        {/* ALMACÉN */}
        <div
          className={`bg-white border rounded-2xl overflow-hidden h-fit ${
            overZone === 'almacen' ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
          }`}
          onDragOver={allowDrop('almacen')}
          onDragEnter={allowDrop('almacen')}
          onDrop={onDropToAlmacen()}
        >
          <DropZoneHeader
            title="Almacén"
            subtitle="Arrastra desde rutas aquí para devolver a almacén"
            isOver={overZone === 'almacen'}
            right={<span className="text-sm text-gray-600">{almacen.length} albaranes</span>}
          />

          <div className="p-4 border-b">
            <input
              className="w-full px-3 py-2 rounded-lg border"
              placeholder="Buscar por ID o cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="p-4">
            {(!loading && almacenFiltrado.length === 0) ? (
              <div className="text-sm text-gray-500">No hay albaranes en almacén.</div>
            ) : (
              <div className="space-y-3">
                {almacenFiltrado.map(a => (
                  <AlbaranCard
                    key={a.id}
                    a={a}
                    clientesMap={clientesMap}
                    draggable={!processing}
                    onDragStart={onDragStartCard({ id: a.id, from: 'almacen' })}
                    onDragEnd={onDragEndCard}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CAMIONES */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">Camiones (Drag & Drop)</div>
                <div className="text-sm text-gray-600">
                  Suelta un albarán sobre un camión para asignarlo. “Aceptar ruta” descarga la factura del camión (7% comisión).
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Nuevo camión</label>
                  <input
                    type="number"
                    min={1}
                    className="w-28 px-3 py-2 rounded-lg border"
                    value={nuevoCamion}
                    onChange={(e) => setNuevoCamion(e.target.value)}
                    placeholder="3"
                  />
                </div>
                <button
                  className="px-3 py-2 rounded-lg border bg-black text-white hover:opacity-90 disabled:opacity-50"
                  onClick={addCamion}
                  disabled={processing || !nuevoCamion}
                >
                  + Añadir
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {(allCamiones.length === 0 && (rutas.sin_camion?.length || 0) === 0) ? (
              <div className="text-sm text-gray-500">No hay camiones ni albaranes en ruta.</div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {/* PENDIENTE / SIN CAMIÓN */}
                <div
                  className={`min-w-[320px] max-w-[360px] flex-shrink-0 rounded-2xl border overflow-hidden ${
                    overZone === 'sin_camion' ? 'border-black ring-2 ring-black/20' : 'border-gray-200'
                  } bg-yellow-50`}
                  onDragOver={allowDrop('sin_camion')}
                  onDragEnter={allowDrop('sin_camion')}
                  onDrop={onDropToPendiente()}
                >
                  <div className={`px-4 py-3 border-b ${overZone === 'sin_camion' ? "bg-black/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">Pendiente (sin camión)</div>
                        <div className="text-xs text-gray-700">
                          {(rutas.sin_camion?.length || 0)} · {eur(sumTotal(rutas.sin_camion))}
                        </div>
                      </div>
                      <span className="text-xs text-yellow-800 bg-yellow-200/60 px-2 py-1 rounded-full">
                        Pendiente
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">
                      Suelta aquí para dejarlo en ruta sin asignar camión
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    {(rutas.sin_camion || []).length === 0 ? (
                      <div className="text-sm text-gray-600 p-2">Suelta aquí albaranes para dejarlos pendientes.</div>
                    ) : (
                      rutas.sin_camion.map(a => (
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
                      ))
                    )}
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
                              onClick={() => descargarFactura(cid)}
                              disabled={processing || albs.length === 0}
                              title={albs.length > 0 ? "Descargar factura de la ruta" : "No hay albaranes en este camión"}
                            >
                              Aceptar ruta
                            </button>

                            <button
                              className={`text-xs px-2 py-1 rounded-lg border ${
                                puedeQuitar ? 'hover:bg-white/60' : 'opacity-40 cursor-not-allowed'
                              }`}
                              onClick={() => quitarCamion(cid)}
                              title={puedeQuitar ? "Quitar camión (si está vacío)" : "No se puede quitar: tiene albaranes"}
                              disabled={!puedeQuitar || processing}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500 mt-1">
                          {overZone === zoneKey ? "Suelta aquí para asignar" : "Arrastra aquí desde almacén / pendiente"}
                        </div>
                      </div>

                      <div className="p-3 space-y-3">
                        {albs.length === 0 ? (
                          <div className="text-sm text-gray-500 p-2">
                            Vacío. Suelta aquí un albarán para asignarlo a este camión.
                          </div>
                        ) : (
                          albs.map(a => (
                            <AlbaranCard
                              key={a.id}
                              a={a}
                              clientesMap={clientesMap}
                              draggable={!processing}
                              onDragStart={onDragStartCard({ id: a.id, from: 'ruta', camionId: cid })}
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
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {dragging && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          Moviendo albarán #{dragging.id} — suelta en un camión, pendiente o almacén
        </div>
      )}
    </div>
  );
}
