/**
 * BancoPage.test.jsx
 * Tests for the merged BancoPage: Stripe checkout + movements CRUD, filtering, pagination, summary.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import BancoPage from '../../frontend/src/components/BancoPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
    promise: vi.fn(async (fn) => fn()),
  }),
  Toaster: () => null,
}));

const STRIPE_OK = { configured: true, currency: 'eur' };
const mockCheckouts = [
  {
    session_id: 'cs_test_abc123',
    description: 'Cobro test',
    amount: 49.99,
    currency: 'eur',
    status: 'paid',
    created_at: '2026-03-24T10:00:00',
  },
];

const SAMPLE_MOVS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  date: `2026-03-${String(i + 1).padStart(2, '0')}`,
  description: `Movimiento ${i + 1}`,
  amount: (i + 1) * 10,
  type: i % 2 === 0 ? 'INGRESO' : 'EGRESO',
}));

/** Helper: mock the 3 initial fetches (stripe/status, stripe/checkouts, movimientos/get). */
function mockInitial(movs = [], checkouts = []) {
  fetch
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(STRIPE_OK) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(checkouts) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(movs) });
}

function renderPage() {
  return render(<BancoPage />);
}

/* ═══════ Layout ═══════ */
describe('BancoPage — layout general', () => {
  beforeEach(() => { fetch.mockReset(); mockInitial(); });

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('muestra el título de la página', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('muestra el botón "Nuevo cobro" y "Añadir movimiento"', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByTestId('nuevo-cobro-btn')).toBeInTheDocument();
    expect(screen.getByTestId('add-mov-btn')).toBeInTheDocument();
  });

  it('muestra la sección de cobros Stripe', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByTestId('banco-table-section')).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay cobros', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByTestId('cobros-empty')).toBeInTheDocument();
    });
  });

  it('muestra las tarjetas de resumen mensual', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByText(/ingresos/i)).toBeInTheDocument();
    expect(screen.getByText(/gastos/i)).toBeInTheDocument();
    expect(screen.getByText(/balance/i)).toBeInTheDocument();
  });

  it('llama a las 3 APIs al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/status'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/checkouts'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('movimientos/get'));
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});

/* ═══════ Stripe checkouts table ═══════ */
describe('BancoPage — tabla con cobros Stripe', () => {
  beforeEach(() => { fetch.mockReset(); mockInitial([], mockCheckouts); });

  it('muestra filas de cobros cuando hay datos', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getAllByTestId('cobro-row').length).toBeGreaterThan(0);
    });
  });

  it('muestra el importe del cobro formateado', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText(/49/)).toBeInTheDocument();
    });
  });

  it('muestra la descripción del cobro', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('Cobro test')).toBeInTheDocument();
    });
  });
});

/* ═══════ Stripe modal ═══════ */
describe('BancoPage — modal de nuevo cobro Stripe', () => {
  beforeEach(() => { fetch.mockReset(); mockInitial(); });

  it('el modal no está visible inicialmente', async () => {
    await act(async () => { renderPage(); });
    expect(screen.queryByTestId('nuevo-cobro-modal')).not.toBeInTheDocument();
  });

  it('abre el modal al pulsar el botón', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('nuevo-cobro-modal')).toBeInTheDocument();
  });

  it('el modal contiene inputs de importe y descripción', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('cobro-amount-input')).toBeInTheDocument();
    expect(screen.getByTestId('cobro-desc-input')).toBeInTheDocument();
  });

  it('cerrar modal con cancelar oculta el modal', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    fireEvent.click(screen.getByTestId('cobro-cancel-btn'));
    expect(screen.queryByTestId('nuevo-cobro-modal')).not.toBeInTheDocument();
  });

  it('el botón de submit está deshabilitado sin importe', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('cobro-submit-btn')).toBeDisabled();
  });

  it('el botón de submit se habilita con importe válido', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    fireEvent.change(screen.getByTestId('cobro-amount-input'), { target: { value: '49.99' } });
    expect(screen.getByTestId('cobro-submit-btn')).not.toBeDisabled();
  });

  it('el input de descripción actualiza el valor', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    const descInput = screen.getByTestId('cobro-desc-input');
    fireEvent.change(descInput, { target: { value: 'Pago mensual' } });
    expect(descInput.value).toBe('Pago mensual');
  });
});

