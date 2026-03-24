import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n.js';
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
      className="self-start px-4 py-2 btn-accent rounded-lg text-sm disabled:opacity-50 transition-colors"
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
  { id: 'warm',     label: 'Cálido',  bg: '#ece6d5', active: '#d4cec3' },
  { id: 'slate',    label: 'Pizarra', bg: '#e2eaf4', active: '#cdd8e8' },
  { id: 'forest',   label: 'Bosque',  bg: '#d9eed9', active: '#c1ddc1' },
  { id: 'rose',     label: 'Rosa',    bg: '#fce8e8', active: '#f5d0d0' },
  { id: 'ocean',    label: 'Océano',  bg: '#dceeff', active: '#bdd8f9' },
  { id: 'lavender', label: 'Lavanda', bg: '#ece6ff', active: '#d5caf5' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function PersonalizacionPage() {
  const navigate = useNavigate();
  const { isDark, setIsDark, palette, setPalette } = useTheme();
  const { config, updateConfig } = useAppConfig();
  const { t } = useTranslation();
  const currentLang = i18n.language?.slice(0, 2) === 'en' ? 'en' : 'es';

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
      <h2 className="text-lg font-semibold">{t('settings.title')}</h2>

      {/* ── Mi cuenta ───────────────────────────────────────────────────── */}
      <Accordion title={t('settings.accountSection')} icon="👤">
        <div className="flex items-center gap-3 bg-[var(--fg-sidebar)] rounded-xl px-4 py-3">
          <span className="text-xl">👤</span>
          <div>
            <div className="text-xs text-gray-500">{t('settings.activeUser')}</div>
            <div className="font-semibold text-gray-900">{currentUsername}</div>
          </div>
        </div>

        <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">{t('settings.changeSessionWarning')}</p>
          <Field label={t('settings.currentPassword')} type="password" value={uForm.current_password}
            onChange={v => setUForm(f => ({ ...f, current_password: v }))} required />
          <Field label={t('settings.newUsername')} type="text" value={uForm.new_username}
            onChange={v => setUForm(f => ({ ...f, new_username: v }))} required minLength={3} />
          <SaveBtn loading={uLoading} label={t('settings.btnChangeUser')} />
        </form>

        <hr className="border-gray-200" />

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Field label={t('settings.currentPassword')} type="password" value={pForm.current_password}
            onChange={v => setPForm(f => ({ ...f, current_password: v }))} required />
          <Field label={t('settings.newPasswordFull')} type="password" value={pForm.new_password}
            onChange={v => setPForm(f => ({ ...f, new_password: v }))} required minLength={8} />
          <Field label={t('settings.confirmPassword')} type="password" value={pForm.confirm}
            onChange={v => setPForm(f => ({ ...f, confirm: v }))} required minLength={8} />
          <SaveBtn loading={pLoading} label={t('settings.btnChangePassword')} />
        </form>
      </Accordion>

      {/* ── Apariencia ──────────────────────────────────────────────────── */}
      <Accordion title={t('appearance.title')} icon="🎨">
        {/* Dark mode toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">{t('appearance.darkMode')}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t('appearance.darkModeDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => setIsDark(d => !d)}
            role="switch"
            aria-checked={isDark}
            aria-label={t('appearance.toggleDarkMode')}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}
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
          <div className="text-sm font-medium text-gray-700 mb-2">{t('appearance.colorPalette')}</div>
          <div role="radiogroup" aria-label={t('appearance.colorPalette')} className="flex gap-3 flex-wrap">
            {PALETTES.map(p => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={palette === p.id}
                aria-label={t('appearance.selectPalette', { name: p.label })}
                onClick={() => setPalette(p.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all ${
                  palette === p.id
                    ? 'border-gray-800 shadow-md'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <div className="flex gap-1" aria-hidden="true">
                  <span className="w-5 h-5 rounded-full shadow-sm" style={{ background: p.bg }} />
                  <span className="w-5 h-5 rounded-full shadow-sm" style={{ background: p.active }} />
                </div>
                <span className="text-xs text-gray-600">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language selector */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-0.5">{t('appearance.language')}</div>
          <div className="text-xs text-gray-500 mb-2">{t('appearance.languageDesc')}</div>
          <div role="radiogroup" aria-label={t('appearance.language')} className="flex gap-2">
            {['es', 'en'].map(lang => (
              <button
                key={lang}
                type="button"
                role="radio"
                aria-checked={currentLang === lang}
                aria-label={t('appearance.selectLanguage', { lang: lang.toUpperCase() })}
                onClick={() => i18n.changeLanguage(lang)}
                data-testid={`lang-${lang}`}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  currentLang === lang
                    ? 'border-gray-800 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {lang === 'es' ? t('appearance.langEs') : t('appearance.langEn')}
              </button>
            ))}
          </div>
        </div>
      </Accordion>

      {/* ── Resumen por email ────────────────────────────────────────────── */}
      <Accordion title={t('settings.resumeSection')} icon="📧">
        <p className="text-sm text-gray-500">{t('settings.resumeDesc')}</p>
        <form onSubmit={handleEmailSave} className="flex flex-col gap-3">
          <Field label={t('settings.emailDest')} type="email"
            value={emailDest} onChange={setEmailDest}
            placeholder="tu@email.com" required />

          {/* Fecha inicio + intervalo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="email-fecha-inicio" className="text-sm text-gray-600">{t('settings.startDate')}</label>
              <input
                id="email-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email-intervalo-dias" className="text-sm text-gray-600">{t('settings.intervalDays')}</label>
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
            <label htmlFor="email-hora-envio" className="text-sm text-gray-600">{t('settings.sendTime')}</label>
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
                {t('settings.nextScheduled')}
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
              ? t('settings.lastSent', { date: config.resumen_ultima_vez })
              : t('settings.neverSent')}
          </span>
          <SaveBtn loading={emailLoading} />
        </form>
      </Accordion>

      {/* ── Identidad ───────────────────────────────────────────────────── */}
      <Accordion title={t('settings.identitySection')} icon="🏪">
        {/* Logo */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-gray-700">{t('settings.logoLabel')}</div>
          <p className="text-xs text-gray-500">{t('settings.logoDesc')}</p>
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
                  {t('settings.removeLogo')}
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-400 italic">{t('settings.noLogo')}</span>
            )}
          </div>
          <label className="self-start cursor-pointer px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            {config.logo_empresa ? t('settings.changeLogo') : t('settings.uploadLogo')}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
        </div>

        <hr className="border-gray-200" />

        {/* Firma de email */}
        <form onSubmit={handleFirmaSave} className="flex flex-col gap-3">
          <div className="text-sm font-medium text-gray-700">{t('settings.emailSignature')}</div>
          <p className="text-xs text-gray-500">{t('settings.emailSignatureDesc')}</p>
          <textarea
            value={firma}
            onChange={e => setFirma(e.target.value)}
            rows={3}
            placeholder="Ej: FurniGest · Calle Mayor 10 · Tel: 666 123 456"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
          />
          <SaveBtn loading={firmaLoading} label={t('settings.saveSignature')} />
        </form>
      </Accordion>
    </div>
  );
}
