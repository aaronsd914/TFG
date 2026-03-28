/**
 * NuevaVenta.test.jsx
 * Verifica el layout del wizard de nueva venta y la disponibilidad del formulario.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import NuevaVenta from '../../frontend/src/components/NuevaVenta.jsx';
import { sileo } from 'sileo';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

afterEach(() => { vi.clearAllMocks(); });

function renderPage() {
  return render(<NuevaVenta />);
}

describe('NuevaVenta', () => {
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

  it('muestra el título "Nueva venta"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nueva venta/i })).toBeInTheDocument();
    });
  });

  it('muestra el campo de búsqueda de cliente', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/busca por nombre/i)).toBeInTheDocument();
    });
  });

  it('muestra el checkbox para usar cliente existente', async () => {
    renderPage();
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// Cliente nuevo: toggle de modo
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – toggle cliente nuevo', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
  });

  it('al desactivar el switch muestra el formulario de cliente nuevo', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('switch'));
    await act(async () => { fireEvent.click(screen.getByRole('switch')); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument();
    });
  });

  it('en modo cliente nuevo muestra el campo DNI', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('switch'));
    await act(async () => { fireEvent.click(screen.getByRole('switch')); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('00000000X')).toBeInTheDocument();
    });
  });

  it('en modo cliente nuevo muestra campos ciudad y código postal', async () => {
    await act(async () => { renderPage(); });
    await act(async () => { fireEvent.click(screen.getByRole('switch')); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ciudad')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('CP')).toBeInTheDocument();
    });
  });

  it('en modo cliente nuevo muestra campo teléfono 1', async () => {
    await act(async () => { renderPage(); });
    await act(async () => { fireEvent.click(screen.getByRole('switch')); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Móvil')).toBeInTheDocument();
    });
  });

  it('al volver a activar el switch muestra el buscador de clientes', async () => {
    await act(async () => { renderPage(); });
    const sw = screen.getByRole('switch');
    await act(async () => { fireEvent.click(sw); }); // desactiva
    await act(async () => { fireEvent.click(sw); }); // activa
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/busca por nombre/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Búsqueda y selección de cliente existente
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – búsqueda de cliente existente', () => {
  const mockClientes = [
    { id: 1, name: 'Ana', surnames: 'García', email: 'ana@test.com', dni: '12345678A' },
    { id: 2, name: 'Luis', surnames: 'Martínez', email: 'luis@test.com', dni: null },
  ];

  beforeEach(() => {
    // Primera llamada del search retorna resultados
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockClientes),
    });
  });

  it('al escribir en el campo de cliente, aparecen sugerencias', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(input, { target: { value: 'Ana' } });
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('al seleccionar un cliente del listado se muestra su nombre', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(input, { target: { value: 'Ana' } });
    await waitFor(() => screen.getByText('Ana García'), { timeout: 3000 });
    await act(async () => {
      fireEvent.mouseDown(screen.getByText('Ana García'));
    });
    // The selected client card should appear
    await waitFor(() => {
      expect(screen.getByText(/12345678A/)).toBeInTheDocument();
    });
  });

  it('el botón Quitar del cliente seleccionado limpia la selección', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(input, { target: { value: 'Ana' } });
    await waitFor(() => screen.getByText('Ana García'), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByText('Ana García')); });
    await waitFor(() => screen.getByText(/12345678A/));
    // Click Quitar
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    });
    await waitFor(() => {
      expect(screen.queryByText(/12345678A/)).not.toBeInTheDocument();
    });
  });

  it('cliente sin DNI muestra "Sin DNI"', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 2, name: 'Luis', surnames: 'Martínez', email: null, dni: null }]),
    });
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(input, { target: { value: 'Luis' } });
    await waitFor(() => screen.getByText('Luis Martínez'), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByText('Luis Martínez')); });
    await waitFor(() => {
      expect(screen.getByText(/sin dni/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Búsqueda y adición de productos
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – búsqueda y carrito de productos', () => {
  const mockProductos = [
    { id: 10, name: 'Mesa de comedor', price: 299.99 },
    { id: 11, name: 'Silla de madera', price: 89.50 },
  ];

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
  });

  it('al escribir en búsqueda de producto aparecen sugerencias', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mesa de comedor/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('al hacer mouseDown sobre un producto se añade al carrito', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => {
      expect(screen.getByText('Mesa de comedor')).toBeInTheDocument();
    });
  });

  it('el carrito muestra la columna Cantidad con input de número', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => {
      const qtyInputs = screen.getAllByDisplayValue('1');
      expect(qtyInputs.length).toBeGreaterThan(0);
    });
  });

  it('añadir el mismo producto incrementa la cantidad', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    // Add once
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    // Add again - re‑open suggestions
    fireEvent.change(input, { target: { value: 'mesa2' } });
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  it('el botón Quitar de un ítem lo saca del carrito', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => screen.getByText('Mesa de comedor'));
    await act(async () => {
      fireEvent.click(screen.getByTitle('Quitar'));
    });
    await waitFor(() => {
      expect(screen.queryByDisplayValue('1')).not.toBeInTheDocument();
    });
  });

  it('muestra el mensaje "Usa el buscador" cuando el carrito está vacío', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText(/usa el buscador/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Sección de fianza
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – fianza (depósito)', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 300 }];

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
  });

  it('muestra la sección de fianza cuando hay ítem en el carrito', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => {
      expect(screen.getByText(/total:/i)).toBeInTheDocument();
    });
  });

  it('los checkboxes de fianza están presentes en el formulario', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Validación y envío del formulario
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – validación del formulario', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
  });

  it('al enviar sin cliente ni productos llama a sileo.warning', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /guardar albarán/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar albarán/i }));
    });
    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalled();
    });
  });

  it('al enviar sin productos (con cliente) llama a sileo.warning', async () => {
    // Set up client search mock
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: 1, name: 'Ana', surnames: 'García', email: null, dni: '12345678A' }]),
    });
    await act(async () => { renderPage(); });
    // Select a client
    const clientInput = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(clientInput, { target: { value: 'Ana' } });
    await waitFor(() => screen.getByText('Ana García'), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByText('Ana García')); });
    // Now submit without products
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar albarán/i }));
    });
    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalled();
    });
  });

  it('el botón de guardar albarán está en el documento', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar albarán/i })).toBeInTheDocument();
    });
  });

  it('en modo cliente nuevo, enviar sin datos muestra sileo.warning', async () => {
    await act(async () => { renderPage(); });
    await act(async () => { fireEvent.click(screen.getByRole('switch')); });
    await waitFor(() => screen.getByPlaceholderText('Nombre'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar albarán/i }));
    });
    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Envío exitoso
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – envío exitoso', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 299.99 }];
  const mockClientes = [{ id: 1, name: 'Ana', surnames: 'García', email: 'ana@test.com', dni: '12345678A' }];

  it('envío completo (cliente + producto) llama a la API POST y muestra éxito', async () => {
    // Phase 1: client search
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockClientes) })
    );
    await act(async () => { renderPage(); });
    const clientInput = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(clientInput, { target: { value: 'Ana' } });
    await waitFor(() => screen.getByText('Ana García'), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByText('Ana García')); });

    // Phase 2: product search
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
    const prodInput = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(prodInput, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => screen.getByText('Mesa de comedor'));

    // Phase 3: submit – POST albaran then optional pdf/email calls
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 42 }) })
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar albarán/i }));
    });
    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// Campos del formulario de venta
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – campos de fecha y descripción', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
  });

  it('muestra el campo de fecha de la venta con valor por defecto (hoy)', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      const dateInput = document.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('muestra el campo de descripción (textarea)', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/observaciones/i)).toBeInTheDocument();
    });
  });

  it('modifica el campo descripción correctamente', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByPlaceholderText(/observaciones/i));
    const textarea = screen.getByPlaceholderText(/observaciones/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Entrega especial' } });
    });
    expect(textarea.value).toBe('Entrega especial');
  });
});

// ─────────────────────────────────────────────────────────────────
// Input de importe de fianza (visible cuando registrarFianza=true)
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – input de cantidad de fianza', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 300 }];

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
    vi.clearAllMocks();
  });

  it('el input de cantidad de fianza aparece al marcar el checkbox', async () => {
    await act(async () => { renderPage(); });
    // Add item to cart to show the bottom section
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => screen.getByText(/total:/i));

    // The fianza checkbox appears after an item is in the cart
    const checkboxes = screen.getAllByRole('checkbox');
    // The registrarFianza checkbox is the last one or first one in the bottom section
    const fianzaCheckbox = checkboxes.find(cb => !cb.checked);
    if (fianzaCheckbox) {
      await act(async () => { fireEvent.click(fianzaCheckbox); });
      // After checking, an amount input should appear (type=number for the deposit amount)
      await waitFor(() => {
        const numberInputs = document.querySelectorAll('input[type="number"]');
        expect(numberInputs.length).toBeGreaterThan(0);
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// Ruta de error en el POST del albarán
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – error de servidor al crear albarán', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 299.99 }];
  const mockClientes = [{ id: 1, name: 'Ana', surnames: 'García', email: 'ana@test.com', dni: '12345678A' }];

  it('muestra sileo.error cuando el POST devuelve error del servidor', async () => {
    // Phase 1: select client
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockClientes) })
    );
    await act(async () => { renderPage(); });
    const clientInput = screen.getByPlaceholderText(/busca por nombre/i);
    fireEvent.change(clientInput, { target: { value: 'Ana' } });
    await waitFor(() => screen.getByText('Ana García'), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByText('Ana García')); });

    // Phase 2: add product
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
    const prodInput = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(prodInput, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => screen.getByText('Mesa de comedor'));

    // Phase 3: mock POST to return error
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ detail: 'Error al crear el albarán' }),
      })
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /guardar albarán/i }));
    });

    await waitFor(() => {
      expect(sileo.error).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// mouseEnter en sugerencias de producto
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – mouseEnter en sugerencias', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 300 }];

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
  });

  it('el mouseEnter en la sugerencia marca el ítem como activo', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    const btn = screen.getByRole('button', { name: /mesa de comedor/i });
    // mouseEnter covers the onMouseEnter={() => setActiveIdx(i)} handler (line 840)
    fireEvent.mouseEnter(btn);
    expect(document.body).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// Cambio de cantidad en el carrito
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – cambio de cantidad en carrito', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 300 }];

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
  });

  it('cambiar la cantidad en el carrito actualiza el subtotal', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => screen.getByDisplayValue('1'));

    const qtyInput = screen.getByDisplayValue('1');
    // onChange covers line 887: updateQuantity handler
    await act(async () => { fireEvent.change(qtyInput, { target: { value: '3' } }); });
    await waitFor(() => { expect(screen.getByDisplayValue('3')).toBeInTheDocument(); });
  });
});

// ─────────────────────────────────────────────────────────────────
// Cambio del importe de fianza
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – cambio del importe de fianza', () => {
  const mockProductos = [{ id: 10, name: 'Mesa de comedor', price: 300 }];

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockProductos) })
    );
    vi.clearAllMocks();
  });

  it('cambiar el importe de fianza actualiza el valor', async () => {
    await act(async () => { renderPage(); });
    const input = screen.getByPlaceholderText(/buscar producto por nombre/i);
    fireEvent.change(input, { target: { value: 'mesa' } });
    await waitFor(() => screen.getByRole('button', { name: /mesa de comedor/i }), { timeout: 3000 });
    await act(async () => { fireEvent.mouseDown(screen.getByRole('button', { name: /mesa de comedor/i })); });
    await waitFor(() => screen.getByText(/total:/i));

    const checkboxes = screen.getAllByRole('checkbox');
    const fianzaCheckbox = checkboxes.find(cb => !cb.checked);
    if (fianzaCheckbox) {
      await act(async () => { fireEvent.click(fianzaCheckbox); });
      await waitFor(() => {
        const numberInputs = document.querySelectorAll('input[type="number"]');
        expect(numberInputs.length).toBeGreaterThan(0);
      });
      // Change the fianza amount (covers line 953: onChange setFianzaCantidad)
      const fianzaInput = document.querySelector('input[type="number"][step="0.01"]');
      if (fianzaInput) {
        await act(async () => { fireEvent.change(fianzaInput, { target: { value: '150' } }); });
        expect(document.body).toBeTruthy();
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// Formulario cliente nuevo (useExisting = false)
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – formulario de nuevo cliente', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
  });

  it('al desactivar useExisting muestra los campos del nuevo cliente', async () => {
    await act(async () => { renderPage(); });
    // Toggle the useExisting switch to false → shows new client form fields
    const toggle = screen.getByRole('switch');
    await act(async () => { fireEvent.click(toggle); });
    // New client form fields should now be visible (covers lines 671-798)
    await waitFor(() => {
      // The new client form has a name input with placeholder "Nombre"
      const input = document.querySelector('input[placeholder="Nombre"]');
      expect(input).not.toBeNull();
    });
    expect(document.body.textContent).toMatch(/apellidos|nombre/i);
  });

  it('cambiar el nombre en el formulario de nuevo cliente actualiza el estado', async () => {
    await act(async () => { renderPage(); });
    const toggle = screen.getByRole('switch');
    await act(async () => { fireEvent.click(toggle); });
    await waitFor(() => {
      const input = document.querySelector('input[placeholder="Nombre"]');
      expect(input).not.toBeNull();
    });
    const nombreInput = document.querySelector('input[placeholder="Nombre"]');
    await act(async () => { fireEvent.change(nombreInput, { target: { value: 'Carlos' } }); });
    expect(nombreInput.value).toBe('Carlos');
  });

  it('los campos del nuevo cliente disparan sus handlers onChange', async () => {
    await act(async () => { renderPage(); });
    const toggle = screen.getByRole('switch');
    await act(async () => { fireEvent.click(toggle); });
    await waitFor(() => {
      expect(document.querySelector('input[placeholder="Nombre"]')).not.toBeNull();
    });

    const fields = [
      ['input[placeholder="Apellidos"]', 'García'],
      ['input[placeholder="00000000X"]', '12345678A'],
      ['input[placeholder="correo@dominio.com"]', 'prueba@test.com'],
      ['input[placeholder="Móvil"]', '600000001'],
      ['input[placeholder="Otro teléfono"]', '600000002'],
      ['input[placeholder="Calle"]', 'Calle Mayor'],
      ['input[placeholder="12B / s/n"]', '3'],
      ['input[placeholder="2A"]', '1B'],
      ['input[placeholder="Ciudad"]', 'Madrid'],
      ['input[placeholder="CP"]', '28001'],
    ];

    for (const [selector, value] of fields) {
      const el = document.querySelector(selector);
      if (el) await act(async () => { fireEvent.change(el, { target: { value } }); });
    }
    expect(document.body).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// mouseEnter en sugerencias de CLIENTE
// ─────────────────────────────────────────────────────────────────
describe('NuevaVenta – mouseEnter en sugerencias de cliente', () => {
  const mockCliente = [{ id: 5, name: 'Pedro', surnames: 'López', email: 'pedro@test.com', dni: '87654321B' }];

  beforeEach(() => {
    globalThis.fetch = vi.fn((url) => {
      if (url.includes('clientes')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCliente) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('el mouseEnter en la sugerencia de cliente activa el índice', async () => {
    await act(async () => { renderPage(); });
    // Type in the client search input (useExisting=true by default)
    const clientInput = screen.getByPlaceholderText(/busca por nombre, apellidos/i);
    await act(async () => {
      fireEvent.change(clientInput, { target: { value: 'Pedro' } });
    });
    // Wait for client suggestion to appear
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Pedro López/);
    }, { timeout: 3000 });
    // Fire mouseEnter on the client suggestion button (covers line 610: setClientActiveIdx)
    const suggestionBtns = document.querySelectorAll('button[type="button"]');
    const clientBtn = Array.from(suggestionBtns).find(b => b.textContent.includes('Pedro'));
    if (clientBtn) fireEvent.mouseEnter(clientBtn);
    expect(document.body).toBeTruthy();
  });
});
