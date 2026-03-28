import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';
import { API_URL } from '../config.js';
import ConfirmDeleteModal from './ConfirmDeleteModal.jsx';
import ModalCenter, { CloseIcon, closeButtonClass } from './ModalCenter.jsx';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('es-ES');
}

export default function IncidenciasPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [incidencias, setIncidencias] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ albaran_id: '', descripcion: '' });
  const [formErrors, setFormErrors] = useState({});
  const [createSaving, setCreateSaving] = useState(false);
  const [albSearch, setAlbSearch] = useState('');
  const [albDropOpen, setAlbDropOpen] = useState(false);
  const albBoxRef = useRef(null);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [detailInc, setDetailInc] = useState(null);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Search ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [rInc, rAlb, rCli] = await Promise.all([
        fetch(`${API_URL}incidencias/get`),
        fetch(`${API_URL}albaranes/get`),
        fetch(`${API_URL}clientes/get`),
      ]);
      if (!rInc.ok) throw new Error(`Incidencias HTTP ${rInc.status}`);
      if (!rAlb.ok) throw new Error(`Albaranes HTTP ${rAlb.status}`);
      if (!rCli.ok) throw new Error(`Clientes HTTP ${rCli.status}`);
      setIncidencias((await rInc.json()) || []);
      setAlbaranes((await rAlb.json()) || []);
      setClientes((await rCli.json()) || []);
    } catch (e) {
      setLoadError(e?.message || t('incidencias.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── Derived maps ──────────────────────────────────────────────────────────
  const clientesById = useMemo(() => {
    const m = new Map();
    clientes.forEach((c) => m.set(c.id, c));
    return m;
  }, [clientes]);

  const albaranesById = useMemo(() => {
    const m = new Map();
    albaranes.forEach((a) => m.set(a.id, a));
    return m;
  }, [albaranes]);

  /** Only ENTREGADO albaranes can generate incidents */
  const entregados = useMemo(
    () => albaranes.filter((a) => a.status === 'ENTREGADO'),
    [albaranes]
  );

  // Suggestions for the albaran search input
  const albSuggestions = useMemo(() => {
    if (!albSearch.trim()) return entregados.slice(0, 10);
    const q = albSearch.toLowerCase();
    return entregados.filter((a) => {
      const cli = clientesById.get(a.customer_id);
      return (
        String(a.id).includes(q) ||
        (cli && `${cli.name} ${cli.surnames}`.toLowerCase().includes(q))
      );
    }).slice(0, 10);
  }, [entregados, albSearch, clientesById]);

  // ── Filtered list (by albarán or client — no description) ─────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return incidencias;
    const q = search.toLowerCase();
    return incidencias.filter((inc) => {
      const alb = albaranesById.get(inc.albaran_id);
      const cli = alb ? clientesById.get(alb.customer_id) : null;
      return (
        String(inc.albaran_id).includes(q) ||
        (cli ? `${cli.name} ${cli.surnames}`.toLowerCase().includes(q) : false)
      );
    });
  }, [incidencias, search, albaranesById, clientesById]);

  // ── Create handlers ───────────────────────────────────────────────────────
  function openCreate() {
    setCreateForm({ albaran_id: '', descripcion: '' });
    setFormErrors({});
    setAlbSearch('');
    setAlbDropOpen(false);
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateForm({ albaran_id: '', descripcion: '' });
    setFormErrors({});
    setAlbSearch('');
  }

  function selectAlbaran(alb) {
    const cli = clientesById.get(alb.customer_id);
    const clienteLabel = cli ? `${cli.name} ${cli.surnames}` : `Cliente #${alb.customer_id}`;
    const label = `#${alb.id} — ${clienteLabel}`;
    setCreateForm((f) => ({ ...f, albaran_id: alb.id }));
    setAlbSearch(label);
    setAlbDropOpen(false);
    setFormErrors((er) => ({ ...er, albaran_id: false }));
  }

  async function submitCreate(e) {
    e.preventDefault();
    const errs = {};
    if (!createForm.albaran_id) errs.albaran_id = true;
    if (!createForm.descripcion.trim()) errs.descripcion = true;
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      sileo.error({ title: t('incidencias.errorRequired') });
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch(`${API_URL}incidencias/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albaran_id: Number(createForm.albaran_id),
          descripcion: createForm.descripcion.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || `HTTP ${res.status}`);
      }
      sileo.success({ title: t('incidencias.createSuccess') });
      closeCreate();
      loadAll();
    } catch (err) {
      const msg = err?.message || t('incidencias.createError');
      sileo.error({ title: t('incidencias.createError'), description: msg });
    } finally {
      setCreateSaving(false);
    }
  }

  // ── Delete handlers ───────────────────────────────────────────────────────
  async function confirmDelete() {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}incidencias/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      sileo.success({ title: t('incidencias.deleteSuccess') });
      setDeleteId(null);
      setDetailInc(null);
      loadAll();
    } catch (err) {
      sileo.error({ title: t('incidencias.deleteError'), description: err?.message });
    } finally {
      setDeleting(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goToAlbaran(albaranId) {
    try { localStorage.setItem('albaran_open_id', String(albaranId)); } catch {}
    navigate('/albaranes');
  }

  function goToCliente(clienteId) {
    try { localStorage.setItem('cliente_open_id', String(clienteId)); } catch {}
    navigate('/clientes');
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('incidencias.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('incidencias.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 rounded-xl btn-accent text-sm font-medium transition self-start"
          data-testid="create-incidencia-btn"
        >
          + {t('incidencias.createBtn')}
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={t('incidencias.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 border border-gray-300 rounded-xl px-3 py-2 text-sm"
          data-testid="incidencias-search"
        />
      </div>

      {/* Error */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
          {loadError}
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full border-collapse text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300 w-28">{t('incidencias.colDate')}</th>
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300 w-24">{t('incidencias.colAlbaran')}</th>
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300">{t('incidencias.colClient')}</th>
                <th className="p-3 font-medium text-gray-600 dark:text-gray-300">{t('incidencias.colDesc')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="p-4 text-sm text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-sm text-gray-500" data-testid="incidencias-empty">
                    {t('incidencias.noResults')}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((inc) => {
                  const alb = albaranesById.get(inc.albaran_id);
                  const cli = alb ? clientesById.get(alb.customer_id) : null;
                  return (
                    <tr
                      key={inc.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                      onClick={() => setDetailInc(inc)}
                      data-testid="incidencia-row"
                    >
                      <td className="p-3">{fmtDate(inc.fecha_creacion)}</td>
                      <td className="p-3">#{inc.albaran_id}</td>
                      <td className="p-3">{cli ? `${cli.name} ${cli.surnames}` : '—'}</td>
                      <td className="p-3 max-w-xs truncate" title={inc.descripcion}>{inc.descripcion}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create modal ── */}
      <ModalCenter isOpen={createOpen} onClose={closeCreate} maxWidth="max-w-lg">
        <div data-testid="create-incidencia-modal">
          <h2 className="text-base font-semibold mb-1 dark:text-gray-100">{t('incidencias.createTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('incidencias.createDesc')}</p>
          <form onSubmit={submitCreate} className="flex flex-col gap-4">
            {/* Albaran search */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium dark:text-gray-200">
                {t('incidencias.fieldAlbaran')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              {entregados.length === 0 ? (
                <p className="text-sm text-gray-500 italic">{t('incidencias.noEntregados')}</p>
              ) : (
                <div className="relative" ref={albBoxRef}>
                  <input
                    type="text"
                    value={albSearch}
                    onChange={(e) => {
                      setAlbSearch(e.target.value);
                      setCreateForm((f) => ({ ...f, albaran_id: '' }));
                      setAlbDropOpen(true);
                      setFormErrors((er) => ({ ...er, albaran_id: false }));
                    }}
                    onFocus={() => setAlbDropOpen(true)}
                    onBlur={() => setTimeout(() => setAlbDropOpen(false), 150)}
                    placeholder={t('incidencias.albSearchPlaceholder')}
                    className={`w-full border rounded-xl px-3 py-2 text-sm ${formErrors.albaran_id ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-gray-100`}
                    data-testid="create-albaran-search"
                  />
                  {albDropOpen && albSuggestions.length > 0 && (
                    <ul
                      className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1"
                      data-testid="albaran-suggestions"
                    >
                      {albSuggestions.map((a) => {
                        const cli = clientesById.get(a.customer_id);
                        const clienteLabel = cli ? `${cli.name} ${cli.surnames}` : `Cliente #${a.customer_id}`;
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onMouseDown={() => selectAlbaran(a)}
                              className="w-full text-left px-3 py-2 text-sm cursor-pointer bg-transparent border-none hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-100"
                              data-testid="albaran-suggestion-item"
                            >
                              #{a.id} — {clienteLabel}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium dark:text-gray-200">
                {t('incidencias.fieldDesc')}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                rows={3}
                value={createForm.descripcion}
                onChange={(e) => {
                  setCreateForm((f) => ({ ...f, descripcion: e.target.value }));
                  setFormErrors((er) => ({ ...er, descripcion: false }));
                }}
                placeholder={t('incidencias.fieldDescPlaceholder')}
                className={`border rounded-xl px-3 py-2 text-sm resize-none ${formErrors.descripcion ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-gray-100`}
                data-testid="create-descripcion-input"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeCreate}
                disabled={createSaving}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-600"
                data-testid="create-cancel-btn"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createSaving || entregados.length === 0}
                className="px-4 py-2 rounded-xl btn-accent text-sm disabled:opacity-50"
                data-testid="create-submit-btn"
              >
                {createSaving ? t('common.saving') : t('incidencias.createSubmit')}
              </button>
            </div>
          </form>
        </div>
      </ModalCenter>

      {/* ── Detail modal ── */}
      {detailInc && (() => {
        const alb = albaranesById.get(detailInc.albaran_id);
        const cli = alb ? clientesById.get(alb.customer_id) : null;
        return (
          <ModalCenter isOpen onClose={() => setDetailInc(null)} maxWidth="max-w-lg" showClose={false}>
            <div data-testid="detail-incidencia-modal">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-gray-100">{t('incidencias.detailTitle')}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteId(detailInc.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-sm dark:bg-gray-700 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/30"
                    data-testid="detail-delete-btn"
                  >
                    {t('common.delete')}
                  </button>
                  <button type="button" onClick={() => setDetailInc(null)} className={closeButtonClass} aria-label="Cerrar" data-testid="detail-close-btn"><CloseIcon /></button>
                </div>
              </div>

              {/* Incidencia section */}
              <section className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  {t('incidencias.sectionIncidencia')}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-sm space-y-1">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('incidencias.colDate')}:</span>{' '}
                    <span className="dark:text-gray-100">{fmtDate(detailInc.fecha_creacion)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('incidencias.fieldDesc')}:</span>{' '}
                    <span className="dark:text-gray-100">{detailInc.descripcion}</span>
                  </div>
                </div>
              </section>

              {/* Cliente section */}
              <section className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  {t('incidencias.sectionCliente')}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-sm space-y-1">
                  {cli ? (
                    <>
                      <div className="font-medium dark:text-gray-100">{cli.name} {cli.surnames}</div>
                      {cli.email && <div className="text-gray-500 dark:text-gray-400">{cli.email}</div>}
                      {cli.phone1 && <div className="text-gray-500 dark:text-gray-400">{cli.phone1}</div>}
                    </>
                  ) : (
                    <div className="text-gray-400">—</div>
                  )}
                </div>
              </section>

              {/* Albarán section */}
              <section className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  {t('incidencias.sectionAlbaran')}
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-sm space-y-1">
                  {alb ? (
                    <>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('incidencias.colAlbaran')}:</span>{' '}
                        <span className="dark:text-gray-100">#{alb.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">{t('incidencias.colDate')}:</span>{' '}
                        <span className="dark:text-gray-100">{fmtDate(alb.date)}</span>
                      </div>
                      {alb.total != null && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Total:</span>{' '}
                          <span className="dark:text-gray-100">{Number(alb.total).toFixed(2)} €</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-400">—</div>
                  )}
                </div>
              </section>

              {/* Navigation buttons */}
              <div className="flex gap-2">
                {alb && (
                  <button
                    type="button"
                    onClick={() => goToAlbaran(alb.id)}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-600"
                    data-testid="detail-go-albaran-btn"
                  >
                    {t('incidencias.goToAlbaran')}
                  </button>
                )}
                {cli && (
                  <button
                    type="button"
                    onClick={() => goToCliente(cli.id)}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-600"
                    data-testid="detail-go-cliente-btn"
                  >
                    {t('incidencias.goToCliente')}
                  </button>
                )}
              </div>
            </div>
          </ModalCenter>
        );
      })()}

      {/* ── Delete confirmation ── */}
      <ConfirmDeleteModal
        isOpen={deleteId != null}
        onClose={() => setDeleteId(null)}
        title={t('incidencias.deleteTitle')}
        message={t('incidencias.deleteConfirm')}
        onConfirm={confirmDelete}
        loading={deleting}
        confirmTestId="delete-confirm-btn"
        confirmLabel={deleting ? t('common.saving') : t('common.delete')}
        cancelLabel={t('common.cancel')}
      />
    </div>
  );
}
