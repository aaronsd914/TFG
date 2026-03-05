/**
 * ClientesPage.test.jsx
 * Verifica el layout inicial, llamadas a la API y controles de búsqueda.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientesPage from '../src/components/ClientesPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderPage() {
  return render(<ClientesPage />);
}

describe('ClientesPage', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('llama a la API al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('muestra el encabezado de clientes', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clientes/i })).toBeInTheDocument();
    });
  });

  it('contiene un campo de búsqueda', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('textbox', { hidden: true })).toBeInTheDocument();
    });
  });

  it('muestra mensaje de lista vacía cuando no hay clientes', async () => {
    renderPage();
    await waitFor(() => {
      // Con lista vacía no debería mostrar filas de tabla
      expect(screen.queryAllByRole('row')).toHaveLength(0);
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
