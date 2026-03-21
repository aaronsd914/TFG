import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sileo';
import App from './components/App.jsx';
import LoginPage from './components/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Dashboard from './components/Dashboard.jsx';
import NuevaVenta from './components/NuevaVenta.jsx';
import ClientesPage from './components/ClientesPage.jsx';
import AlbaranesPage from './components/AlbaranesPage.jsx';
import Tendencias from './components/Tendencias.jsx';
import ProductosPage from './components/ProductosPage.jsx';
import BancoPage from './components/BancoPage.jsx';
import TransportePage from './components/TransportePage.jsx';
import MovimientosPage from './components/MovimientosPage.jsx';
import PerfilPage from './components/PerfilPage.jsx';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './api/fetchInterceptor.js';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute element={<App />} />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'ventas/nueva', element: <NuevaVenta /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'albaranes', element: <AlbaranesPage /> },
      { path: 'transporte', element: <TransportePage /> },
      { path: 'movimientos', element: <MovimientosPage /> },
      { path: 'tendencias', element: <Tendencias /> },
      { path: 'productos', element: <ProductosPage /> },
      { path: 'banco', element: <BancoPage /> },
      { path: 'perfil', element: <PerfilPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="top-right"
      options={{
        fill: '#171717',
        autopilot: {
          expand: 500,
          collapse: 5000,
        },
        styles: {
          title: 'text-white! select-none',
          description: 'text-white/75! select-none',
          badge: 'bg-white/10!',
          button: 'bg-white/10! hover:bg-white/15!',
        },
      }}
    />
      <RouterProvider router={router} />
      <SpeedInsights />
  </StrictMode>
);
