import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { pathname } = useLocation();

  const items = [
    { icon: '🏠', label: 'Dashboard', to: '/' },
    { icon: '➕', label: 'Nueva venta', to: '/ventas/nueva' },
    { icon: '👥', label: 'Clientes', to: '/clientes' },
    { icon: '🧾', label: 'Albaranes', to: '/albaranes' },
    { icon: '🚚', label: 'Transporte', to: '/transporte' },
    { icon: '💳', label: 'Movimientos', to: '/movimientos' }, // NUEVO
    { icon: '🧰', label: 'Productos', to: '/productos' },
    { icon: '🏦', label: 'Banco', to: '/banco' },
    { icon: '📊', label: 'Tendencias', to: '/tendencias' },
  ];

  return (
    <aside className="w-[220px] bg-[#f5f1e8] p-6 h-[calc(100vh-32px)] m-4 rounded-2xl shadow-md flex flex-col">
      <h2 className="text-xl mb-8 font-semibold">Financias</h2>
      <nav className="flex flex-col gap-2">
        {items.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-300
                ${active ? 'bg-[#e0dcd3] text-black' : 'text-gray-600 hover:bg-[#e0dcd3] hover:text-black'}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
