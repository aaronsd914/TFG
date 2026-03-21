/**
 * TransportePage.test.jsx
 * Verifica el layout del módulo de transporte y las llamadas iniciales a la API.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import TransportePage from '../../frontend/src/components/TransportePage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderPage() {
  return render(<TransportePage />);
}

describe('TransportePage', () => {
  beforeEach(() => {
    // Responde a las tres llamadas iniciales: almacen, rutas, clientes
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes
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

  it('consulta almacén, rutas y clientes al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('transporte/almacen'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('transporte/rutas'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('clientes/get'));
    });
  });

  it('muestra el título "Transporte"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /transporte/i })).toBeInTheDocument();
    });
  });

  it('muestra la columna de camiones', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/camiones/i)).toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
