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

  it('muestra los KPIs cuando hay datos de resumen', async () => {
    const summaryWithData = {
      metrics: {
        range: { from: '2026-01-01', to: '2026-01-31' },
        averages: { revenue: 2500, orders: 10, aov: 250, avg_per_customer: 125 },
        sales_by_day: [],
        top_products: [],
        basket_pairs: [],
        rfm: { summary: {} },
      },
      ai_report: 'Informe de prueba.',
    };
    fetch.mockImplementation((url) => {
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(summaryWithData) });
    });
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('Ingresos')).toBeInTheDocument();
      expect(screen.getByText('Pedidos')).toBeInTheDocument();
      expect(screen.getByText('AOV')).toBeInTheDocument();
    });
  });

  it('el botón "7 días" cambia el rango y vuelve a llamar la API', async () => {
    fetch.mockImplementation(mockFetchNoPrediction);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /7 días/i }));

    const callsBefore = fetch.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /7 días/i }));
    });
    await waitFor(() => {
      expect(fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('el botón "30 días" cambia el rango y el componente sigue cargando', async () => {
    fetch.mockImplementation(mockFetchNoPrediction);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /30 días/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /30 días/i }));
    });

    // Component should still be mounted after the range change
    expect(screen.getByRole('heading', { name: /tendencias/i })).toBeInTheDocument();
  });

  it('el botón "90 días" cambia el rango y vuelve a llamar la API', async () => {
    fetch.mockImplementation(mockFetchNoPrediction);
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /90 días/i }));

    const callsBefore = fetch.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /90 días/i }));
    });
    await waitFor(() => {
      expect(fetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('activar el checkbox "Comparar" dispara la petición de comparativa', async () => {
    const compareResponse = {
      delta: {
        revenue: { current: 2500, prev: 2000, abs: 500, pct: 25 },
        orders: { current: 10, prev: 8, abs: 2, pct: 25 },
        aov: { current: 250, prev: 250, abs: 0, pct: 0 },
      },
      ai_compare_report: null,
    };
    fetch.mockImplementation((url) => {
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      if (url.includes('compare')) return Promise.resolve({ ok: true, json: () => Promise.resolve(compareResponse) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByLabelText(/comparar periodo anterior/i));

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/comparar periodo anterior/i));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('compare'), expect.any(Object));
    });
  });

  it('el chat IA envía el mensaje y muestra la respuesta', async () => {
    fetch.mockImplementation((url, opts) => {
      if (url.includes('ai/chat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ answer: 'Respuesta de prueba' }) });
      }
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    await act(async () => { renderPage(); });
    // Open chat
    await waitFor(() => screen.getByRole('button', { name: /asistente ia/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /asistente ia/i }));
    });
    await waitFor(() => screen.getByPlaceholderText(/pregunta sobre ventas/i));

    // Type a message
    const chatInput = screen.getByPlaceholderText(/pregunta sobre ventas/i);
    fireEvent.change(chatInput, { target: { value: '¿Cuál es mi producto top?' } });

    // Submit via form submit (press Enter / submit the form)
    fireEvent.submit(chatInput.closest('form'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ai/chat'), expect.any(Object));
    });
    await waitFor(() => {
      expect(screen.getByText('Respuesta de prueba')).toBeInTheDocument();
    });
  });

  it('el botón "Exportar análisis" llama a la API de exportación', async () => {
    // Mock blob response for PDF export
    fetch.mockImplementation((url) => {
      if (url.includes('export/pdf')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' })),
        });
      }
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    // Mock URL methods to avoid download side-effects
    const origCreateObjectURL = window.URL.createObjectURL;
    const origRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();

    try {
      await act(async () => { renderPage(); });
      await waitFor(() => screen.getByRole('button', { name: /exportar análisis/i }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /exportar análisis/i }));
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('export/pdf'));
      });
    } finally {
      window.URL.createObjectURL = origCreateObjectURL;
      window.URL.revokeObjectURL = origRevokeObjectURL;
    }
  });

  it('muestra el informe IA cuando hay ai_report', async () => {
    const summaryWithReport = {
      ...SUMMARY_RESPONSE,
      ai_report: 'Análisis del periodo: ventas en aumento.',
    };
    fetch.mockImplementation((url) => {
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(summaryWithReport) });
    });

    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText(/ventas en aumento/i)).toBeInTheDocument();
    });
  });

  it('el botón reiniciar conversación limpia el chat', async () => {
    fetch.mockImplementation(mockFetchNoPrediction);
    await act(async () => { renderPage(); });

    // Open chat
    await waitFor(() => screen.getByRole('button', { name: /asistente ia/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /asistente ia/i }));
    });
    // The reset button uses t('trends.restartBtn') = 'Reiniciar' as text
    await waitFor(() => screen.getByRole('button', { name: /^reiniciar$/i }));

    // Click reset
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^reiniciar$/i }));
    });

    // Chat should still be open with greeting
    expect(screen.getByPlaceholderText(/pregunta sobre ventas/i)).toBeInTheDocument();
  });

  it('renderiza tabla markdown en la respuesta del chat', async () => {
    const tableContent = 'Resumen:\n| Producto | Unidades |\n| --- | --- |\n| Silla | 10 |\n| Mesa | 5 |';
    fetch.mockImplementation((url, opts) => {
      if (url.includes('ai/chat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ answer: tableContent }) });
      }
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /asistente ia/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /asistente ia/i })); });
    await waitFor(() => screen.getByPlaceholderText(/pregunta sobre ventas/i));

    const chatInput = screen.getByPlaceholderText(/pregunta sobre ventas/i);
    await act(async () => { fireEvent.change(chatInput, { target: { value: '¿Tabla de ventas?' } }); });
    await act(async () => { fireEvent.submit(chatInput.closest('form')); });

    await waitFor(() => {
      // MarkdownTable renders a <table>; body should contain Silla and Mesa
      expect(document.body.textContent).toMatch(/Silla/);
      expect(document.body.textContent).toMatch(/Mesa/);
    }, { timeout: 5000 });
  });

  it('renderiza gráfico de barras en la respuesta del chat (bloque json)', async () => {
    const chartFence = '```json\n{"charts": [{"type": "bar", "title": "Ventas mensuales", "data": {"labels": ["Ene", "Feb"], "datasets": [{"label": "Ingresos", "data": [1000, 1200]}]}}]}\n```';
    fetch.mockImplementation((url, opts) => {
      if (url.includes('ai/chat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ answer: chartFence }) });
      }
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /asistente ia/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /asistente ia/i })); });
    await waitFor(() => screen.getByPlaceholderText(/pregunta sobre ventas/i));

    const chatInput = screen.getByPlaceholderText(/pregunta sobre ventas/i);
    await act(async () => { fireEvent.change(chatInput, { target: { value: '¿Dame un gráfico?' } }); });
    await act(async () => { fireEvent.submit(chatInput.closest('form')); });

    await waitFor(() => {
      // ChartBlock renders the chart title "Ventas mensuales" in a div
      expect(document.body.textContent).toMatch(/Ventas mensuales/);
    }, { timeout: 5000 });
  });

  it('muestra la tabla RowDelta cuando hay datos de comparativa', async () => {
    const compareResponse = {
      delta: {
        revenue: { current: 3000, previous: 2500, diff: 500, pct: '20%' },
        orders: { current: 12, previous: 10, diff: 2, pct: '20%' },
        aov: { current: 250, previous: 250, diff: 0, pct: '0%' },
      },
      ai_compare_report: null,
    };
    fetch.mockImplementation((url) => {
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      if (url.includes('compare')) return Promise.resolve({ ok: true, json: () => Promise.resolve(compareResponse) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByLabelText(/comparar periodo anterior/i));
    await act(async () => { fireEvent.click(screen.getByLabelText(/comparar periodo anterior/i)); });

    await waitFor(() => {
      expect(screen.getByText('Comparativa')).toBeInTheDocument();
      expect(screen.getByText('Anterior')).toBeInTheDocument();
    });
  });

  it('renderiza el informe IA de comparativa cuando está disponible', async () => {
    const compareWithReport = {
      delta: {
        revenue: { current: 3000, previous: 2500, diff: 500, pct: '20%' },
        orders: { current: 12, previous: 10, diff: 2, pct: '20%' },
        aov: { current: 250, previous: 250, diff: 0, pct: '0%' },
      },
      ai_compare_report: 'Las ventas han aumentado significativamente este mes.',
    };
    fetch.mockImplementation((url) => {
      if (url.includes('predict')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ historical: [], forecast: [], method: 'insufficient_data', n_months: 3, alpha: 0.3, beta: 0.1 }) });
      if (url.includes('compare')) return Promise.resolve({ ok: true, json: () => Promise.resolve(compareWithReport) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(SUMMARY_RESPONSE) });
    });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByLabelText(/comparar periodo anterior/i));
    await act(async () => { fireEvent.click(screen.getByLabelText(/comparar periodo anterior/i)); });

    await waitFor(() => {
      expect(screen.getByText('Las ventas han aumentado significativamente este mes.')).toBeInTheDocument();
    });
  });
});
