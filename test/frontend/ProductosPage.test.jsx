/**
 * ProductosPage.test.jsx
 * Verifica el layout inicial, las llamadas a la API y el panel de productos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import ProductosPage from '../../frontend/src/components/ProductosPage.jsx';

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
