import './Sidebar.css';

export default function Sidebar() {
  const items = [
    { icon: '🏠', label: 'Dashboard' },
    { icon: '🛒', label: 'Ventas' },
    { icon: '📦', label: 'Inventario' },
    { icon: '💰', label: 'Finanzas' },
    { icon: '📈', label: 'Reportes' },
    { icon: '⚙️', label: 'Configuración' }
  ];

  return (
    <aside className="sidebar">
      <h2 className="title">Financias</h2>
      <nav>
        {items.map((item) => (
          <div key={item.label} className="nav-item">
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
