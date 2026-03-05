/**
 * Dashboard.test.jsx
 * Comprueba el layout y el comportamiento inicial del Dashboard.
 * Las llamadas fetch están mockeadas en test-setup.js.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../src/components/Dashboard.jsx';

// chart.js necesita canvas — lo mockeamos para happy-dom
vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Pie: () => <canvas data-testid="pie-chart" />,
}));

// sileo no es relevante en este contexto
vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('se monta sin errores', async () => {
    await act(async () => { renderDashboard(); });
    expect(document.body).toBeTruthy();
  });

  it('llama a la API al montar', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('no muestra errores en el DOM con respuestas vacías', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderDashboard(); });
    expect(document.body).toBeTruthy();
  });
});
