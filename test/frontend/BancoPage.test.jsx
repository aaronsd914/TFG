/**
 * BancoPage.test.jsx
 * Tests the new BancoPage layout: charges table + "Nuevo cobro" modal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import BancoPage from '../../frontend/src/components/BancoPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
    promise: vi.fn(async (fn) => fn()),
  }),
  Toaster: () => null,
}));

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

function renderPage() {
  return render(<BancoPage />);
}

describe('BancoPage — layout general', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
  });

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('muestra el título de la página', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('muestra el botón "Nuevo cobro"', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByTestId('nuevo-cobro-btn')).toBeInTheDocument();
  });

  it('no muestra el botón de refrescar', async () => {
    await act(async () => { renderPage(); });
    expect(screen.queryByText(/refrescar/i)).not.toBeInTheDocument();
  });

  it('no muestra la card de estado de Stripe', async () => {
    await act(async () => { renderPage(); });
    expect(screen.queryByText(/configurado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/estado stripe/i)).not.toBeInTheDocument();
  });

  it('muestra la sección de cobros', async () => {
    await act(async () => { renderPage(); });
    expect(screen.getByTestId('banco-table-section')).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay cobros', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByTestId('cobros-empty')).toBeInTheDocument();
    });
  });

  it('llama a stripe/status y stripe/checkouts al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/status'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/checkouts'));
    });
  });
});

describe('BancoPage — tabla con cobros', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCheckouts) });
  });

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

describe('BancoPage — modal de nuevo cobro', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
  });

  it('el modal no está visible inicialmente', async () => {
    await act(async () => { renderPage(); });
    expect(screen.queryByTestId('nuevo-cobro-modal')).not.toBeInTheDocument();
  });

  it('abre el modal al pulsar el botón', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('nuevo-cobro-modal')).toBeInTheDocument();
  });

  it('el modal contiene el input de importe', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('cobro-amount-input')).toBeInTheDocument();
  });

  it('el modal contiene el input de descripción', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('cobro-desc-input')).toBeInTheDocument();
  });

  it('cerrar modal con cancelar oculta el modal', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    expect(screen.getByTestId('nuevo-cobro-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cobro-cancel-btn'));
    expect(screen.queryByTestId('nuevo-cobro-modal')).not.toBeInTheDocument();
  });

  it('el botón de submit está deshabilitado sin importe', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));
    const submitBtn = screen.getByTestId('cobro-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('el botón de submit se habilita cuando se rellena el importe (stripe configurado)', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));

    const amountInput = screen.getByTestId('cobro-amount-input');
    fireEvent.change(amountInput, { target: { value: '49.99' } });

    const submitBtn = screen.getByTestId('cobro-submit-btn');
    expect(submitBtn).not.toBeDisabled();
  });

  it('el input de descripción actualiza el valor', async () => {
    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));

    const descInput = screen.getByTestId('cobro-desc-input');
    fireEvent.change(descInput, { target: { value: 'Pago mensual' } });
    expect(descInput.value).toBe('Pago mensual');
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});

describe('BancoPage — retorno Stripe (URL params)', () => {
  const originalLocation = window.location;

  afterEach(() => {
    // Restore location after each test
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    vi.clearAllMocks();
  });

  it('muestra sileo.warning cuando stripe=cancel en la URL', async () => {
    const { sileo } = await import('sileo');
    Object.defineProperty(window, 'location', {
      value: { search: '?stripe=cancel', href: 'http://localhost/banco?stripe=cancel', pathname: '/banco' },
      writable: true,
    });

    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });

    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalled();
    });
  });

  it('muestra sileo.success cuando stripe=success sin session_id', async () => {
    const { sileo } = await import('sileo');
    Object.defineProperty(window, 'location', {
      value: { search: '?stripe=success', href: 'http://localhost/banco?stripe=success', pathname: '/banco' },
      writable: true,
    });

    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });

    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
    });
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

    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      // stripe/confirm call (inside sileo.promise → fn())
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ created: true, amount: 49.99, description: 'Test cobro' }),
      })
      // reload checkouts after confirm
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });

    await waitFor(() => {
      expect(sileo.promise).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('stripe/confirm'),
        expect.any(Object),
      );
    });
  });
});

describe('BancoPage — crear cobro Stripe', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { search: '', href: 'http://localhost/banco', pathname: '/banco' },
      writable: true,
    });
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ configured: true, currency: 'eur' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
  });

  it('crea cobro Stripe al pulsar el botón de envío con importe válido', async () => {
    const { sileo } = await import('sileo');
    fetch
      // stripe/checkout call (inside sileo.promise → fn())
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/pay/test' }),
      });

    await act(async () => { renderPage(); });
    fireEvent.click(screen.getByTestId('nuevo-cobro-btn'));

    const amountInput = screen.getByTestId('cobro-amount-input');
    fireEvent.change(amountInput, { target: { value: '49.99' } });

    const submitBtn = screen.getByTestId('cobro-submit-btn');
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sileo.promise).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('stripe/checkout'),
        expect.any(Object),
      );
    });
  });
});