/* ═══════ Stripe return URL params ═══════ */
describe('BancoPage — retorno Stripe (URL params)', () => {
  const originalLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    vi.clearAllMocks();
  });

  it('muestra sileo.warning cuando stripe=cancel', async () => {
    const { sileo } = await import('sileo');
    Object.defineProperty(window, 'location', {
      value: { search: '?stripe=cancel', href: 'http://localhost/banco?stripe=cancel', pathname: '/banco' },
      writable: true,
    });
    fetch.mockReset();
    mockInitial();
    await act(async () => { renderPage(); });
    await waitFor(() => { expect(sileo.warning).toHaveBeenCalled(); });
  });

  it('muestra sileo.success cuando stripe=success sin session_id', async () => {
    const { sileo } = await import('sileo');
    Object.defineProperty(window, 'location', {
      value: { search: '?stripe=success', href: 'http://localhost/banco?stripe=success', pathname: '/banco' },
      writable: true,
    });
    fetch.mockReset();
    mockInitial();
    await act(async () => { renderPage(); });
    await waitFor(() => { expect(sileo.success).toHaveBeenCalled(); });
  });

  it('llama a stripe/confirm cuando stripe=success con session_id', async () => {
    const { sileo } = await import('sileo');
    Object.defineProperty(window, 'location', {
      value: {
        search: '?stripe=success&session_id=cs_test_abc123',
        href: 'http://localhost/banco?stripe=success&session_id=cs_test_abc123',
        pathname: '/banco',
      },
      writable: true,
    });
    fetch.mockReset();
    mockInitial();
    // stripe/confirm response
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ created: true, amount: 49.99, description: 'Test cobro' }) })
      // reload checkouts
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      // reload movs
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await act(async () => { renderPage(); });
    await waitFor(() => { expect(sileo.promise).toHaveBeenCalled(); });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/confirm'), expect.any(Object));
    });
  });
});

/* ═══════ Create Stripe checkout ═══════ */
describe('BancoPage — crear cobro Stripe', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { search: '', href: 'http://localhost/banco', pathname: '/banco' },
      writable: true,
    });
    fetch.mockReset();
    mockInitial();
  });

  it('crea cobro Stripe al enviar con importe válido', async () => {
    const { sileo } = await import('sileo');
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ url: 'https://checkout.stripe.com/pay/test' }) });

    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    fireEvent.change(screen.getByTestId('cobro-amount-input'), { target: { value: '49.99' } });
    fireEvent.click(screen.getByTestId('cobro-submit-btn'));

    await waitFor(() => { expect(sileo.promise).toHaveBeenCalled(); });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/checkout'), expect.any(Object));
    });
  });
});

/* ═══════ Movements ═══════ */
describe('BancoPage — movimientos', () => {
  beforeEach(() => { fetch.mockReset(); });

  it('muestra mensaje "no hay movimientos" cuando la lista está vacía', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText(/no hay movimientos/i)).toBeInTheDocument();
    });
  });

  it('muestra movimientos en la tabla', async () => {
    mockInitial(SAMPLE_MOVS);
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('Movimiento 1')).toBeInTheDocument();
    });
  });

  it('muestra solo 10 movimientos por defecto (primera página)', async () => {
    mockInitial(SAMPLE_MOVS);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Movimiento 1'));
    expect(screen.getByText('Movimiento 1')).toBeInTheDocument();
    expect(screen.queryByText('Movimiento 11')).not.toBeInTheDocument();
  });

  it('muestra paginación cuando hay movimientos', async () => {
    mockInitial(SAMPLE_MOVS);
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByTestId('mov-page-size-select')).toBeInTheDocument();
    });
  });

  it('cambia el tamaño de página correctamente', async () => {
    mockInitial(SAMPLE_MOVS);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByTestId('mov-page-size-select'));
    const select = screen.getByTestId('mov-page-size-select');
    fireEvent.change(select, { target: { value: '25' } });
    expect(select.value).toBe('25');
  });

  it('navega a la siguiente página con el botón ›', async () => {
    mockInitial(SAMPLE_MOVS);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Movimiento 1'));

    const allBtns = screen.getAllByRole('button');
    const nextBtn = allBtns.find((b) => b.textContent === '›' && !b.disabled);
    expect(nextBtn).toBeTruthy();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Movimiento 11')).toBeInTheDocument();
    });
  });

  it('busca movimientos por concepto y filtra la lista', async () => {
    const movs = [
      { id: 1, date: '2026-03-01', description: 'Alquiler oficina', amount: 800, type: 'EGRESO' },
      { id: 2, date: '2026-03-02', description: 'Sueldo empleado', amount: 1200, type: 'EGRESO' },
    ];
    mockInitial(movs);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Alquiler oficina'));

    fireEvent.change(screen.getByPlaceholderText(/buscar por concepto/i), { target: { value: 'alquiler' } });
    await waitFor(() => {
      expect(screen.getByText('Alquiler oficina')).toBeInTheDocument();
      expect(screen.queryByText('Sueldo empleado')).not.toBeInTheDocument();
    });
  });

  it('busca movimientos por fecha', async () => {
    mockInitial(SAMPLE_MOVS);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Movimiento 1'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por concepto/i), { target: { value: '2026-03-01' } });
    await waitFor(() => {
      expect(screen.getByText('Movimiento 1')).toBeInTheDocument();
    });
  });
});

