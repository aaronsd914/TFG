import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sileo';
import { ThemeProvider } from './context/ThemeContext.jsx';
import App from './components/App.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './api/fetchInterceptor.js';
import './i18n.js';
import './index.css';

const LoginPage          = lazy(() => import('./components/LoginPage.jsx'));
const Dashboard          = lazy(() => import('./components/Dashboard.jsx'));
const NuevaVenta         = lazy(() => import('./components/NuevaVenta.jsx'));
const ClientesPage       = lazy(() => import('./components/ClientesPage.jsx'));
const AlbaranesPage      = lazy(() => import('./components/AlbaranesPage.jsx'));
const Tendencias         = lazy(() => import('./components/Tendencias.jsx'));
const ProductosPage      = lazy(() => import('./components/ProductosPage.jsx'));
const BancoPage          = lazy(() => import('./components/BancoPage.jsx'));
const TransportePage     = lazy(() => import('./components/TransportePage.jsx'));
const PersonalizacionPage = lazy(() => import('./components/PersonalizacionPage.jsx'));
const IncidenciasPage    = lazy(() => import('./components/IncidenciasPage.jsx'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const PageFallback = (
  <div className="flex items-center justify-center h-40 text-gray-300">
    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
  </div>
);
const S = (C) => <Suspense fallback={PageFallback}>{C}</Suspense>;

const router = createBrowserRouter([
  {
    path: '/login',
    element: S(<LoginPage />),
  },
  {
    path: '/',
    element: <ProtectedRoute element={<App />} />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: S(<Dashboard />) },
      { path: 'ventas/nueva', element: S(<NuevaVenta />) },
      { path: 'clientes', element: S(<ClientesPage />) },
      { path: 'albaranes', element: S(<AlbaranesPage />) },
      { path: 'transporte', element: S(<TransportePage />) },
      { path: 'tendencias', element: S(<Tendencias />) },
      { path: 'productos', element: S(<ProductosPage />) },
      { path: 'banco', element: S(<BancoPage />) },
      { path: 'personalizacion', element: S(<PersonalizacionPage />) },
      { path: 'incidencias', element: S(<IncidenciasPage />) },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
