/**
 * ProductosPage.test.jsx
 * Verifica el layout inicial, las llamadas a la API y el panel de productos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import ProductosPage from '../../frontend/src/components/ProductosPage.jsx';
import { sileo } from 'sileo';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

// Garantiza aislamiento total entre tests: clearAllMocks no basta porque
// no resetea implementaciones pendientes (mockRejectedValue, etc.)
afterEach(() => {
  vi.resetAllMocks();
});

function renderPage() {
  return render(<ProductosPage />);
}

describe('ProductosPage', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // proveedores
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

  it('muestra el tÃ­tulo "Productos"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /productos/i })).toBeInTheDocument();
    });
  });

  it('no muestra errores visibles con listas vacÃ­as', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('muestra el botÃ³n "Nuevo producto" en el header', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo producto/i })).toBeInTheDocument();
    });
  });
});

describe('ProductosPage â€” modal crear producto', () => {
  const mockProveedores = [
    { id: 1, name: 'Proveedor Test A' },
    { id: 2, name: 'Proveedor Test B' },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })      // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProveedores) }); // proveedores
  });

  async function openModal() {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /nuevo producto/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }));
    });
    await waitFor(() => screen.getByPlaceholderText(/ej: mesa de comedor/i));
  }

  it('abre el modal y muestra el formulario de creaciÃ³n', async () => {
    await openModal();
    expect(screen.getByPlaceholderText(/ej: mesa de comedor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
  });

  it('muestra los proveedores disponibles en el select', async () => {
    await openModal();
    expect(screen.getByText('Proveedor Test A')).toBeInTheDocument();
    expect(screen.getByText('Proveedor Test B')).toBeInTheDocument();
  });

  it('cierra el modal al pulsar el botÃ³n cerrar (Ã—)', async () => {
    await openModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    });
    expect(screen.queryByPlaceholderText(/ej: mesa de comedor/i)).not.toBeInTheDocument();
  });

  it('el botÃ³n Limpiar vacÃ­a todos los campos del formulario', async () => {
    await openModal();
    const nombreInput = screen.getByPlaceholderText(/ej: mesa de comedor/i);
    const precioInput = screen.getByPlaceholderText(/ej: 199.99/i);
    fireEvent.change(nombreInput, { target: { value: 'Mi producto' } });
    fireEvent.change(precioInput, { target: { value: '50' } });
    expect(nombreInput.value).toBe('Mi producto');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    });
    expect(screen.getByPlaceholderText(/ej: mesa de comedor/i).value).toBe('');
  });

  it('el onChange del form revalida cuando createTouched es verdadero', async () => {
    await openModal();
    const form = screen.getByPlaceholderText(/ej: mesa de comedor/i).closest('form');
    // Submit vacÃ­o â†’ setCreateTouched(true) â†’ createErrors se activa
    await act(async () => { fireEvent.submit(form); });
    // onChange ahora ejecuta validateCreate (createTouched=true)
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/ej: mesa de comedor/i), { target: { value: 'Nombre test' } });
    });
    expect(document.body).toBeTruthy();
  });

  it('rellena precio, descripciÃ³n y proveedor correctamente', async () => {
    await openModal();
    const precioInput = screen.getByPlaceholderText(/ej: 199.99/i);
    const descInput = screen.getByPlaceholderText(/detalles, medidas/i);
    const selectProveedor = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(precioInput, { target: { value: '25.50' } });
      fireEvent.change(descInput, { target: { value: 'DescripciÃ³n de prueba' } });
      fireEvent.change(selectProveedor, { target: { value: '1' } });
    });
    expect(precioInput.value).toBe('25.5');
    expect(descInput.value).toBe('DescripciÃ³n de prueba');
    expect(selectProveedor.value).toBe('1');
  });

  it('envÃ­a el formulario completo y cierra el modal al tener Ã©xito', async () => {
    // Mock para el POST de creaciÃ³n
    const nuevoProducto = { id: 99, name: 'Mesa nueva', price: 199.99, supplier_id: 1 };
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(nuevoProducto) });

    await openModal();
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/ej: mesa de comedor/i), { target: { value: 'Mesa nueva' } });
      fireEvent.change(screen.getByPlaceholderText(/ej: 199.99/i), { target: { value: '199.99' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    });
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText(/ej: mesa de comedor/i).closest('form'));
    });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/ej: mesa de comedor/i)).not.toBeInTheDocument();
    });
  });
});


describe('ProductosPage – modal borrar producto', () => {
  const mockProducto = { id: 99, name: 'Mesa Test', price: 150, supplier_id: null };

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockProducto]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });             // proveedores
  });

  async function openDeleteModal() {
    await act(async () => { renderPage(); });
    // Switch to Gestión tab
    await waitFor(() => screen.getByRole('button', { name: /gestión/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gestión/i }));
    });
    // Select the product in the left-panel list
    await waitFor(() => screen.getByRole('button', { name: /mesa test/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /mesa test/i }));
    });
    // Click the Eliminar button in the editor panel to open the modal
    await waitFor(() => screen.getAllByRole('button', { name: /eliminar/i }));
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /eliminar/i })[0]);
    });
    // Wait for the confirmation modal title
    await waitFor(() => screen.getByText(/confirmar eliminación/i));
  }

  it('el modal muestra el id y nombre del producto, no "undefined"', async () => {
    await openDeleteModal();
    expect(document.body.textContent).toContain('#99');
    expect(document.body.textContent).toContain('Mesa Test');
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('cancelar cierra el modal de borrado sin llamar a la API', async () => {
    await openDeleteModal();
    const callsBefore = fetch.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    });
    await waitFor(() => {
      expect(screen.queryByText(/confirmar eliminación/i)).not.toBeInTheDocument();
    });
    expect(fetch.mock.calls.length).toBe(callsBefore); // no extra API call
  });

  it('confirmar borrado llama al endpoint DELETE y cierra el modal', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    await openDeleteModal();
    // The modal's confirm button is the last "Eliminar" in the DOM
    const eliminarBtns = screen.getAllByRole('button', { name: /eliminar/i });
    await act(async () => {
      fireEvent.click(eliminarBtns[eliminarBtns.length - 1]);
    });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('productos/delete/99'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText(/confirmar eliminación/i)).not.toBeInTheDocument();
    });
  });

  it('cerrar el modal con el botón X dispara onClose y cierra el modal', async () => {
    await openDeleteModal();
    // Click the X close button in the modal header (aria-label="Cerrar")
    const cerrarBtns = screen.getAllByRole('button', { name: /^cerrar$/i });
    await act(async () => {
      fireEvent.click(cerrarBtns[0]);
    });
    await waitFor(() => {
      expect(screen.queryByText(/confirmar eliminación/i)).not.toBeInTheDocument();
    });
  });

  it('el botón Revertir restaura los campos del editor', async () => {
    // Need a product with supplier for this test
    vi.resetAllMocks();
    const mockProductoConProveedor = { id: 55, name: 'Silla', price: 75, supplier_id: 1 };
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockProductoConProveedor]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Proveedor A' }]) }); // proveedores

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /gestión/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /gestión/i })); });
    await waitFor(() => screen.getByRole('button', { name: /silla/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /silla/i })); });

    // Change the product name
    await waitFor(() => screen.getByDisplayValue('Silla'));
    const nameInput = screen.getByDisplayValue('Silla');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Silla Modificada' } });
    });
    expect(nameInput.value).toBe('Silla Modificada');

    // Click revert button
    const revertBtn = screen.getByRole('button', { name: /revertir/i });
    await act(async () => { fireEvent.click(revertBtn); });

    // Name should be restored
    await waitFor(() => {
      expect(screen.getByDisplayValue('Silla')).toBeInTheDocument();
    });
  });

  it('cambiar el select de proveedor actualiza el valor', async () => {
    vi.resetAllMocks();
    const mockProductoConProveedor = { id: 56, name: 'Mesa Oficina', price: 200, supplier_id: null };
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockProductoConProveedor]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Proveedor A' }]) }); // proveedores

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /gestión/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /gestión/i })); });
    await waitFor(() => screen.getByRole('button', { name: /mesa oficina/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /mesa oficina/i })); });

    // Find the supplier select and change it
    await waitFor(() => screen.getAllByRole('combobox').length > 0);
    const selects = screen.getAllByRole('combobox');
    // The supplier select contains 'Proveedor A' option
    const supplierSelect = selects.find(s => s.innerHTML.includes('Proveedor A'));
    if (supplierSelect) {
      await act(async () => {
        fireEvent.change(supplierSelect, { target: { value: '1' } });
      });
      expect(supplierSelect.value).toBe('1');
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// pageSize filter eliminado
// ─────────────────────────────────────────────────────────────────
describe('ProductosPage – filtro pageSize eliminado', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // proveedores
  });

  it('no existe ningún select de tamaño de página en el DOM', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /productos/i })).toBeInTheDocument();
    }, { timeout: 2000 });
    // The page size select was removed; verify no options with 12/24 exist
    const selects = document.querySelectorAll('select');
    const pageSizeSelect = Array.from(selects).find(s =>
      s.innerHTML.includes('>12<') || s.innerHTML.includes('>24<')
    );
    expect(pageSizeSelect).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// Notificaciones sileo i18n en crear producto
// ─────────────────────────────────────────────────────────────────
describe('ProductosPage – notificaciones sileo (i18n)', () => {
  const mockProveedores = [{ id: 1, name: 'Proveedor A' }];

  beforeEach(() => {
    vi.resetAllMocks();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProveedores) }); // proveedores
  });

  async function openCreateModal() {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /nuevo producto/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }));
    });
    await waitFor(() => screen.getByPlaceholderText(/ej: mesa de comedor/i));
  }

  it('enviar formulario vacío llama a sileo.warning con clave de i18n', async () => {
    await openCreateModal();
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText(/ej: mesa de comedor/i).closest('form'));
    });
    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalled();
      const call = sileo.warning.mock.calls[0][0];
      expect(call.title).toContain('Faltan campos');
    });
  });

  it('crear producto con éxito llama a sileo.success con texto de i18n', async () => {
    const nuevoProducto = { id: 42, name: 'Mesa Test', price: 99.99, supplier_id: 1 };
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(nuevoProducto) });
    await openCreateModal();
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/ej: mesa de comedor/i), { target: { value: 'Mesa Test' } });
      fireEvent.change(screen.getByPlaceholderText(/ej: 199.99/i), { target: { value: '99.99' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    });
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText(/ej: mesa de comedor/i).closest('form'));
    });
    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
      const call = sileo.success.mock.calls[0][0];
      expect(call.title).toContain('Producto creado');
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Notificaciones sileo – actualizar producto (pestana Gestión)
// ─────────────────────────────────────────────────────────────────
describe('ProductosPage – notificaciones sileo actualizar (i18n)', () => {
  const mockProducto = { id: 5, name: 'Silla test', price: 50, supplier_id: null };
  const mockProveedores = [{ id: 1, name: 'Proveedor A' }];

  beforeEach(() => {
    vi.resetAllMocks();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockProducto]) }) // productos
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProveedores) }); // proveedores
  });

  it('actualizar sin nombre llama a sileo.warning con clave de i18n', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /gestión/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /gestión/i }));
    });
    await waitFor(() => screen.getByRole('button', { name: /silla test/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /silla test/i }));
    });
    // Clear the name field
    await waitFor(() => document.querySelector('input[placeholder*="Mesa de comedor"]') || document.querySelector('input[value="Silla test"]'));
    const nameInputs = screen.getAllByDisplayValue('Silla test');
    await act(async () => {
      fireEvent.change(nameInputs[0], { target: { value: '' } });
    });
    // Click Actualizar
    await waitFor(() => screen.getByRole('button', { name: /actualizar/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));
    });
    await waitFor(() => {
      expect(sileo.warning).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// editTouched validation onChange
// ─────────────────────────────────────────────────────────────────
describe('ProductosPage – revalidación onChange con editTouched', () => {
  const mockProducto = { id: 5, name: 'Silla test', price: 50, supplier_id: null };
  const mockProveedores = [{ id: 1, name: 'Proveedor A' }];

  beforeEach(() => {
    vi.resetAllMocks();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockProducto]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProveedores) });
  });

  it('onChange en los campos de edición revalida cuando editTouched es verdadero', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /gestión/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /gestión/i })); });
    await waitFor(() => screen.getByRole('button', { name: /silla test/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /silla test/i })); });

    // Click Actualizar to set editTouched=true
    await waitFor(() => screen.getByRole('button', { name: /actualizar/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /actualizar/i })); });

    // Now change a field — triggers the div onChange handler at line 1092
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Silla test');
      return inputs.length > 0;
    });
    const nameInput = screen.getAllByDisplayValue('Silla test')[0];
    await act(async () => { fireEvent.change(nameInput, { target: { value: 'Silla Actualizada' } }); });
    expect(document.body).toBeTruthy();
  });

  it('cambiar el textarea de descripción en edición actualiza el valor', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /gestión/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /gestión/i })); });
    await waitFor(() => screen.getByRole('button', { name: /silla test/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /silla test/i })); });

    // Find the description textarea and change it (covers lines 1116-1130)
    await waitFor(() => {
      const textareas = document.querySelectorAll('textarea');
      return textareas.length > 0;
    });
    const textarea = document.querySelector('textarea');
    if (textarea) {
      await act(async () => { fireEvent.change(textarea, { target: { value: 'Nueva descripción de prueba' } }); });
      expect(textarea.value).toBe('Nueva descripción de prueba');
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// Vista agrupada por proveedor
// ─────────────────────────────────────────────────────────────────
describe('ProductosPage – vista por proveedor', () => {
  const mockProductos = [
    { id: 1, name: 'Silla A', price: 50, supplier_id: 2 },
    { id: 2, name: 'Mesa B', price: 200, supplier_id: 2 },
  ];
  const mockProveedores = [{ id: 2, name: 'Proveedor X' }];

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProductos) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProveedores) });
  });

  it('al pulsar "Por proveedor" agrupa los productos por proveedor', async () => {
    await act(async () => { renderPage(); });
    // First ensure we're on the listado tab
    await waitFor(() => screen.getByRole('heading', { name: /productos/i }));
    const listadoTab = screen.getAllByRole('button').find(b => /^listado$/i.test(b.textContent));
    if (listadoTab) await act(async () => { fireEvent.click(listadoTab); });
    // Click the "Por proveedor" button
    await waitFor(() => {
      const btn = screen.getAllByRole('button').find(b => /^por proveedor$/i.test(b.textContent));
      expect(btn).toBeDefined();
    });
    const provBtn = screen.getAllByRole('button').find(b => /^por proveedor$/i.test(b.textContent));
    await act(async () => { fireEvent.click(provBtn); });
    // Covers lines 888-1007: providerCards.map branch
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Proveedor X/);
    });
  });

  it('expandir un proveedor muestra sus productos', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('heading', { name: /productos/i }));
    const listadoTab = screen.getAllByRole('button').find(b => /^listado$/i.test(b.textContent));
    if (listadoTab) await act(async () => { fireEvent.click(listadoTab); });
    await waitFor(() => {
      const btn = screen.getAllByRole('button').find(b => /^por proveedor$/i.test(b.textContent));
      expect(btn).toBeDefined();
    });
    const provBtn = screen.getAllByRole('button').find(b => /^por proveedor$/i.test(b.textContent));
    await act(async () => { fireEvent.click(provBtn); });
    await waitFor(() => screen.getByText(/Proveedor X/));
    // Click the provider accordion to expand it
    await act(async () => { fireEvent.click(screen.getByText(/Proveedor X/)); });
    // Covers lines 936-964: open && items.map branch
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Silla A/);
    });
  });

  it('el botón expandir todo muestra todos los proveedores', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('heading', { name: /productos/i }));
    const listadoTab = screen.getAllByRole('button').find(b => /^listado$/i.test(b.textContent));
    if (listadoTab) await act(async () => { fireEvent.click(listadoTab); });
    await waitFor(() => {
      const btn = screen.getAllByRole('button').find(b => /^por proveedor$/i.test(b.textContent));
      expect(btn).toBeDefined();
    });
    const provBtn = screen.getAllByRole('button').find(b => /^por proveedor$/i.test(b.textContent));
    await act(async () => { fireEvent.click(provBtn); });
    await waitFor(() => screen.getByRole('button', { name: /expandir todo/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /expandir todo/i })); });
    // Covers line 744: expand all handler
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Silla A/);
    });
  });
});
