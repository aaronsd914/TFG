import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { apiFetch } from '../api/http.js';
import { getToken, removeToken } from '../api/auth.js';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAppConfig } from '../context/ConfigContext.jsx';

function Section({ title, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">{title}</h3>
      {children}
    </section>
  );
}
Section.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

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

function Alert({ ok, msg }) {
  if (!msg) return null;
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${ok
      ? 'bg-green-50 text-green-800 border border-green-200'
      : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {msg}
    </div>
  );
}
Alert.propTypes = {
  ok: PropTypes.bool,
  msg: PropTypes.string,
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
  const [uStatus, setUStatus] = useState(null);
  const [uLoading, setULoading] = useState(false);

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    setULoading(true); setUStatus(null);
    try {
      await apiFetch('auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: uForm.current_password, new_username: uForm.new_username }),
      });
      removeToken();
      navigate('/login', { replace: true });
    } catch (err) {
      setUStatus({ ok: false, msg: err.message || 'Error al actualizar' });
    } finally { setULoading(false); }
  }

  // ── Mi cuenta: password ──────────────────────────────────────────────────
  const [pForm, setPForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pStatus, setPStatus] = useState(null);
  const [pLoading, setPLoading] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (pForm.new_password !== pForm.confirm) {
      setPStatus({ ok: false, msg: 'Las contraseñas nuevas no coinciden' }); return;
    }
    setPLoading(true); setPStatus(null);
    try {
      await apiFetch('auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pForm.current_password, new_password: pForm.new_password }),
      });
      setPStatus({ ok: true, msg: 'Contraseña actualizada' });
      setPForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPStatus({ ok: false, msg: err.message || 'Error al actualizar' });
    } finally { setPLoading(false); }
  }

  // ── Resumen semanal ──────────────────────────────────────────────────────
  const [emailDest, setEmailDest] = useState('');
  const [intervalo, setIntervalo] = useState('7');
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    setEmailDest(config.resumen_email_destino || '');
    setIntervalo(config.resumen_intervalo_dias || '7');
  }, [config]);

  async function handleEmailSave(e) {
    e.preventDefault();
    setEmailLoading(true); setEmailStatus(null);
    try {
      await updateConfig('resumen_email_destino', emailDest);
      await updateConfig('resumen_intervalo_dias', intervalo);
      setEmailStatus({ ok: true, msg: 'Configuración guardada' });
    } catch (err) {
      setEmailStatus({ ok: false, msg: err.message || 'Error al guardar' });
    } finally { setEmailLoading(false); }
  }

  // ── Identidad: logo ──────────────────────────────────────────────────────
  const [logoStatus, setLogoStatus] = useState(null);

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      setLogoStatus({ ok: false, msg: 'El archivo es demasiado grande (máx. 200 KB)' }); return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await updateConfig('logo_empresa', ev.target.result);
        setLogoStatus({ ok: true, msg: 'Logo guardado' });
      } catch (err) {
        setLogoStatus({ ok: false, msg: err.message || 'Error al guardar el logo' });
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleLogoRemove() {
    try {
      await updateConfig('logo_empresa', '');
      setLogoStatus({ ok: true, msg: 'Logo eliminado' });
    } catch (err) {
      setLogoStatus({ ok: false, msg: err.message || 'Error' });
    }
  }

  // ── Identidad: firma ─────────────────────────────────────────────────────
  const [firma, setFirma] = useState('');
  const [firmaStatus, setFirmaStatus] = useState(null);
  const [firmaLoading, setFirmaLoading] = useState(false);

  useEffect(() => { setFirma(config.firma_email || ''); }, [config]);

  async function handleFirmaSave(e) {
    e.preventDefault();
    setFirmaLoading(true); setFirmaStatus(null);
    try {
      await updateConfig('firma_email', firma);
      setFirmaStatus({ ok: true, msg: 'Firma guardada' });
    } catch (err) {
      setFirmaStatus({ ok: false, msg: err.message || 'Error al guardar' });
    } finally { setFirmaLoading(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h2 className="text-lg font-semibold">Personalización</h2>

      {/* ── Mi cuenta ───────────────────────────────────────────────────── */}
      <Section title="Mi cuenta">
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
          <Alert {...(uStatus || {})} />
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
          <Alert {...(pStatus || {})} />
          <SaveBtn loading={pLoading} label="Cambiar contraseña" />
        </form>
      </Section>

      {/* ── Apariencia ──────────────────────────────────────────────────── */}
      <Section title="Apariencia">
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
      </Section>

      {/* ── Resumen semanal ──────────────────────────────────────────────── */}
      <Section title="Resumen por email (IA)">
        <p className="text-sm text-gray-500">
          FurniGest genera automáticamente un resumen de actividad con análisis IA y lo envía
          al email configurado según el intervalo de días elegido.
        </p>
        <form onSubmit={handleEmailSave} className="flex flex-col gap-3">
          <Field label="Email destinatario" type="email"
            value={emailDest} onChange={setEmailDest}
            placeholder="tu@email.com" required />
          <div className="flex flex-col gap-1">
            <label htmlFor="email-intervalo" className="text-sm text-gray-600">
              Intervalo de envío (días)
            </label>
            <input
              id="email-intervalo"
              type="number"
              min={1}
              max={365}
              value={intervalo}
              onChange={e => setIntervalo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-28"
            />
            <span className="text-xs text-gray-400">
              {config.resumen_ultima_vez
                ? `Último envío: ${config.resumen_ultima_vez}`
                : 'Aún no se ha enviado ningún resumen'}
            </span>
          </div>
          <Alert {...(emailStatus || {})} />
          <SaveBtn loading={emailLoading} />
        </form>
      </Section>

      {/* ── Identidad ───────────────────────────────────────────────────── */}
      <Section title="Identidad de la tienda">
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
          <Alert {...(logoStatus || {})} />
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
          <Alert {...(firmaStatus || {})} />
          <SaveBtn loading={firmaLoading} label="Guardar firma" />
        </form>
      </Section>
    </div>
  );
}
