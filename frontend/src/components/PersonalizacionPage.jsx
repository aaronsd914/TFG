import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiFetch } from '../api/http.js';
import { getToken, removeToken } from '../api/auth.js';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAppConfig } from '../context/ConfigContext.jsx';
import { sileo } from 'sileo';

// ─── Collapsible accordion section ────────────────────────────────────────────
function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-base">{icon}</span>}
          <span className="font-semibold text-sm text-gray-700">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4 flex flex-col gap-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </section>
  );
}
Accordion.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  children: PropTypes.node.isRequired,
  defaultOpen: PropTypes.bool,
};

// ─── Schedule preview utility ──────────────────────────────────────────────────
function computeNextDates(startDateStr, intervalDays, count = 6) {
  if (!startDateStr || !intervalDays) return [];
  const interval = Number.parseInt(intervalDays, 10);
  if (!interval || interval < 1) return [];
  const start = new Date(startDateStr);
  if (Number.isNaN(start.getTime())) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - start) / 86400000);
  const cycles = diff > 0 ? Math.ceil(diff / interval) : 0;
  const firstUpcoming = new Date(start);
  firstUpcoming.setDate(firstUpcoming.getDate() + cycles * interval);
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(firstUpcoming);
    d.setDate(d.getDate() + i * interval);
    dates.push(d);
  }
  return dates;
}

function Field({ label, type = 'text', value, onChange, required, minLength, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
    </div>
  );
}
Field.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  minLength: PropTypes.number,
  placeholder: PropTypes.string,
};


function SaveBtn({ loading, label = 'Guardar' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="self-start px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Guardando…' : label}
    </button>
  );
}
SaveBtn.propTypes = {
  loading: PropTypes.bool.isRequired,
  label: PropTypes.string,
};

