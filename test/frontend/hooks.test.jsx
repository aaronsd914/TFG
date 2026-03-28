/**
 * hooks.test.jsx
 * Unit tests for custom React hooks built on react-query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('../../frontend/src/api/clientes.js', () => ({
  getCustomers: vi.fn(),
}));

vi.mock('../../frontend/src/api/movimientos.js', () => ({
  getMovements: vi.fn(),
}));

vi.mock('../../frontend/src/api/productos.js', () => ({
  getProducts: vi.fn(),
}));

vi.mock('../../frontend/src/api/http.js', () => ({
  apiFetch: vi.fn(),
}));

import { getCustomers } from '../../frontend/src/api/clientes.js';
import { getMovements } from '../../frontend/src/api/movimientos.js';
import { getProducts } from '../../frontend/src/api/productos.js';
import { apiFetch } from '../../frontend/src/api/http.js';

import { useCustomers } from '../../frontend/src/hooks/useClientes.js';
import { useMovements } from '../../frontend/src/hooks/useMovimientos.js';
import { useProducts } from '../../frontend/src/hooks/useProductos.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ─── useCustomers ─────────────────────────────────────────────────────────────
describe('useCustomers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns customer data when API resolves', async () => {
    const mockData = [{ id: 1, name: 'Ana', surnames: 'García' }];
    getCustomers.mockResolvedValue(mockData);

    const { result } = renderHook(() => useCustomers(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('returns error message when API rejects', async () => {
    getCustomers.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCustomers(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toEqual([]);
  });

  it('exposes reload function', async () => {
    getCustomers.mockResolvedValue([]);
    const { result } = renderHook(() => useCustomers(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.reload).toBe('function');
  });
});

// ─── useMovements ─────────────────────────────────────────────────────────────
describe('useMovements', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns movements data when API resolves', async () => {
    const mockData = [{ id: 1, amount: 100, type: 'INGRESO' }];
    getMovements.mockResolvedValue(mockData);

    const { result } = renderHook(() => useMovements(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('returns error message when API rejects', async () => {
    getMovements.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useMovements(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toBe('Server error');
  });
});

// ─── useProducts ──────────────────────────────────────────────────────────────
describe('useProducts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('merges product with supplier name', async () => {
    const mockProducts = [{ id: 1, name: 'Mesa', supplier_id: 10 }];
    const mockSuppliers = [{ id: 10, name: 'Proveedor ABC' }];
    getProducts.mockResolvedValue(mockProducts);
    apiFetch.mockResolvedValue(mockSuppliers);

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0]._supplierName).toBe('Proveedor ABC');
  });

  it('returns empty _supplierName if supplier not found', async () => {
    const mockProducts = [{ id: 1, name: 'Mesa', supplier_id: 99 }];
    const mockSuppliers = [{ id: 10, name: 'Proveedor XYZ' }];
    getProducts.mockResolvedValue(mockProducts);
    apiFetch.mockResolvedValue(mockSuppliers);

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0]._supplierName).toBe('');
  });

  it('returns error message when products API rejects', async () => {
    getProducts.mockRejectedValue(new Error('Productos error'));
    apiFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useProducts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toBe('Productos error');
  });
});
