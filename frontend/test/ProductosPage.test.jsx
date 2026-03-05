/**
 * ProductosPage.test.jsx
 * Verifica el layout inicial, las llamadas a la API y el panel de productos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import ProductosPage from '../src/components/ProductosPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderPage() {
  return render(<ProductosPage />);
}

describe('ProductosPage', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // proveedores
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

  it('muestra el título "Productos"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /productos/i })).toBeInTheDocument();
    });
  });

  it('no muestra errores visibles con listas vacías', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
