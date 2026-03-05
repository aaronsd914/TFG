/**
 * MovimientosPage.test.jsx
 * Verifica el layout, el resumen mensual y el formulario de alta manual.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import MovimientosPage from '../src/components/MovimientosPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderPage() {
  return render(<MovimientosPage />);
}

describe('MovimientosPage', () => {
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
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('movimientos'));
    });
  });

  it('muestra el título "Movimientos"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /movimientos/i })).toBeInTheDocument();
    });
  });

  it('muestra las tarjetas de resumen mensual', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/ingresos/i)).toBeInTheDocument();
      expect(screen.getByText(/egresos/i)).toBeInTheDocument();
      expect(screen.getByText(/balance/i)).toBeInTheDocument();
    });
  });

  it('muestra el formulario de alta manual', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/añadir movimiento/i)).toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
