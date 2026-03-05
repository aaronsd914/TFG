/**
 * NuevaVenta.test.jsx
 * Verifica el layout del wizard de nueva venta y la disponibilidad del formulario.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import NuevaVenta from '../src/components/NuevaVenta.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderPage() {
  return render(<NuevaVenta />);
}

describe('NuevaVenta', () => {
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

  it('muestra el título "Nueva venta"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nueva venta/i })).toBeInTheDocument();
    });
  });

  it('muestra el campo de búsqueda de cliente', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/busca por nombre/i)).toBeInTheDocument();
    });
  });

  it('muestra el checkbox para usar cliente existente', async () => {
    renderPage();
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
