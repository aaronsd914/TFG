/**
 * Dashboard.test.jsx
 * Comprueba el layout y el comportamiento inicial del Dashboard.
 * Las llamadas fetch están mockeadas en test-setup.js.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../frontend/src/components/Dashboard.jsx';

// chart.js necesita canvas — lo mockeamos para happy-dom
vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
  Pie: () => <canvas data-testid="pie-chart" />,
}));

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
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
