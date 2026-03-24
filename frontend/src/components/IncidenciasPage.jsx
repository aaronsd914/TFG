import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { sileo } from 'sileo';
import { API_URL } from '../config.js';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('es-ES');
}

export default function IncidenciasPage() {
  const { t } = useTranslation();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [incidencias, setIncidencias] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ albaran_id: '', descripcion: '' });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState(null);

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

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return incidencias;
    const q = search.toLowerCase();
    return incidencias.filter((inc) => {
      const alb = albaranesById.get(inc.albaran_id);
      const cli = alb ? clientesById.get(alb.customer_id) : null;
      return (
        inc.descripcion.toLowerCase().includes(q) ||
        String(inc.albaran_id).includes(q) ||
        (cli ? `${cli.name} ${cli.surnames}`.toLowerCase().includes(q) : false)
      );
    });
  }, [incidencias, search, albaranesById, clientesById]);

  // ── Create handlers ───────────────────────────────────────────────────────
  function openCreate() {
    setCreateForm({ albaran_id: entregados[0]?.id ?? '', descripcion: '' });
    setCreateError(null);
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateForm({ albaran_id: '', descripcion: '' });
    setCreateError(null);
  }

  async function submitCreate(e) {
    e.preventDefault();
    if (!createForm.albaran_id) {
      setCreateError(t('incidencias.errorNoAlbaran'));
      return;
    }
    if (!createForm.descripcion.trim()) {
      setCreateError(t('incidencias.errorNoDesc'));
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
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
      setCreateError(msg);
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
      loadAll();
    } catch (err) {
      sileo.error({ title: t('incidencias.deleteError'), description: err?.message });
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('incidencias.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('incidencias.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:opacity-90 transition self-start"
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-gray-200 bg-gray-50">
                <th className="p-3 w-16">{t('incidencias.colId')}</th>
                <th className="p-3 w-24">{t('incidencias.colDate')}</th>
                <th className="p-3 w-20">{t('incidencias.colAlbaran')}</th>
                <th className="p-3">{t('incidencias.colClient')}</th>
                <th className="p-3">{t('incidencias.colDesc')}</th>
                <th className="p-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-4 text-sm text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-sm text-gray-500" data-testid="incidencias-empty">
                    {t('incidencias.noResults')}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((inc) => {
                  const alb = albaranesById.get(inc.albaran_id);
                  const cli = alb ? clientesById.get(alb.customer_id) : null;
                  return (
                    <tr key={inc.id} className="border-b border-gray-100 hover:bg-gray-50" data-testid="incidencia-row">
                      <td className="p-3 text-sm">#{inc.id}</td>
                      <td className="p-3 text-sm">{fmtDate(inc.fecha_creacion)}</td>
                      <td className="p-3 text-sm">
                        <a
                          href="/albaranes"
                          onClick={() => {
                            try { localStorage.setItem('albaran_open_id', String(inc.albaran_id)); } catch {}
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          #{inc.albaran_id}
                        </a>
                      </td>
                      <td className="p-3 text-sm">
                        {cli ? `${cli.name} ${cli.surnames}` : `—`}
                      </td>
                      <td className="p-3 text-sm max-w-xs truncate" title={inc.descripcion}>
                        {inc.descripcion}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setDeleteId(inc.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          data-testid="delete-incidencia-btn"
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="create-incidencia-modal">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold">{t('incidencias.createTitle')}</h2>
            <p className="text-sm text-gray-500">{t('incidencias.createDesc')}</p>

            {createError && (
              <p className="text-red-600 text-sm">{createError}</p>
            )}

            <form onSubmit={submitCreate} className="flex flex-col gap-4">
              {/* Albaran selector */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">{t('incidencias.fieldAlbaran')}</label>
                {entregados.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">{t('incidencias.noEntregados')}</p>
                ) : (
                  <select
                    value={createForm.albaran_id}
                    onChange={(e) => setCreateForm((f) => ({ ...f, albaran_id: Number(e.target.value) }))}
                    className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
                    data-testid="create-albaran-select"
                  >
                    {entregados.map((a) => {
                      const cli = clientesById.get(a.customer_id);
                      return (
                        <option key={a.id} value={a.id}>
                          #{a.id} — {cli ? `${cli.name} ${cli.surnames}` : `Cliente #${a.customer_id}`}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">{t('incidencias.fieldDesc')}</label>
                <textarea
                  rows={3}
                  value={createForm.descripcion}
                  onChange={(e) => setCreateForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder={t('incidencias.fieldDescPlaceholder')}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none"
                  data-testid="create-descripcion-input"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeCreate}
                  disabled={createSaving}
                  className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                  data-testid="create-cancel-btn"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createSaving || entregados.length === 0}
                  className="px-4 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90 disabled:opacity-50"
                  data-testid="create-submit-btn"
                >
                  {createSaving ? t('common.saving') : t('incidencias.createSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="delete-confirm-modal">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold">{t('incidencias.deleteTitle')}</h2>
            <p className="text-sm text-gray-600">{t('incidencias.deleteConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                data-testid="delete-confirm-btn"
              >
                {deleting ? t('common.saving') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
