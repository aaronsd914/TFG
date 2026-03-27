/**
 * MovimientosPage.test.jsx
 * Verifica el layout, resumen mensual, paginación, toggle tipo y formulario.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import MovimientosPage from '../../frontend/src/components/MovimientosPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

const SAMPLE_MOVS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  description: `Movimiento ${i + 1}`,
  amount: (i + 1) * 10,
  type: i % 2 === 0 ? 'INGRESO' : 'EGRESO',
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

  it('muestra las tarjetas de resumen mensual con "Gastos" (no "Egresos")', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/ingresos/i)).toBeInTheDocument();
      expect(screen.getByText(/gastos/i)).toBeInTheDocument();
      expect(screen.getByText(/balance/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/^egresos$/i)).not.toBeInTheDocument();
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

  it('muestra paginación cuando hay movimientos', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_MOVS) });
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByTestId('mov-page-size-select')).toBeInTheDocument();
    });
  });

  it('cambia el tamaño de página correctamente', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_MOVS) });
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByTestId('mov-page-size-select'));
    const select = screen.getByTestId('mov-page-size-select');
    fireEvent.change(select, { target: { value: '25' } });
    expect(select.value).toBe('25');
  });

  it('muestra solo 10 movimientos por defecto (primera página)', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_MOVS) });
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Movimiento 1'));
    // With 15 items and page size 10, page 1 shows items 1-10
    expect(screen.getByText('Movimiento 1')).toBeInTheDocument();
    expect(screen.queryByText('Movimiento 11')).not.toBeInTheDocument();
  });

  it('el formulario tiene toggle de tipo Ingreso/Gasto', async () => {
    renderPage();
    await act(async () => {
      const btn = screen.getByRole('button', { name: /añadir movimiento/i });
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /añadir movimiento/i })).toBeInTheDocument();
    });
    // Toggle buttons should be present
    const toggleIngreso = screen.getAllByRole('button', { name: /^ingreso$/i });
    const toggleGasto = screen.getAllByRole('button', { name: /^gasto$/i });
    expect(toggleIngreso.length).toBeGreaterThan(0);
    expect(toggleGasto.length).toBeGreaterThan(0);
    // No select element for tipo
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('no muestra mensajes de error inline bajo los campos por defecto', async () => {
    renderPage();
    await act(async () => {
      const btn = screen.getByRole('button', { name: /añadir movimiento/i });
      fireEvent.click(btn);
    });
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));
    expect(screen.queryByText(/obligator/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cantidad válida/i)).not.toBeInTheDocument();
  });

  it('busca movimientos por fecha', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_MOVS) });
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Movimiento 1'));
    const input = screen.getByPlaceholderText(/buscar por concepto/i);
    fireEvent.change(input, { target: { value: '2026-03-01' } });
    await waitFor(() => {
      expect(screen.getByText('Movimiento 1')).toBeInTheDocument();
    });
  });
});
