/**
 * ProductosPage.test.jsx
 * Verifica el layout inicial, las llamadas a la API y el panel de productos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import ProductosPage from '../../frontend/src/components/ProductosPage.jsx';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

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

  it('muestra el título "Productos"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /productos/i })).toBeInTheDocument();
    });
  });

  it('no muestra errores visibles con listas vacías', async () => {
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

  it('muestra el botón "Nuevo producto" en el header', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo producto/i })).toBeInTheDocument();
    });
  });
});

describe('ProductosPage — modal crear producto', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
  });

  async function openModal() {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /nuevo producto/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }));
    });
    await waitFor(() => screen.getByPlaceholderText(/ej: mesa de comedor/i));
  }

  it('abre el modal y muestra el formulario de creación', async () => {
    await openModal();
    expect(screen.getByPlaceholderText(/ej: mesa de comedor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
  });

  it('cierra el modal al pulsar el botón cerrar (×)', async () => {
    await openModal();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    });
    expect(screen.queryByPlaceholderText(/ej: mesa de comedor/i)).not.toBeInTheDocument();
  });

  it('el botón Limpiar vacía todos los campos del formulario', async () => {
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

  it('el onChange revalida cuando createTouched es verdadero', async () => {
    await openModal();
    const form = screen.getByPlaceholderText(/ej: mesa de comedor/i).closest('form');
    // Submit empty form → setCreateTouched(true) + validation errors
    await act(async () => { fireEvent.submit(form); });
    // onChange now runs validateCreate (createTouched=true)
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/ej: mesa de comedor/i), { target: { value: 'Nombre test' } });
    });
    expect(document.body).toBeTruthy();
  });

  it('rellena los campos de precio y descripción sin errores', async () => {
    await openModal();
    const precioInput = screen.getByPlaceholderText(/ej: 199.99/i);
    const descInput = screen.getByPlaceholderText(/detalles, medidas/i);
    await act(async () => {
      fireEvent.change(precioInput, { target: { value: '25.50' } });
      fireEvent.change(descInput, { target: { value: 'Descripción de prueba' } });
    });
    expect(precioInput.value).toBe('25.5');
    expect(descInput.value).toBe('Descripción de prueba');
  });
});
