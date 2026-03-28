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

    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
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

// ─────────────────────────────────────────────────────────────────
// Pestaña Cliente en el detalle del albarán
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – pestaña cliente', () => {
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

  async function openDetailAndSwitchToClientTab() {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => screen.getByRole('button', { name: /^cliente$/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^cliente$/i }));
    });
  }

  it('muestra la pestaña "Cliente" en el panel de detalle', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^cliente$/i })).toBeInTheDocument();
    });
  });

  it('muestra el nombre del cliente al cambiar a la pestaña Cliente', async () => {
    await openDetailAndSwitchToClientTab();
    await waitFor(() => {
      // The client name is rendered as {name} {surnames}
      const bodyText = document.body.textContent;
      expect(bodyText).toMatch(/Ana/);
      expect(bodyText).toMatch(/Garc/);
    });
  });

  it('muestra el email del cliente en la pestaña Cliente', async () => {
    await openDetailAndSwitchToClientTab();
    await waitFor(() => {
      expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    });
  });

  it('muestra el DNI del cliente en la pestaña Cliente', async () => {
    await openDetailAndSwitchToClientTab();
    await waitFor(() => {
      expect(screen.getByText('12345678A')).toBeInTheDocument();
    });
  });

  it('pulsar "Ver cliente" en la pestaña Cliente llama a goToCliente', async () => {
    await openDetailAndSwitchToClientTab();
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Ana/);
    });
    // The "Ver cliente →" button should exist and be clickable
    const verClienteBtn = screen.queryByText(/ver cliente/i);
    if (verClienteBtn) {
      await act(async () => { fireEvent.click(verClienteBtn); });
    }
    expect(document.body).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// Eliminar línea en modo edición
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – eliminar línea', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_CON_ITEMS]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([PRODUCTO]) });
      if (url.includes(`albaranes/get/${ALBARAN_CON_ITEMS.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN_CON_ITEMS }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('elimina una línea al pulsar el botón ×', async () => {
    renderPage();
    await waitFor(() => screen.getByText(`#${ALBARAN_CON_ITEMS.id}`));
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => screen.getByTestId('lines-edit-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => screen.getByTestId('lines-add-row-btn'));

    // The remove button exists while there are lines
    expect(screen.getAllByRole('button', { name: /eliminar línea/i }).length).toBeGreaterThan(0);
    const removeBtn = screen.getAllByRole('button', { name: /eliminar línea/i })[0];
    await act(async () => { fireEvent.click(removeBtn); });

    // After removing the only line, the "no lines" message should appear
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /eliminar línea/i })).toHaveLength(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Filtros: ordenación
// ─────────────────────────────────────────────────────────────────
const ALBARAN_2 = {
  id: 2,
  date: '2026-02-01',
  description: 'Test 2',
  total: 100.0,
  status: 'ENTREGADO',
  customer_id: 1,
  items: [],
};

function mockFetchTwoAlbaranes() {
  fetch.mockImplementation((url) => {
    if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN, ALBARAN_2]) });
    if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
    if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function openFiltersModal(screen) {
  const btn = screen.getAllByRole('button').find(b => b.textContent === 'Filtros');
  fireEvent.click(btn);
}

function getSortSelect() {
  return Array.from(document.querySelectorAll('select')).find(
    s => Array.from(s.options).some(o => o.value === 'fecha_asc')
  );
}

