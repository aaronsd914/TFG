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

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
