import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/http.js';
import { getToken, removeToken } from '../api/auth.js';
import { useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';

export default function PerfilPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Decode current username from JWT
  const currentUsername = (() => {
    try {
      const b64 = getToken().split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      return JSON.parse(atob(b64)).sub ?? '';
    } catch {
      return '';
    }
  })();

  // ── Change username ────────────────────────────────────────────────────────
  const [uForm, setUForm] = useState({ current_password: '', new_username: '' });
  const [uLoading, setULoading] = useState(false);

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    setULoading(true);
    try {
      await apiFetch('auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: uForm.current_password,
          new_username: uForm.new_username,
        }),
      });
      // Username changed → JWT is now stale, force re-login
      removeToken();
      navigate('/login', { replace: true });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error al actualizar usuario' });
    } finally {
      setULoading(false);
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  const [pForm, setPForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pLoading, setPLoading] = useState(false);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (pForm.new_password !== pForm.confirm) {
      sileo.warning({ title: t('common.warning'), description: t('profile.passwordMismatch') });
      return;
    }
    setPLoading(true);
    try {
      await apiFetch('auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: pForm.current_password,
          new_password: pForm.new_password,
        }),
      });
      sileo.success({ title: t('common.ready'), description: t('profile.updateSuccess') });
      setPForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      sileo.error({ title: 'Error', description: err.message || 'Error al actualizar contraseña' });
    } finally {
      setPLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h2 className="text-lg font-semibold">{t('profile.title')}</h2>

      {/* Current user info */}
      <div className="bg-[#f5f1e8] rounded-2xl px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">👤</span>
        <div>
          <div className="text-sm text-gray-500">{t('profile.activeUser')}</div>
          <div className="font-semibold">{currentUsername}</div>
        </div>
      </div>

      {/* ── Cambiar usuario ── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">{t('profile.changeUsername')}</h3>
        <p className="text-sm text-gray-500">{t('profile.changeUsernameHint')}</p>
        <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3">
          <Field
            label={t('profile.currentPassword')}
            type="password"
            value={uForm.current_password}
            onChange={v => setUForm(f => ({ ...f, current_password: v }))}
            required
          />
          <Field
            label={t('profile.newUsername')}
            type="text"
            value={uForm.new_username}
            onChange={v => setUForm(f => ({ ...f, new_username: v }))}
            required
            minLength={3}
          />

          <button
            type="submit"
            disabled={uLoading}
            className="self-start px-4 py-2 btn-accent rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {uLoading ? t('common.saving') : t('profile.btnChangeUser')}
          </button>
        </form>
      </section>

      {/* ── Cambiar contraseña ── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">{t('profile.changePassword')}</h3>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Field
            label={t('profile.currentPassword')}
            type="password"
            value={pForm.current_password}
            onChange={v => setPForm(f => ({ ...f, current_password: v }))}
            required
          />
          <Field
            label={t('profile.newPassword')}
            type="password"
            value={pForm.new_password}
            onChange={v => setPForm(f => ({ ...f, new_password: v }))}
            required
            minLength={8}
          />
          <Field
            label={t('profile.confirmPassword')}
            type="password"
            value={pForm.confirm}
            onChange={v => setPForm(f => ({ ...f, confirm: v }))}
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={pLoading}
            className="self-start px-4 py-2 btn-accent rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {pLoading ? t('common.saving') : t('profile.btnChangePassword')}
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({ label, type, value, onChange, required, minLength }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        minLength={minLength}
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
};
