/**
 * IncidenciasPage.test.jsx
 * Tests unitarios para la página de incidencias.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IncidenciasPage from '../../frontend/src/components/IncidenciasPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

const CLIENTE = { id: 1, name: 'Ana', surnames: 'García', email: 'ana@test.com', dni: '12345678A' };
const ALBARAN_ENTREGADO = {
  id: 5, date: '2026-01-10', description: 'Entregado', total: 100.0,
  status: 'ENTREGADO', customer_id: 1, items: [],
};
const INCIDENCIA = {
  id: 1, albaran_id: 5, descripcion: 'Grieta en la madera', fecha_creacion: '2026-01-15',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <IncidenciasPage />
    </MemoryRouter>
  );
}

// ── Suite 1: carga básica ──────────────────────────────────────────────────────
describe('IncidenciasPage – carga básica', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
  });

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('muestra el título de la página', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  it('muestra el botón de crear incidencia', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('create-incidencia-btn')).toBeInTheDocument();
    });
  });

  it('muestra "sin resultados" con lista vacía', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument();
    });
  });
});

// ── Suite 2: lista de incidencias ─────────────────────────────────────────────
describe('IncidenciasPage – lista de incidencias', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/incidencias\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([INCIDENCIA]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('muestra la incidencia en la lista', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('incidencia-row')).toBeInTheDocument();
    });
  });

  it('muestra la descripción de la incidencia', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Grieta en la madera')).toBeInTheDocument();
    });
  });

  it('filtra por descripción con el buscador', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-search')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('incidencias-search'), { target: { value: 'inexistente_xyz' } });
    await waitFor(() => {
      expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument();
    });
  });
});

// ── Suite 3: modal de creación ─────────────────────────────────────────────────
describe('IncidenciasPage – modal de creación', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/incidencias\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('abre el modal al pulsar "Nueva incidencia"', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('create-incidencia-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    expect(screen.getByTestId('create-incidencia-modal')).toBeInTheDocument();
  });

  it('cierra el modal al pulsar Cancelar', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('create-incidencia-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await act(async () => { fireEvent.click(screen.getByTestId('create-cancel-btn')); });
    await waitFor(() => {
      expect(screen.queryByTestId('create-incidencia-modal')).not.toBeInTheDocument();
    });
  });

  it('muestra el selector de albarán con los entregados', async () => {
    renderPage();
    // Wait for initial load to finish (empty state = loading:false)
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await waitFor(() => expect(screen.getByTestId('create-albaran-select')).toBeInTheDocument());
    expect(screen.getByTestId('create-albaran-select')).toBeInTheDocument();
  });

  it('llama a la API al enviar el formulario', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'POST' && url.includes('incidencias/post')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...INCIDENCIA }) });
      }
      if (/incidencias\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderPage();
    // Wait for initial load (empty state = loading:false, entregados populated)
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    // Albaran select must appear (entregados > 0)
    await waitFor(() => expect(screen.getByTestId('create-albaran-select')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('create-descripcion-input'), {
      target: { value: 'Daño visible en el mueble' },
    });
    await act(async () => { fireEvent.click(screen.getByTestId('create-submit-btn')); });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('incidencias/post'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ── Suite 4: Dashboard incidencias ────────────────────────────────────────────
describe('Dashboard – sección incidencias', () => {
  it('la sección de incidencias está en la página', async () => {
    // Quick smoke test: el componente Dashboard debería tener la sección
    const { default: Dashboard } = await import('../../frontend/src/components/Dashboard.jsx');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-incidencias-section')).toBeInTheDocument();
    });
  });
});

// ── Suite 5: borrado de incidencias ───────────────────────────────────────────────
describe('IncidenciasPage – borrado', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/incidencias\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([INCIDENCIA]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('muestra el botón de borrar en cada fila', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('delete-incidencia-btn')).toBeInTheDocument());
    expect(screen.getByTestId('delete-incidencia-btn')).toBeInTheDocument();
  });

  it('al pulsar borrar aparece el modal de confirmación', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('delete-incidencia-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('delete-incidencia-btn')); });
    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();
  });

  it('confirmar borrado llama a la API DELETE', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      if (/incidencias\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([INCIDENCIA]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('delete-incidencia-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('delete-incidencia-btn')); });
    await act(async () => { fireEvent.click(screen.getByTestId('delete-confirm-btn')); });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('incidencias/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
