import { Link, useLocation, useNavigate } from 'react-router-dom';
import { removeToken } from '../api/auth.js';
import { useAppConfig } from '../context/ConfigContext.jsx';

export default function Sidebar({ open, setOpen }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { config } = useAppConfig();

  function handleLogout() {
    removeToken();
    navigate('/login', { replace: true });
  }

  const items = [
    { icon: '🏠', label: 'Dashboard', to: '/' },
    { icon: '➕', label: 'Nueva venta', to: '/ventas/nueva' },
    { icon: '👥', label: 'Clientes', to: '/clientes' },
    { icon: '🧾', label: 'Albaranes', to: '/albaranes' },
    { icon: '🚚', label: 'Transporte', to: '/transporte' },
    { icon: '💳', label: 'Movimientos', to: '/movimientos' },
    { icon: '🧰', label: 'Productos', to: '/productos' },
    { icon: '🏦', label: 'Banco', to: '/banco' },
    { icon: '📊', label: 'Tendencias', to: '/tendencias' },
    { icon: '⚙️', label: 'Configuración', to: '/personalizacion' },
  ];

  return (
    <aside
      className={`
        w-[220px] p-6 h-[calc(100vh-32px)] m-4 rounded-2xl shadow-md flex flex-col
        fixed top-0 left-0 z-30 transition-transform duration-300
        md:static md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:block
      `}
      style={{ backgroundColor: 'var(--fg-sidebar)', maxWidth: 260 }}
      aria-label="Sidebar"
    >
      {/* Close button for mobile */}
      <button
        className="md:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        onClick={() => setOpen(false)}
        aria-label="Close sidebar"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Logo / name */}
      <div className="mb-8 flex items-center gap-2">
        {config?.logo_empresa ? (
          <img src={config.logo_empresa} alt="Logo" className="h-16 max-w-full object-contain rounded" />
        ) : (
          <h2 className="text-xl font-semibold text-gray-900">FurniGest</h2>
        )}
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {items.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-300
                ${active ? 'text-black' : 'text-gray-600 hover:text-black'}`}
              style={active ? { backgroundColor: 'var(--fg-active)' } : {}}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--fg-active)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = ''; }}
              onClick={() => setOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200 w-full text-left text-sm"
        aria-label="Cerrar sesión"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </aside>
  );
}
