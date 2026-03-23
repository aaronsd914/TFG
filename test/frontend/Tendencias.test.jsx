/**
 * Tendencias.test.jsx
 * Verifica el layout de la página de analítica/tendencias y el chat IA.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import TendenciasPage from '../../frontend/src/components/Tendencias.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(), show: vi.fn(), dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
  Line: () => <canvas data-testid="line-chart" />,
}));

const SUMMARY_RESPONSE = {
  metrics: {
    range: { from: '2026-01-01', to: '2026-01-31' },
    averages: { revenue: 0, orders: 0, aov: 0, avg_per_customer: 0 },
    sales_by_day: [],
    top_products: [],
    basket_pairs: [],
    rfm: { summary: {} },
  },
  ai_report: 'Informe de prueba.',
};

const PREDICT_RESPONSE = {
  historical: [
    { month: '2025-12', orders: 5, revenue: 1200 },
    { month: '2026-01', orders: 8, revenue: 1800 },
  ],
  forecast: [
    { month: '2026-02', predicted_revenue: 1900.0, lower_80: 1500.0, upper_80: 2300.0 },
    { month: '2026-03', predicted_revenue: 1980.0, lower_80: 1550.0, upper_80: 2410.0 },
    { month: '2026-04', predicted_revenue: 2060.0, lower_80: 1600.0, upper_80: 2520.0 },
  ],
  method: 'holt_double_exponential_smoothing',
  n_months: 3,
  alpha: 0.3,
  beta: 0.1,
};

function mockFetch(url) {
  if (typeof url === 'string' && url.includes('predict')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(PREDICT_RESPONSE) });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
}

function mockFetchNoPrediction(url) {
  if (typeof url === 'string' && url.includes('predict')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
}

function renderPage() {
  return render(<TendenciasPage />);
}

describe('TendenciasPage', () => {
  beforeEach(() => {
    // Default: no prediction data (avoids chart rendering issues in chat tests)
    fetch.mockImplementation(mockFetchNoPrediction);
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

  it('muestra el título "Tendencias"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tendencias/i })).toBeInTheDocument();
    });
  });

  it('muestra el botón del asistente IA', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asistente ia/i })).toBeInTheDocument();
    });
  });

  it('muestra el mensaje de bienvenida del chat', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asistente ia/i })).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /asistente ia/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/puedes preguntarme/i)).toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('muestra la sección de previsión cuando hay datos de forecast', async () => {
    fetch.mockImplementation(mockFetch);
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByTestId('prediction-section')).toBeInTheDocument();
    });
  });

  it('muestra las filas del forecast con los meses correctos', async () => {
    fetch.mockImplementation(mockFetch);
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('2026-02')).toBeInTheDocument();
      expect(screen.getByText('2026-03')).toBeInTheDocument();
      expect(screen.getByText('2026-04')).toBeInTheDocument();
    });
  });
});
