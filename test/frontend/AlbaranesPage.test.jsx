/**
 * AlbaranesPage.test.jsx
 * Verifica el layout inicial, llamadas a la API y comportamiento básico.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlbaranesPage from '../../frontend/src/components/AlbaranesPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

const ALBARAN = {
  id: 1,
  date: '2026-01-15',
  description: 'Test',
  total: 50.0,
  status: 'FIANZA',
  customer_id: 1,
  lineas: [],
};

const CLIENTE = {
  id: 1,
  name: 'Ana',
  surnames: 'García',
  email: 'ana@test.com',
  dni: '12345678A',
  phone1: '600000000',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AlbaranesPage />
    </MemoryRouter>
  );
}

describe('AlbaranesPage', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
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

  it('muestra el encabezado de la página', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/albar/i)).toBeInTheDocument();
    });
  });

  it('no muestra errores visibles con respuestas vacías', async () => {
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

describe('AlbaranesPage – modal de edición', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (url.includes(`albaranes/get/${ALBARAN.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN }) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('muestra el botón Editar al abrir el detalle', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('#1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('albaran-edit-btn')).toBeInTheDocument();
    });
  });

  it('abre el modal de edición al pulsar Editar', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('#1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('albaran-edit-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('albaran-edit-btn'));
    });

    expect(screen.getByTestId('albaran-edit-save-btn')).toBeInTheDocument();
  });

  it('guarda los cambios y cierra el modal de edición', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN, description: 'Nueva desc' }) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (url.includes(`albaranes/get/${ALBARAN.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN }) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => expect(screen.getByTestId('albaran-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-edit-btn')); });
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-edit-save-btn')); });

    await waitFor(() => {
      expect(screen.queryByTestId('albaran-edit-save-btn')).not.toBeInTheDocument();
    });
  });
});