// ─── Palettes ─────────────────────────────────────────────────────────────────
const PALETTES = [
  { id: 'warm',   label: 'Cálido',  bg: '#f5f1e8', active: '#e0dcd3' },
  { id: 'slate',  label: 'Pizarra', bg: '#f1f5f9', active: '#e2e8f0' },
  { id: 'forest', label: 'Bosque',  bg: '#ecf5ec', active: '#d4e8d4' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function PersonalizacionPage() {
  const navigate = useNavigate();
  const { isDark, setIsDark, palette, setPalette } = useTheme();
  const { config, updateConfig } = useAppConfig();

  // Decode current username from JWT
  const currentUsername = (() => {
    try {
      const b64 = getToken().split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      return JSON.parse(atob(b64)).sub ?? '';
    } catch { return ''; }
  })();

  // ── Mi cuenta: username ──────────────────────────────────────────────────
  const [uForm, setUForm] = useState({ current_password: '', new_username: '' });
  const [uLoading, setULoading] = useState(false);

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    setULoading(true);
    try {
      await apiFetch('auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: uForm.current_password, new_username: uForm.new_username }),
      });
      removeToken();
      navigate('/login', { replace: true });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error al actualizar' });
    } finally { setULoading(false); }
  }

  // ── Mi cuenta: password ──────────────────────────────────────────────────
  const [pForm, setPForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pLoading, setPLoading] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (pForm.new_password !== pForm.confirm) {
      sileo.warning({ title: 'Aviso', description: 'Las contraseñas nuevas no coinciden' }); return;
    }
    setPLoading(true);
    try {
      await apiFetch('auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pForm.current_password, new_password: pForm.new_password }),
      });
      sileo.success({ title: 'Listo', description: 'Contraseña actualizada' });
      setPForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error al actualizar' });
    } finally { setPLoading(false); }
  }

  // ── Resumen semanal ──────────────────────────────────────────────────────
  const [emailDest, setEmailDest] = useState('');
  const [intervalo, setIntervalo] = useState('7');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaEnvio, setHoraEnvio] = useState('09:00');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    setEmailDest(config.resumen_email_destino || '');
    setIntervalo(config.resumen_intervalo_dias || '7');
    setFechaInicio(config.resumen_fecha_inicio || '');
    setHoraEnvio(config.resumen_hora_envio || '09:00');
  }, [config]);

  async function handleEmailSave(e) {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await updateConfig('resumen_email_destino', emailDest);
      await updateConfig('resumen_intervalo_dias', intervalo);
      await updateConfig('resumen_fecha_inicio', fechaInicio);
      await updateConfig('resumen_hora_envio', horaEnvio);
      sileo.success({ title: 'Listo', description: 'Configuración guardada' });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error al guardar' });
    } finally { setEmailLoading(false); }
  }

  const nextDates = computeNextDates(fechaInicio, intervalo);

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      sileo.warning({ title: 'Archivo demasiado grande', description: 'El archivo es demasiado grande (máx. 4 MB)' }); return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await updateConfig('logo_empresa', ev.target.result);
        sileo.success({ title: 'Listo', description: 'Logo guardado' });
      } catch (err) {
        sileo.error({ title: 'Error', description: err.message || 'Error al guardar el logo' });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleLogoRemove() {
    try {
      await updateConfig('logo_empresa', '');
      sileo.success({ title: 'Listo', description: 'Logo eliminado' });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error' });
    }
  }

  // ── Identidad: firma ─────────────────────────────────────────────────────
  const [firma, setFirma] = useState('');
  const [firmaLoading, setFirmaLoading] = useState(false);

  useEffect(() => { setFirma(config.firma_email || ''); }, [config]);

  async function handleFirmaSave(e) {
    e.preventDefault();
    setFirmaLoading(true);
    try {
      await updateConfig('firma_email', firma);
      sileo.success({ title: 'Listo', description: 'Firma guardada' });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error al guardar' });
    } finally { setFirmaLoading(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h2 className="text-lg font-semibold">Configuración</h2>

      {/* ── Mi cuenta ───────────────────────────────────────────────────── */}
      <Accordion title="Mi cuenta" icon="👤">
        <div className="flex items-center gap-3 bg-[var(--fg-sidebar)] rounded-xl px-4 py-3">
          <span className="text-xl">👤</span>
          <div>
            <div className="text-xs text-gray-500">Usuario activo</div>
            <div className="font-semibold text-gray-900">{currentUsername}</div>
          </div>
        </div>

        <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Al cambiar el nombre se cerrará la sesión.</p>
          <Field label="Contraseña actual" type="password" value={uForm.current_password}
            onChange={v => setUForm(f => ({ ...f, current_password: v }))} required />
          <Field label="Nuevo nombre de usuario" type="text" value={uForm.new_username}
            onChange={v => setUForm(f => ({ ...f, new_username: v }))} required minLength={3} />
          <SaveBtn loading={uLoading} label="Cambiar usuario" />
        </form>

        <hr className="border-gray-200" />

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Field label="Contraseña actual" type="password" value={pForm.current_password}
            onChange={v => setPForm(f => ({ ...f, current_password: v }))} required />
          <Field label="Nueva contraseña (mín. 8 caracteres)" type="password" value={pForm.new_password}
            onChange={v => setPForm(f => ({ ...f, new_password: v }))} required minLength={8} />
          <Field label="Confirmar nueva contraseña" type="password" value={pForm.confirm}
            onChange={v => setPForm(f => ({ ...f, confirm: v }))} required minLength={8} />
          <SaveBtn loading={pLoading} label="Cambiar contraseña" />
        </form>
      </Accordion>

      {/* ── Apariencia ──────────────────────────────────────────────────── */}
      <Accordion title="Apariencia" icon="🎨">
        {/* Dark mode toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">Modo oscuro</div>
            <div className="text-xs text-gray-500 mt-0.5">Cambia entre tema claro y oscuro</div>
          </div>
          <button
            type="button"
            onClick={() => setIsDark(d => !d)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}
            aria-label="Toggle dark mode"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 flex items-center justify-center text-xs ${
              isDark ? 'translate-x-6' : 'translate-x-0'
            }`}>
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>
        </div>

        {/* Palette selector */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Paleta de color</div>
          <div className="flex gap-3 flex-wrap">
            {PALETTES.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all ${
                  palette === p.id
                    ? 'border-gray-800 shadow-md'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <div className="flex gap-1">
                  <span className="w-5 h-5 rounded-full shadow-sm" style={{ background: p.bg }} />
                  <span className="w-5 h-5 rounded-full shadow-sm" style={{ background: p.active }} />
                </div>
                <span className="text-xs text-gray-600">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Accordion>

      {/* ── Resumen por email ────────────────────────────────────────────── */}
      <Accordion title="Resumen por email (IA)" icon="📧">
        <p className="text-sm text-gray-500">
          FurniGest genera automáticamente un resumen de actividad con análisis IA y lo envía
          al email configurado según el intervalo de días elegido.
        </p>
        <form onSubmit={handleEmailSave} className="flex flex-col gap-3">
          <Field label="Email destinatario" type="email"
            value={emailDest} onChange={setEmailDest}
            placeholder="tu@email.com" required />

          {/* Fecha inicio + intervalo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="email-fecha-inicio" className="text-sm text-gray-600">Fecha de inicio</label>
              <input
                id="email-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email-intervalo-dias" className="text-sm text-gray-600">Intervalo (días)</label>
              <input
                id="email-intervalo-dias"
                type="number"
                min={1}
                max={365}
                value={intervalo}
                onChange={e => setIntervalo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Hora de envío */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email-hora-envio" className="text-sm text-gray-600">Hora de envío</label>
            <input
              id="email-hora-envio"
              type="time"
              value={horaEnvio}
              onChange={e => setHoraEnvio(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-36"
            />
          </div>

          {/* Schedule preview */}
          {nextDates.length > 0 && (
            <div data-testid="schedule-preview" className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Próximos envíos programados
              </div>
              <div className="flex flex-wrap gap-2">
                {nextDates.map((d) => (
                  <div
                    key={d.toISOString()}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-center"
                  >
                    <div className="text-xs font-semibold text-gray-700">
                      {d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-xs text-gray-400">{horaEnvio || '09:00'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <span className="text-xs text-gray-400">
            {config.resumen_ultima_vez
              ? `Último envío: ${config.resumen_ultima_vez}`
              : 'Aún no se ha enviado ningún resumen'}
          </span>
          <SaveBtn loading={emailLoading} />
        </form>
      </Accordion>

      {/* ── Identidad ───────────────────────────────────────────────────── */}
      <Accordion title="Identidad de la tienda" icon="🏪">
        {/* Logo */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-gray-700">Logo</div>
          <p className="text-xs text-gray-500">
            Aparece en el Sidebar y en el encabezado del PDF de albaranes. PNG/JPG, máx. 200 KB.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {config.logo_empresa ? (
              <>
                <img
                  src={config.logo_empresa}
                  alt="Logo actual"
                  className="h-12 rounded-lg border border-gray-200 object-contain bg-white px-2"
                />
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-400 italic">Sin logo</span>
            )}
          </div>
          <label className="self-start cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            {config.logo_empresa ? 'Cambiar logo' : 'Subir logo'}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>

        <hr className="border-gray-200" />

        {/* Firma de email */}
        <form onSubmit={handleFirmaSave} className="flex flex-col gap-3">
          <div className="text-sm font-medium text-gray-700">Firma en emails de albarán</div>
          <p className="text-xs text-gray-500">
            Texto que aparece al final de los emails enviados al entregar un albarán.
          </p>
          <textarea
            value={firma}
            onChange={e => setFirma(e.target.value)}
            rows={3}
            placeholder="Ej: FurniGest · Calle Mayor 10 · Tel: 666 123 456"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
          />
          <SaveBtn loading={firmaLoading} label="Guardar firma" />
        </form>
      </Accordion>
    </div>
  );
}
