/**
 * IncidenciasPage.test.jsx
 * Tests unitarios para la pÃ¡gina de incidencias.
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

const CLIENTE = { id: 1, name: 'Ana', surnames: 'GarcÃ­a', email: 'ana@test.com', phone1: '600000001', dni: '12345678A' };
const ALBARAN_ENTREGADO = {
  id: 5, date: '2026-01-10', description: 'Entregado', total: 100.0,
  status: 'ENTREGADO', customer_id: 1, items: [],
};
const INCIDENCIA = {
  id: 1, albaran_id: 5, descripcion: 'Grieta en la madera', fecha_creacion: '2026-01-15',
};

function mockFull() {
  fetch.mockImplementation((url) => {
    if (/incidencias\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([INCIDENCIA]) });
    if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
    if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });
}

function mockEmpty() {
  fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <IncidenciasPage />
    </MemoryRouter>
  );
}

// â”€â”€ Suite 1: carga bÃ¡sica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('IncidenciasPage â€“ carga bÃ¡sica', () => {
  beforeEach(mockEmpty);

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('muestra el tÃ­tulo de la pÃ¡gina', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  it('muestra el botÃ³n de crear incidencia', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('create-incidencia-btn')).toBeInTheDocument();
    });
  });

  it('muestra "sin resultados" con lista vacÃ­a', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument();
    });
  });
});

// â”€â”€ Suite 2: lista de incidencias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('IncidenciasPage â€“ lista de incidencias', () => {
  beforeEach(mockFull);

  it('muestra la incidencia en la lista', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('incidencia-row')).toBeInTheDocument();
    });
  });

  it('muestra la descripciÃ³n de la incidencia', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Grieta en la madera')).toBeInTheDocument();
    });
  });

  it('no muestra el ID de la incidencia en la tabla', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });

  it('filtra por nombre de cliente con el buscador', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-search')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('incidencias-search'), { target: { value: 'Ana GarcÃ­a' } });
    await waitFor(() => {
      expect(screen.getByTestId('incidencia-row')).toBeInTheDocument();
    });
  });

  it('filtrar por texto inexistente devuelve vacÃ­o', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-search')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('incidencias-search'), { target: { value: 'xxxxxinexistente' } });
    await waitFor(() => {
      expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument();
    });
  });
});

// â”€â”€ Suite 3: modal de creaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('IncidenciasPage â€“ modal de creaciÃ³n', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/incidencias\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
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

  it('muestra el buscador de albarÃ¡n con el input', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await waitFor(() => expect(screen.getByTestId('create-albaran-search')).toBeInTheDocument());
    expect(screen.getByTestId('create-albaran-search')).toBeInTheDocument();
  });

  it('al enfocar el buscador muestra sugerencias', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await waitFor(() => expect(screen.getByTestId('create-albaran-search')).toBeInTheDocument());
    await act(async () => { fireEvent.focus(screen.getByTestId('create-albaran-search')); });
    await waitFor(() => expect(screen.getByTestId('albaran-suggestions')).toBeInTheDocument());
  });

  it('seleccionar una sugerencia fija el albarÃ¡n', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await waitFor(() => expect(screen.getByTestId('create-albaran-search')).toBeInTheDocument());
    await act(async () => { fireEvent.focus(screen.getByTestId('create-albaran-search')); });
    await waitFor(() => expect(screen.getByTestId('albaran-suggestions')).toBeInTheDocument());
    await act(async () => {
      fireEvent.mouseDown(screen.getAllByTestId('albaran-suggestion-item')[0]);
    });
    expect(screen.getByTestId('create-albaran-search').value).toContain('#5');
  });

  it('sin campos rellenos llama a sileo.error', async () => {
    const { sileo } = await import('sileo');
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await waitFor(() => expect(screen.getByTestId('create-submit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-submit-btn')); });
    expect(sileo.error).toHaveBeenCalled();
  });

  it('llama a la API al enviar el formulario correctamente', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'POST' && url.includes('incidencias/post')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...INCIDENCIA }) });
      }
      if (/incidencias\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencias-empty')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('create-incidencia-btn')); });
    await waitFor(() => expect(screen.getByTestId('create-albaran-search')).toBeInTheDocument());
    // Select albaran from suggestions
    await act(async () => { fireEvent.focus(screen.getByTestId('create-albaran-search')); });
    await waitFor(() => expect(screen.getByTestId('albaran-suggestions')).toBeInTheDocument());
    await act(async () => { fireEvent.mouseDown(screen.getAllByTestId('albaran-suggestion-item')[0]); });
    // Fill description
    fireEvent.change(screen.getByTestId('create-descripcion-input'), {
      target: { value: 'DaÃ±o visible en el mueble' },
    });
    await act(async () => { fireEvent.click(screen.getByTestId('create-submit-btn')); });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('incidencias/post'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// â”€â”€ Suite 4: modal de detalle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('IncidenciasPage â€“ modal de detalle', () => {
  beforeEach(mockFull);

  it('al clicar en una fila abre el modal de detalle', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    expect(screen.getByTestId('detail-incidencia-modal')).toBeInTheDocument();
  });

  it('el modal de detalle muestra la descripciÃ³n de la incidencia', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-incidencia-modal')).toBeInTheDocument());
    expect(screen.getAllByText('Grieta en la madera').length).toBeGreaterThan(0);
  });

  it('el modal de detalle muestra el nombre del cliente', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-incidencia-modal')).toBeInTheDocument());
    expect(screen.getAllByText('Ana GarcÃ­a').length).toBeGreaterThan(0);
  });

  it('el modal de detalle muestra los botones de navegaciÃ³n', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-incidencia-modal')).toBeInTheDocument());
    expect(screen.getByTestId('detail-go-albaran-btn')).toBeInTheDocument();
    expect(screen.getByTestId('detail-go-cliente-btn')).toBeInTheDocument();
  });

  it('el modal de detalle tiene el botÃ³n de eliminar', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-delete-btn')).toBeInTheDocument());
    expect(screen.getByTestId('detail-delete-btn')).toBeInTheDocument();
  });
});

// â”€â”€ Suite 5: borrado de incidencias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('IncidenciasPage â€“ borrado', () => {
  beforeEach(mockFull);

  it('al pulsar eliminar en el detalle aparece la confirmaciÃ³n', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-delete-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('detail-delete-btn')); });
    expect(screen.getByTestId('delete-confirm-btn')).toBeInTheDocument();
  });

  it('confirmar borrado llama a la API DELETE', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (/incidencias\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([INCIDENCIA]) });
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_ENTREGADO]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-delete-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('detail-delete-btn')); });
    await act(async () => { fireEvent.click(screen.getByTestId('delete-confirm-btn')); });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('incidencias/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('cancelar la confirmaciÃ³n no llama a la API DELETE', async () => {    fetch.mockClear();    renderPage();
    await waitFor(() => expect(screen.getByTestId('incidencia-row')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('incidencia-row')); });
    await waitFor(() => expect(screen.getByTestId('detail-delete-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('detail-delete-btn')); });
    // Cancel by clicking the first button that says Cancelar
    const cancelBtns = screen.getAllByRole('button', { name: /cancel/i });
    await act(async () => { fireEvent.click(cancelBtns[cancelBtns.length - 1]); });
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('incidencias/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// â”€â”€ Suite 6: Dashboard renderizado bÃ¡sico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('Dashboard â€“ renderizado bÃ¡sico', () => {
  it('el Dashboard se monta sin errores desde IncidenciasPage', async () => {
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
    expect(document.body).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
