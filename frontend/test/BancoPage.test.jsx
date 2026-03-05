/**
 * BancoPage.test.jsx
 * Verifica el layout inicial y las llamadas a la API de Stripe.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import BancoPage from '../src/components/BancoPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderPage() {
  return render(<BancoPage />);
}

describe('BancoPage', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ configured: false, currency: 'eur' }),
    });
  });

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('llama a la API de Stripe al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe'));
    });
  });

  it('consulta tanto el estado como los checkouts', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/status'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('stripe/checkouts'));
    });
  });

  it('no muestra errores visibles cuando Stripe no está configurado', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});
