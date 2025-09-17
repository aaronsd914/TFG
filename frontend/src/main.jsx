import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './components/App.jsx';
import Dashboard from './components/Dashboard.jsx';
import NuevaVenta from './components/NuevaVenta.jsx';
import ClientesPage from './components/ClientesPage.jsx';
import AlbaranesPage from './components/AlbaranesPage.jsx';
import Tendencias from './components/Tendencias.jsx';
import ProductosPage from './components/ProductosPage.jsx';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'ventas/nueva', element: <NuevaVenta /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'albaranes', element: <AlbaranesPage /> },
      { path: 'tendencias', element: <Tendencias /> },
       { path: 'productos', element: <ProductosPage /> },

    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
