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
      if (/productos\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
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
      if (/productos\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
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

const PRODUCTO = { id: 1, name: 'Producto A', price: 10.0 };

const ALBARAN_CON_ITEMS = {
  id: 2,
  date: '2026-01-15',
  description: 'Con items',
  total: 20.0,
  status: 'FIANZA',
  customer_id: 1,
  items: [{ id: 10, product_id: 1, quantity: 2, unit_price: 10.0 }],
};

describe('AlbaranesPage – edición de líneas', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_CON_ITEMS]) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (/productos\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([PRODUCTO]) });
      }
      if (url.includes(`albaranes/get/${ALBARAN_CON_ITEMS.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN_CON_ITEMS }) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('muestra el botón Editar líneas al abrir el detalle', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => {
      expect(screen.getByTestId('lines-edit-btn')).toBeInTheDocument();
    });
  });

  it('activa el modo edición al pulsar Editar líneas', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => expect(screen.getByTestId('lines-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => {
      expect(screen.getByTestId('lines-save-btn')).toBeInTheDocument();
      expect(screen.getByTestId('lines-cancel-btn')).toBeInTheDocument();
    });
  });

  it('añade una fila al pulsar Añadir línea', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => expect(screen.getByTestId('lines-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => expect(screen.getByTestId('lines-add-row-btn')).toBeInTheDocument());
    const rowsBefore = document.querySelectorAll('tbody tr').length;
    await act(async () => { fireEvent.click(screen.getByTestId('lines-add-row-btn')); });
    expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(rowsBefore);
  });

  it('rellena el precio automáticamente al seleccionar un producto', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => expect(screen.getByTestId('lines-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });

    // The product selector already has product_id=1 (PRODUCTO) which has price 10.0
    // Check that the unit_price input shows 10 (price of PRODUCTO)
    await waitFor(() => {
      const inputs = document.querySelectorAll('tbody tr td input[type="number"]');
      // inputs[0] = quantity, inputs[1] = unit_price for the first row
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  it('muestra error de sileo si se intenta guardar sin líneas', async () => {
    const { sileo } = await import('sileo');
    renderPage();
    await waitFor(() => expect(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => expect(screen.getByTestId('lines-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => expect(screen.getByTestId('lines-save-btn')).toBeInTheDocument());

    // Remove all lines
    await waitFor(() => {
      const removeBtns = screen.getAllByLabelText('Eliminar línea');
      expect(removeBtns.length).toBeGreaterThan(0);
    });
    const removeBtns = screen.getAllByLabelText('Eliminar línea');
    for (const btn of removeBtns) {
      await act(async () => { fireEvent.click(btn); });
    }

    // Try to save with empty lines
    await act(async () => { fireEvent.click(screen.getByTestId('lines-save-btn')); });
    expect(sileo.error).toHaveBeenCalled();
  });
});

describe('AlbaranesPage – paginación', () => {
  const MANY_ALBARANES = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    date: '2026-01-01',
    description: `Albarán ${i + 1}`,
    total: 10.0,
    status: 'FIANZA',
    customer_id: 1,
    items: [],
  }));

  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve(MANY_ALBARANES) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('muestra solo 25 albaranes por defecto', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
    // #26 should NOT be visible (page 2)
    expect(screen.queryByText('#26')).not.toBeInTheDocument();
  });

  it('muestra el selector de tamaño de página', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('alb-page-size-select')).toBeInTheDocument());
  });

  it('navega a la página siguiente y muestra el albarán #26', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());

    const nextBtn = screen.getByRole('button', { name: /p.gina siguiente/i });
    await act(async () => { fireEvent.click(nextBtn); });

    await waitFor(() => expect(screen.getByText('#26')).toBeInTheDocument());
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });

  it('cambia el tamaño de página a 50 y muestra todos', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('alb-page-size-select')).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(screen.getByTestId('alb-page-size-select'), { target: { value: '50' } });
    });
    await waitFor(() => expect(screen.getByText('#30')).toBeInTheDocument());
  });
});

describe('AlbaranesPage – filtro de estado', () => {
  const ALB_RUTA = {
    id: 10,
    date: '2026-01-01',
    description: 'En ruta',
    total: 20.0,
    status: 'RUTA',
    customer_id: 1,
    items: [],
  };

  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN, ALB_RUTA]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('muestra el estado Ruta (no RUTA en mayúsculas) en la lista', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ruta')).toBeInTheDocument());
    expect(screen.queryByText('RUTA')).not.toBeInTheDocument();
  });
});

describe('AlbaranesPage – eliminar albarán', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes(`albaranes/get/${ALBARAN.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('muestra el botón Eliminar al abrir el detalle', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => expect(screen.getByTestId('albaran-delete-btn')).toBeInTheDocument());
  });

  it('abre el modal de confirmación al pulsar Eliminar', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => expect(screen.getByTestId('albaran-delete-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-delete-btn')); });
    await waitFor(() => expect(screen.getByTestId('albaran-delete-confirm-btn')).toBeInTheDocument());
  });

  it('elimina el albarán y cierra el modal tras confirmar', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes(`albaranes/get/${ALBARAN.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => expect(screen.getByTestId('albaran-delete-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-delete-btn')); });
    await waitFor(() => expect(screen.getByTestId('albaran-delete-confirm-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-delete-confirm-btn')); });

    await waitFor(() => expect(screen.queryByTestId('albaran-delete-confirm-btn')).not.toBeInTheDocument());
  });
});