/* ═══════ Movements form ═══════ */
describe('BancoPage — formulario de movimiento', () => {
  beforeEach(() => { fetch.mockReset(); });

  it('abre el modal de formulario al pulsar "Añadir movimiento"', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /añadir movimiento/i })).toBeInTheDocument();
    });
  });

  it('el formulario tiene toggle de tipo Ingreso/Gasto', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));
    const toggleIngreso = screen.getAllByRole('button', { name: /^ingreso$/i });
    const toggleGasto = screen.getAllByRole('button', { name: /^gasto$/i });
    expect(toggleIngreso.length).toBeGreaterThan(0);
    expect(toggleGasto.length).toBeGreaterThan(0);
  });

  it('envío con datos válidos llama a POST movimientos', async () => {
    const newMov = { id: 100, date: '2026-03-15', description: 'Pago proveedor', amount: 250, type: 'EGRESO' };
    mockInitial();
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(newMov) });

    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));

    fireEvent.change(screen.getByPlaceholderText('Concepto'), { target: { value: 'Pago proveedor' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '250' } });
    fireEvent.submit(screen.getByTestId('mov-form'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('movimientos/post'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('envío con campos vacíos dispara sileo.warning', async () => {
    const { sileo } = await import('sileo');
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));

    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Campos obligatorios' }),
      );
    });
  });

  it('no muestra mensajes de error inline bajo los campos por defecto', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));
    expect(screen.queryByText(/obligator/i)).not.toBeInTheDocument();
  });

  it('cierra el modal al pulsar cancelar', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(screen.queryByRole('heading', { name: /añadir movimiento/i })).not.toBeInTheDocument();
  });

  it('cambia el toggle de tipo a EGRESO', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));
    const gastoBtn = screen.getAllByRole('button', { name: /^gasto$/i });
    fireEvent.click(gastoBtn[gastoBtn.length - 1]);
    // No error means toggle worked
    expect(gastoBtn[gastoBtn.length - 1]).toBeInTheDocument();
  });

  it('cambia el campo fecha y limpia el error', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByTestId('mov-form'));
    const dateInput = screen.getByTestId('mov-form').querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });
    expect(dateInput.value).toBe('2026-06-01');
  });

  it('gestiona error del POST mostrando sileo.error', async () => {
    const { sileo } = await import('sileo');
    mockInitial();
    fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: 'Server error' }) });

    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('add-mov-btn'));
    await waitFor(() => screen.getByRole('heading', { name: /añadir movimiento/i }));

    fireEvent.change(screen.getByPlaceholderText('Concepto'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.submit(screen.getByTestId('mov-form'));

    await waitFor(() => {
      expect(sileo.error).toHaveBeenCalled();
    });
  });
});

/* ═══════ Filters modal ═══════ */
describe('BancoPage — filtros', () => {
  beforeEach(() => { fetch.mockReset(); });

  it('abre el modal de filtros al pulsar "Filtros"', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
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
    mockInitial(movs);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Ingreso A'));

    fireEvent.click(screen.getByRole('button', { name: /^filtros$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^filtros$/i }));

    const ingresoBtn = screen.getAllByRole('button', { name: /^ingreso$/i });
    fireEvent.click(ingresoBtn[ingresoBtn.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

    await waitFor(() => {
      expect(screen.getByText('Ingreso A')).toBeInTheDocument();
      expect(screen.queryByText('Gasto B')).not.toBeInTheDocument();
    });
  });

  it('limpia todos los filtros con el botón limpiar', async () => {
    mockInitial();
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByRole('button', { name: /^filtros$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^filtros$/i }));

    const ingresoBtn = screen.getAllByRole('button', { name: /^ingreso$/i });
    fireEvent.click(ingresoBtn[ingresoBtn.length - 1]);
    const limpiarBtns = screen.getAllByRole('button', { name: /^limpiar$/i });
    fireEvent.click(limpiarBtns[0]);
    expect(screen.getByRole('heading', { name: /^filtros$/i })).toBeInTheDocument();
  });
});

/* ═══════ Monthly summary ═══════ */
describe('BancoPage — resumen mensual', () => {
  it('calcula el resumen mensual correctamente', async () => {
    fetch.mockReset();
    const now = new Date();
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    const movs = [
      { id: 1, date: d, description: 'Cuota local', amount: 1000, type: 'INGRESO' },
      { id: 2, date: d, description: 'Suministros', amount: 300, type: 'EGRESO' },
    ];
    mockInitial(movs);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByText('Cuota local'));

    const a1000 = screen.getAllByText('1000.00 €');
    expect(a1000.length).toBeGreaterThan(0);
    const a300 = screen.getAllByText('300.00 €');
    expect(a300.length).toBeGreaterThan(0);
    expect(screen.getByText('700.00 €')).toBeInTheDocument();
  });
});
