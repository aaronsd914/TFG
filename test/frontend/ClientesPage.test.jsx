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
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      if (url.includes('albaranes/by-cliente')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/productos\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('muestra el botón Editar al abrir el detalle', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('ana@test.com'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument();
    });
  });

  it('abre el modal de edición al pulsar Editar', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('ana@test.com')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('ana@test.com')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });

    expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument();
  });

  it('guarda los cambios y cierra el modal de edición', async () => {
    fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE, name: 'Ana Editada' }) });
      }
      if (/clientes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      }
      if (url.includes(`clientes/get/${CLIENTE.id}`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      }
      if (url.includes('albaranes/by-cliente')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/albaranes\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (/productos\/get$/.test(url)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('ana@test.com')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('ana@test.com')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-save-btn')); });

    await waitFor(() => {
      expect(screen.queryByTestId('cliente-edit-save-btn')).not.toBeInTheDocument();
    });
  });

  it('muestra errores de validación al guardar con campos vacíos', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('ana@test.com')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('ana@test.com')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument());

    // Borrar el campo nombre: es el input que sigue a la etiqueta con texto "Nombre"
    // Los labels del form tienen el texto de la traducción; el primero es "Nombre"
    const saveBtn = screen.getByTestId('cliente-edit-save-btn');
    const editModal = saveBtn.closest('.fixed') ?? document;
    const nameInput = editModal.querySelectorAll('input[type="text"]')[0];
    await act(async () => { fireEvent.change(nameInput, { target: { value: '' } }); });
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-save-btn')); });

    // El modal debe seguir abierto (no se cierra porque hay errores de validación)
    expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument();
  });

  it('cancela la edición y cierra el modal', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('ana@test.com')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('ana@test.com')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument());

    // Pulsar Cancelar — buscar por contenido de texto
    const allBtns = screen.getAllByRole('button');
    const cancelBtn = allBtns.find((b) => /^cancelar$|^cancel$/i.test(b.textContent.trim()));
    await act(async () => { fireEvent.click(cancelBtn); });

    expect(screen.queryByTestId('cliente-edit-save-btn')).not.toBeInTheDocument();
  });

  it('muestra las líneas del albarán al expandir', async () => {
    const ALB = {
      id: 10,
      date: '2026-03-01',
      description: 'Compra 1',
      status: 'FIANZA',
      total: 50.0,
      customer_id: 1,
      items: [{ id: 1, product_id: 5, quantity: 2, unit_price: 25.0 }],
    };

    fetch.mockImplementation((url) => {
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([CLIENTE]) });
      if (url.includes(`clientes/get/${CLIENTE.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...CLIENTE }) });
      if (url.includes('albaranes/by-cliente')) return Promise.resolve({ ok: true, json: () => Promise.resolve([ALB]) });
      if (url.includes(`albaranes/get/${ALB.id}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(ALB) });
      if (/productos\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 5, name: 'Producto Test', description: '', price: 10, supplier_id: 1 }]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('ana@test.com')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('ana@test.com')); });

    // Cambiar a pestaña Albaranes — buscar botón con texto exacto
    await waitFor(() => {
      const btns = screen.getAllByRole('button');
      expect(btns.some((b) => b.textContent.trim() === 'Albaranes')).toBe(true);
    });
    const albBtn = screen.getAllByRole('button').find((b) => b.textContent.trim() === 'Albaranes');
    await act(async () => { fireEvent.click(albBtn); });

    // Expandir líneas del albarán via aria-label
    await waitFor(() => {
      const btns = screen.getAllByRole('button');
      expect(btns.some((b) => /l[íi]neas/i.test(b.getAttribute('aria-label') || ''))).toBe(true);
    });
    const expandBtn = screen.getAllByRole('button').find((b) => /l[íi]neas/i.test(b.getAttribute('aria-label') || ''));
    await act(async () => { fireEvent.click(expandBtn); });

    await waitFor(() => {
      expect(screen.getByText('25.00 €')).toBeInTheDocument();
      expect(screen.getByText('Producto Test')).toBeInTheDocument();
    });
    // Los IDs de línea y producto no deben aparecer como texto en las celdas
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
    expect(screen.queryByText('#5')).not.toBeInTheDocument();
  });

  it('muestra toast de sileo al guardar con campos vacíos', async () => {
    const { sileo } = await import('sileo');

    renderPage();

    await waitFor(() => expect(screen.getByText('ana@test.com')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByText('ana@test.com')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-btn')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-btn')); });
    await waitFor(() => expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument());

    // Borrar el campo nombre para forzar error de validación
    const saveBtn = screen.getByTestId('cliente-edit-save-btn');
    const editModal = saveBtn.closest('.fixed') ?? document;
    const nameInput = editModal.querySelectorAll('input[type="text"]')[0];
    await act(async () => { fireEvent.change(nameInput, { target: { value: '' } }); });
    await act(async () => { fireEvent.click(screen.getByTestId('cliente-edit-save-btn')); });

    expect(sileo.error).toHaveBeenCalled();
    expect(screen.getByTestId('cliente-edit-save-btn')).toBeInTheDocument();
  });
});

describe('ClientesPage – paginación', () => {
  // Use padded numbers so alphabetical sort == numeric sort
  const CLIENTES_MANY = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Cliente${String(i + 1).padStart(3, '0')}`,
    surnames: 'Test',
    email: `c${String(i + 1).padStart(3, '0')}@test.com`,
    dni: `${String(i + 1).padStart(7, '0')}A`,
    phone1: '600000000',
    phone2: '',
    street: 'Calle',
    house_number: '1',
    floor_entrance: '',
    city: 'Madrid',
    postal_code: '28001',
  }));

  beforeEach(() => {
    fetch.mockImplementation((url) => {
      if (/clientes\/get$/.test(url)) return Promise.resolve({ ok: true, json: () => Promise.resolve(CLIENTES_MANY) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('muestra solo 10 clientes por defecto en la primera página', async () => {
    renderPage();
    // First page: Cliente001 – Cliente010
    await waitFor(() => expect(screen.getByText('Cliente001 Test')).toBeInTheDocument());
    // Cliente011 should NOT be visible (page 2)
    expect(screen.queryByText('Cliente011 Test')).not.toBeInTheDocument();
  });

  it('muestra el selector de tamaño de página', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('page-size-select')).toBeInTheDocument());
  });

  it('cambia el tamaño de página a 25 y muestra todos', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('page-size-select')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByTestId('page-size-select'), { target: { value: '25' } });
    });

    await waitFor(() => expect(screen.getByText('Cliente025 Test')).toBeInTheDocument());
  });

  it('navega a la página siguiente', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Cliente001 Test')).toBeInTheDocument());

    // Botón › (siguiente página)
    const nextBtn = screen.getByRole('button', { name: '›' });
    await act(async () => { fireEvent.click(nextBtn); });

    await waitFor(() => expect(screen.getByText('Cliente011 Test')).toBeInTheDocument());
    expect(screen.queryByText('Cliente001 Test')).not.toBeInTheDocument();
  });
});
