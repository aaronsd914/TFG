import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, saveToken } from '../api/auth.js';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      saveToken(data.access_token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fefcf7] relative overflow-hidden">

      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #c9b99a 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #a89070 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #8b7355 0%, transparent 70%)' }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-10 border border-[#e8e0d0]"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06)' }}
        >
          {/* Logo / Brand */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-lg"
              style={{ background: 'linear-gradient(135deg, #8b7355 0%, #5c4a32 100%)' }}
            >
              🪑
            </div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: 'Manrope, sans-serif', color: '#2c1f0e' }}
            >
              FurniGest
            </h1>
            <p className="text-sm text-gray-400 mt-1">Panel de gestión</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Usuario
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nombre de usuario"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#ddd5c8] bg-[#faf8f4] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b7355]/40 focus:border-[#8b7355] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-[#ddd5c8] bg-[#faf8f4] text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b7355]/40 focus:border-[#8b7355] transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? '#9a8a76'
                  : 'linear-gradient(135deg, #8b7355 0%, #5c4a32 100%)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(92,74,50,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Iniciando sesión…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-300 mt-8">
            FurniGest © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
