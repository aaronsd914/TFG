import Sidebar from './Sidebar.jsx';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen font-sans bg-[#fefcf7] text-gray-800">
      {/* Hamburger button for mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-30 bg-[#f5f1e8] p-2 rounded-lg shadow-md"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar: hidden on mobile, visible on md+ */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
