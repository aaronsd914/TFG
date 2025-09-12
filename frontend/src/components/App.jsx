import Sidebar from './Sidebar.jsx';
import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="flex h-screen font-sans bg-[#fefcf7] text-gray-800">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