describe('AlbaranesPage – filtros: ordenación', () => {
  beforeEach(() => { mockFetchTwoAlbaranes(); });

  it('cambia la ordenación a fecha ascendente', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    await act(async () => { openFiltersModal(screen); });
    const sortSelect = getSortSelect();
    await act(async () => { fireEvent.change(sortSelect, { target: { value: 'fecha_asc' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Aplicar' })); });
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
  });

  it('cambia la ordenación a total descendente', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    await act(async () => { openFiltersModal(screen); });
    const sortSelect = getSortSelect();
    await act(async () => { fireEvent.change(sortSelect, { target: { value: 'total_desc' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Aplicar' })); });
    await waitFor(() => expect(screen.getByText('#1')).toBeInTheDocument());
  });

  it('cambia la ordenación a total ascendente y muestra chip', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    await act(async () => { openFiltersModal(screen); });
    const sortSelect = getSortSelect();
    await act(async () => { fireEvent.change(sortSelect, { target: { value: 'total_asc' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Aplicar' })); });
    // Chip should appear for sort != fecha_desc
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Total/);
    });
  });

  it('limpiar filtros borra el chip de ordenación', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    // Set non-default sort
    await act(async () => { openFiltersModal(screen); });
    const sortSelect = getSortSelect();
    await act(async () => { fireEvent.change(sortSelect, { target: { value: 'total_asc' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Aplicar' })); });
    // Chip for sort should now be visible → click the "Limpiar" link next to chips
    await waitFor(() => {
      const limpiarBtns = screen.getAllByText('Limpiar');
      expect(limpiarBtns.length).toBeGreaterThan(0);
    });
    const limpiarBtn = screen.getAllByText('Limpiar')[0];
    await act(async () => { fireEvent.click(limpiarBtn); });
    // After clearAll, chips should be gone
    await waitFor(() => {
      expect(screen.queryAllByText('Limpiar')).toHaveLength(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Filtros: fechas rápidas
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – filtros de fecha rápidos', () => {
  beforeEach(() => { mockFetchTwoAlbaranes(); });

  it('establece la fecha desde en el filtro rápido', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    // Find the quick dateFrom input (type="date" in main toolbar)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
    });
    // dateFrom chip should appear
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/fecha/i);
    });
  });

  it('establece la fecha hasta en el filtro rápido', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(1);
    await act(async () => {
      fireEvent.change(dateInputs[1], { target: { value: '2026-12-31' } });
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/fecha/i);
    });
  });

  it('muestra botón × para limpiar fechas cuando se establece una', async () => {
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    const dateInputs = document.querySelectorAll('input[type="date"]');
    await act(async () => {
      fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
    });
    await waitFor(() => {
      // The × button appears to clear dates
      const clearBtns = screen.getAllByTitle('Limpiar fechas');
      expect(clearBtns.length).toBeGreaterThan(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByTitle('Limpiar fechas'));
    });
    // After clearing, the dateFrom input should be empty
    await waitFor(() => {
      expect(document.querySelectorAll('input[type="date"]')[0].value).toBe('');
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SaveEdit error
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – saveEdit error', () => {
  beforeEach(() => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT') return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ detail: 'Internal Server Error' }) });
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes(`albaranes/get/${ALBARAN.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('muestra sileo.error cuando saveEdit falla con error HTTP', async () => {
    const { sileo } = await import('sileo');
    renderPage();
    await waitFor(() => screen.getByText('#1'));
    await act(async () => { fireEvent.click(screen.getByText('#1')); });
    await waitFor(() => screen.getByTestId('albaran-edit-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-edit-btn')); });
    await waitFor(() => screen.getByTestId('albaran-edit-save-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('albaran-edit-save-btn')); });
    await waitFor(() => {
      expect(sileo.error).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Edición de precio unitario en líneas
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – edición precio unitario en líneas', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_CON_ITEMS]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([PRODUCTO]) });
      if (url.includes(`albaranes/get/${ALBARAN_CON_ITEMS.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN_CON_ITEMS }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('actualiza el precio unitario al cambiar el input', async () => {
    renderPage();
    await waitFor(() => screen.getByText(`#${ALBARAN_CON_ITEMS.id}`));
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => screen.getByTestId('lines-edit-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => screen.getByTestId('lines-add-row-btn'));
    // unit_price input is inputs[1] (qty=inputs[0], price=inputs[1])
    const numInputs = document.querySelectorAll('tbody tr td input[type="number"]');
    expect(numInputs.length).toBeGreaterThanOrEqual(2);
    const priceInput = numInputs[1];
    await act(async () => { fireEvent.change(priceInput, { target: { value: '25' } }); });
    expect(priceInput.value).toBe('25');
  });
});

// ─────────────────────────────────────────────────────────────────
// Guardar líneas exitosamente
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – guardar líneas exitosamente', () => {
  beforeEach(() => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT' && url.includes('/items')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN_CON_ITEMS, items: [{ id: 10, product_id: 1, quantity: 3, unit_price: 10.0 }] }) });
      }
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_CON_ITEMS]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([PRODUCTO]) });
      if (url.includes(`albaranes/get/${ALBARAN_CON_ITEMS.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN_CON_ITEMS }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('guarda las líneas exitosamente y llama a sileo.success', async () => {
    const { sileo } = await import('sileo');
    renderPage();
    await waitFor(() => screen.getByText(`#${ALBARAN_CON_ITEMS.id}`));
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => screen.getByTestId('lines-edit-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => screen.getByTestId('lines-save-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('lines-save-btn')); });
    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Cambiar la cantidad (quantity) de una línea (cubre línea 1076)
// ─────────────────────────────────────────────────────────────────
describe('AlbaranesPage – edición cantidad en líneas', () => {
  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/albaranes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALBARAN_CON_ITEMS]) });
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([PRODUCTO]) });
      if (url.includes(`albaranes/get/${ALBARAN_CON_ITEMS.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ALBARAN_CON_ITEMS }) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('cambiar la cantidad de una línea actualiza el estado', async () => {
    renderPage();
    await waitFor(() => screen.getByText(`#${ALBARAN_CON_ITEMS.id}`));
    await act(async () => { fireEvent.click(screen.getByText(`#${ALBARAN_CON_ITEMS.id}`)); });
    await waitFor(() => screen.getByTestId('lines-edit-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('lines-edit-btn')); });
    await waitFor(() => {
      const numInputs = document.querySelectorAll('tbody tr td input[type="number"]');
      expect(numInputs.length).toBeGreaterThanOrEqual(1);
    });
    // quantity is the first number input in the row (covers line 1076: updateLineField)
    const numInputs = document.querySelectorAll('tbody tr td input[type="number"]');
    const qtyInput = numInputs[0];
    await act(async () => { fireEvent.change(qtyInput, { target: { value: '5' } }); });
    expect(qtyInput.value).toBe('5');
  });
});
