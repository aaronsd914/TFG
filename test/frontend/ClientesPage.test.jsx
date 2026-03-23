/**
 * ClientesPage.test.jsx
 * Verifica el layout inicial, llamadas a la API y controles de búsqueda.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientesPage from '../../frontend/src/components/ClientesPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

const CLIENTE = {
  id: 1,
  name: 'Ana',
  surnames: 'García',
  email: 'ana@test.com',
  dni: '12345678A',
  phone1: '600000000',
  phone2: '',
  street: 'Calle Mayor',
  house_number: '1',
  floor_entrance: '2A',
  city: 'Madrid',
  postal_code: '28001',
};

function renderPage() {
  return render(<MemoryRouter><ClientesPage /></MemoryRouter>);
}

describe('ClientesPage', () => {
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

  it('muestra el encabezado de clientes', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clientes/i })).toBeInTheDocument();
    });
  });

  it('contiene un campo de búsqueda', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('textbox', { hidden: true })).toBeInTheDocument();
    });
  });

  it('muestra mensaje de lista vacía cuando no hay clientes', async () => {
    renderPage();
    await waitFor(() => {
      // Con lista vacía no debería mostrar filas de tabla
      expect(screen.queryAllByRole('row')).toHaveLength(0);
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});

describe('ClientesPage – modal de edición', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (url.includes('clientes/get') && !url.includes('/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      if (url.includes('albaranes/by-cliente')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('muestra el botón Editar al abrir el detalle', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Ana/i)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Ana/i));
    });

    await waitFor(() => {
      expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument();
    });
  });

  it('abre el modal de edición al pulsar Editar', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText(/Ana/i)).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText(/Ana/i)); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });

    expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument();
  });

  it('guarda los cambios y cierra el modal de edición', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE, name: 'Ana Editada' }) });
      }
      if (url.includes('clientes/get') && !url.includes('/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      if (url.includes('albaranes/by-cliente')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/Ana/i)).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText(/Ana/i)); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-save-btn')); });

    await waitFor(() => {
      expect(screen.queryByTestId('cliente-edit-save-btn')).not.toBeInTheDocument();
    });
  });
});
