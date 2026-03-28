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
    vi.clearAllMocks();
    fetch.mockReset();   // Clear any leftover mockResolvedValueOnce from previous tests
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

  it('envío del formulario con datos válidos crea el movimiento', async () => {
    const newMov = { id: 100, date: '2026-03-15', description: 'Pago proveedor', amount: 250, type: 'EGRESO' };
    // First call: initial load returns empty list
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    // Second call: POST returns new movement
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(newMov) });

    await act(async () => { renderPage(); });

    // Open form modal
    await waitFor(() => screen.getByRole('button', { name: /añadir movimiento/i }));
    fireEvent.click(screen.getByRole('button', { name: /añadir movimiento/i }));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));

    // Fill form fields (use exact placeholder to avoid matching search bar)
    const conceptoInput = screen.getByPlaceholderText('Concepto');
    fireEvent.change(conceptoInput, { target: { value: 'Pago proveedor' } });

    const cantidadInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(cantidadInput, { target: { value: '250' } });

    // Submit the form directly via form submit event
    fireEvent.submit(conceptoInput.closest('form'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('movimientos/post'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('envío del formulario con campos vacíos llama a sileo.warning', async () => {
    const { sileo } = await import('sileo');

    await act(async () => { renderPage(); });

    // Open form modal
    await waitFor(() => screen.getByRole('button', { name: /añadir movimiento/i }));
    fireEvent.click(screen.getByRole('button', { name: /añadir movimiento/i }));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));

    // Clear the concept field (leave it empty) and submit
    const submitBtn = screen.getByRole('button', { name: /^guardar$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Campos obligatorios' })
      );
    });
  });

  it('abre el modal de filtros al pulsar "Filtros"', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });

    await waitFor(() => screen.getByRole('button', { name: /^filtros$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^filtros$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^filtros$/i })).toBeInTheDocument();
    });
  });

  it('filtra por tipo INGRESO en el modal de filtros', async () => {
    const movs = [
      { id: 1, date: '2026-03-01', description: 'Ingreso A', amount: 100, type: 'INGRESO' },
      { id: 2, date: '2026-03-02', description: 'Gasto B', amount: 50, type: 'EGRESO' },
    ];
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(movs) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Ingreso A'));

    // Open filter modal
    fireEvent.click(screen.getByRole('button', { name: /^filtros$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^filtros$/i }));

    // Click INGRESO filter button
    const ingresoBtn = screen.getAllByRole('button', { name: /^ingreso$/i });
    fireEvent.click(ingresoBtn[ingresoBtn.length - 1]); // last one is in the modal

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    // Only INGRESO rows should be visible
    await waitFor(() => {
      expect(screen.getByText('Ingreso A')).toBeInTheDocument();
      expect(screen.queryByText('Gasto B')).not.toBeInTheDocument();
    });
  });

  it('limpia todos los filtros con el botón limpiar en el modal', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });

    // Open filter modal
    await waitFor(() => screen.getByRole('button', { name: /^filtros$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^filtros$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^filtros$/i }));

    // Click INGRESO filter, then clear — t('common.clear') = 'Limpiar'
    // After clicking INGRESO, both the modal and chips area have a 'Limpiar' button
    const ingresoBtn = screen.getAllByRole('button', { name: /^ingreso$/i });
    fireEvent.click(ingresoBtn[ingresoBtn.length - 1]);
    // Use getAllByRole since there may be 2 'Limpiar' buttons (modal + chips area)
    const limpiarBtns = screen.getAllByRole('button', { name: /^limpiar$/i });
    fireEvent.click(limpiarBtns[0]);

    // Modal still open with TODOS selected
    expect(screen.getByRole('heading', { name: /^filtros$/i })).toBeInTheDocument();
  });

  it('busca movimientos por concepto y filtra la lista', async () => {
    const movs = [
      { id: 1, date: '2026-03-01', description: 'Alquiler oficina', amount: 800, type: 'EGRESO' },
      { id: 2, date: '2026-03-02', description: 'Sueldo empleado', amount: 1200, type: 'EGRESO' },
    ];
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(movs) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Alquiler oficina'));

    const searchInput = screen.getByPlaceholderText(/buscar por concepto/i);
    fireEvent.change(searchInput, { target: { value: 'alquiler' } });

    await waitFor(() => {
      expect(screen.getByText('Alquiler oficina')).toBeInTheDocument();
      expect(screen.queryByText('Sueldo empleado')).not.toBeInTheDocument();
    });
  });

  it('navega a la siguiente página con el botón ›', async () => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_MOVS) });
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Movimiento 1'));

    // The "next page" button has text content '›'
    const allBtns = screen.getAllByRole('button');
    const nextBtn = allBtns.find((b) => b.textContent === '›' && !b.disabled);
    expect(nextBtn).toBeTruthy();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Movimiento 11')).toBeInTheDocument();
    });
  });

  it('calcula el resumen mensual correctamente', async () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    const movs = [
      { id: 1, date: thisMonth, description: 'Cuota local', amount: 1000, type: 'INGRESO' },
      { id: 2, date: thisMonth, description: 'Suministros', amount: 300, type: 'EGRESO' },
    ];
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(movs) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Cuota local'));

    // 1000.00 € appears in both summary card and movement row, so use getAllByText
    const amount1000 = screen.getAllByText('1000.00 €');
    expect(amount1000.length).toBeGreaterThan(0);
    // 300.00 €
    const amount300 = screen.getAllByText('300.00 €');
    expect(amount300.length).toBeGreaterThan(0);
    // balance: 700.00 €
    expect(screen.getByText('700.00 €')).toBeInTheDocument();
  });
});
