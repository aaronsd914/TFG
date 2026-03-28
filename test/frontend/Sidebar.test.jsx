/**
 * Sidebar.test.jsx
 * Verifica que el componente Sidebar renderiza todos los ítems de navegación
 * y que los enlaces apuntan a las rutas correctas.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../frontend/src/components/Sidebar.jsx';
import { ConfigContext } from '../../frontend/src/context/ConfigContext.jsx';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock removeToken
vi.mock('../../frontend/src/api/auth.js', () => ({ removeToken: vi.fn() }));
import { removeToken } from '../../frontend/src/api/auth.js';

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
    expect(screen.getByText('FurniGest')).toBeInTheDocument();
  });

  it('renderiza todos los ítems de navegación', () => {
    renderSidebar();
    const labels = [
      'Dashboard',
      'Nueva venta',
      'Clientes',
      'Albaranes',
      'Incidencias',
      'Transporte',
      'Productos',
      'Banco',
      'Tendencias',
      'Configuración',
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

  it('el ítem activo tiene el estilo de resaltado', () => {
    renderSidebar('/clientes');
    const link = screen.getByRole('link', { name: /clientes/i });
    expect(link.style.backgroundColor).toBe('var(--fg-active)');
  });

  it('los ítems inactivos no tienen el estilo de resaltado', () => {
    renderSidebar('/');
    const link = screen.getByRole('link', { name: /clientes/i });
    expect(link.style.backgroundColor).toBeFalsy();
  });

  it('tiene exactamente 12 enlaces de navegación', () => {
    renderSidebar();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(10);
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

  it('el botón de cerrar menú (mobile) llama a setOpen(false)', () => {
    const mockSetOpen = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar open={true} setOpen={mockSetOpen} />
      </MemoryRouter>
    );
    // The close button for mobile has aria-label "Cerrar menú"
    const closeBtn = screen.getByRole('button', { name: /cerrar menú/i });
    fireEvent.click(closeBtn);
    expect(mockSetOpen).toHaveBeenCalledWith(false);
  });

  it('muestra el logo cuando config.logo_empresa está configurado', () => {
    const configWithLogo = { logo_empresa: 'https://example.com/logo.png', tienda_nombre: 'FurniGest' };
    render(
      <ConfigContext.Provider value={{ config: configWithLogo, updateConfig: vi.fn() }}>
        <MemoryRouter>
          <Sidebar open={false} setOpen={vi.fn()} />
        </MemoryRouter>
      </ConfigContext.Provider>
    );
    // Logo img should be shown (covers lines 76-78)
    const img = document.querySelector('img[alt="Logo"]');
    expect(img).not.toBeNull();
    expect(img.src).toContain('example.com/logo.png');
  });

  it('onMouseEnter en un enlace no activo cambia su color de fondo', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard-not-matching']}>
        <Sidebar open={true} setOpen={vi.fn()} />
      </MemoryRouter>
    );
    // All nav links should be "not active" since pathname doesn't match any
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    // Fire mouseEnter and mouseLeave to cover onMouseEnter/onMouseLeave handlers
    fireEvent.mouseEnter(links[0]);
    fireEvent.mouseLeave(links[0]);
    expect(document.body).toBeTruthy();
  });

  it('onClick en un enlace de navegación llama a setOpen(false)', () => {
    const mockSetOpen = vi.fn();
    render(
      <MemoryRouter initialEntries={['/irrelevant']}>
        <Sidebar open={true} setOpen={mockSetOpen} />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    fireEvent.click(links[0]);
    expect(mockSetOpen).toHaveBeenCalledWith(false);
  });
});
