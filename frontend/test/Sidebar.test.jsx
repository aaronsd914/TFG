/**
 * Sidebar.test.jsx
 * Verifica que el componente Sidebar renderiza todos los ítems de navegación
 * y que los enlaces apuntan a las rutas correctas.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../src/components/Sidebar.jsx';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock removeToken
vi.mock('../src/api/auth.js', () => ({ removeToken: vi.fn() }));
import { removeToken } from '../src/api/auth.js';

function renderSidebar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('muestra el nombre de la app', () => {
    renderSidebar();
    expect(screen.getByText('Financias')).toBeInTheDocument();
  });

  it('renderiza todos los ítems de navegación', () => {
    renderSidebar();
    const labels = [
      'Dashboard',
      'Nueva venta',
      'Clientes',
      'Albaranes',
      'Transporte',
      'Movimientos',
      'Productos',
      'Banco',
      'Tendencias',
    ];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('el ítem Dashboard tiene el enlace correcto', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('el ítem Clientes tiene el enlace correcto', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /clientes/i });
    expect(link).toHaveAttribute('href', '/clientes');
  });

  it('el ítem activo tiene la clase de resaltado', () => {
    renderSidebar('/clientes');
    const link = screen.getByRole('link', { name: /clientes/i });
    expect(link.className).toContain('bg-[#e0dcd3]');
  });

  it('los ítems inactivos no tienen la clase de resaltado', () => {
    renderSidebar('/');
    const link = screen.getByRole('link', { name: /clientes/i });
    // Los inactivos tienen 'hover:bg-[#e0dcd3]' pero NO 'bg-[#e0dcd3]' como clase propia
    const classes = link.className.split(/\s+/);
    expect(classes).not.toContain('bg-[#e0dcd3]');
  });

  it('tiene exactamente 9 enlaces de navegación', () => {
    renderSidebar();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(9);
  });

  it('muestra el botón de Cerrar sesión', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /cerrar sesi/i })).toBeInTheDocument();
  });

  it('al cerrar sesión llama a removeToken y redirige a /login', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesi/i }));
    expect(removeToken).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
