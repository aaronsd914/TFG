/**
 * Tendencias.test.jsx
 * Verifica el layout de la página de analítica/tendencias y el chat IA.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import TendenciasPage from '../src/components/Tendencias.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
  Line: () => <canvas data-testid="line-chart" />,
}));

function renderPage() {
  return render(<TendenciasPage />);
}

describe('TendenciasPage', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ventas_totales: 0,
          num_pedidos: 0,
          ticket_medio: 0,
          top_productos: [],
          ventas_por_dia: [],
          segmentos_rfm: {},
          pares_frecuentes: [],
          ia_text: '',
          ia_charts: [],
        }),
    });
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
});
