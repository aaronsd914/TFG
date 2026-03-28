import Sidebar from './Sidebar.jsx';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigProvider } from '../context/ConfigContext.jsx';

export default function App() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ConfigProvider>
      <div className="flex h-screen font-sans text-gray-800" style={{ backgroundColor: 'var(--fg-bg)' }}>
        {/* Sidebar: hidden on mobile, visible on md+ */}
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('sidebar.closeOverlay')}
          />
        )}

        <main className="flex-1 p-3 md:p-6 overflow-y-auto">
          {/* Hamburger + title row for mobile */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <button
              className="p-2 rounded-lg shadow-md"
              style={{ backgroundColor: 'var(--fg-sidebar)' }}
              onClick={() => setSidebarOpen(true)}
              aria-label={t('sidebar.openSidebar')}
            >
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-xl font-semibold">{document.title || 'FurniGest'}</span>
          </div>
          <Outlet />
        </main>
      </div>
    </ConfigProvider>
  );
}
