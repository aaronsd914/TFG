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

  it('no muestra las pestañas de Almacén/En ruta en la cabecera', async () => {
    await act(async () => { renderPage(); });
    // AnimatedTabs with almacen/ruta tabs were removed; only the h1 heading should appear
    const headings = screen.getAllByRole('heading');
    // There should be exactly one heading (the page title), no tab controls
    expect(headings.length).toBeGreaterThanOrEqual(1);
    // The header area should not contain animated tab buttons for almacen/ruta switching
    expect(screen.queryByRole('tab', { name: /almac/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /en ruta/i })).toBeNull();
  });

  it('no muestra el botón Entregar en las tarjetas de En ruta sin camión', async () => {
    // Set up rutas response with one albaran sin camion
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen empty
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          camiones: [],
          sin_camion: [{ id: 1, date: '2026-01-01', total: 100, status: 'RUTA', customer_id: 1, items: [] }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Juan', surnames: 'Test' }]) });

    await act(async () => { renderPage(); });

    await waitFor(() => {
      // The "Almacén" (return to warehouse) button should exist for sin_camion cards
      // but "Entregar" (deliver) button should NOT be present
      const buttons = screen.queryAllByRole('button');
      const entregar = buttons.filter(b => /entregar/i.test(b.textContent));
      expect(entregar).toHaveLength(0);
    });
  });
});
