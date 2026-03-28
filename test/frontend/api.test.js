/**
 * api.test.js
 * Unit tests for all API helper modules.
 * Mocks apiFetch/apiFetchBlob and verifies each function calls the correct path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/api/http.js', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
  apiFetchBlob: vi.fn(() => Promise.resolve(new Blob(['pdf']))),
}));

import {
  getDeliveryNotes,
  getDeliveryNote,
  createDeliveryNote,
  updateDeliveryNoteStatus,
  exportDeliveryNotePdf,
} from '../../frontend/src/api/albaranes.js';

import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../../frontend/src/api/clientes.js';

import {
  getProducts,
  getProduct,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../frontend/src/api/productos.js';

import {
  getMovements,
  getMovement,
  createMovement,
  updateMovement,
  deleteMovement,
} from '../../frontend/src/api/movimientos.js';

import {
  getAnalyticsSummary,
  getAnalyticsCompare,
  exportTrendsPdf,
  aiChat,
} from '../../frontend/src/api/analytics.js';

import { apiFetch, apiFetchBlob } from '../../frontend/src/api/http.js';

// ─── Albaranes ────────────────────────────────────────────────────────────────
describe('API – albaranes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getDeliveryNotes calls apiFetch albaranes/get', async () => {
    await getDeliveryNotes();
    expect(apiFetch).toHaveBeenCalledWith('albaranes/get');
  });

  it('getDeliveryNote calls apiFetch with id', async () => {
    await getDeliveryNote(42);
    expect(apiFetch).toHaveBeenCalledWith('albaranes/get/42');
  });

  it('createDeliveryNote calls apiFetch POST with payload', async () => {
    const payload = { customer_id: 1, items: [] };
    await createDeliveryNote(payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'albaranes/post',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('updateDeliveryNoteStatus calls apiFetch PATCH', async () => {
    await updateDeliveryNoteStatus(1, 'completado');
    expect(apiFetch).toHaveBeenCalledWith(
      'albaranes/1/estado',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('exportDeliveryNotePdf calls apiFetchBlob', async () => {
    await exportDeliveryNotePdf(5);
    expect(apiFetchBlob).toHaveBeenCalledWith('albaranes/pdf/5');
  });
});

// ─── Clientes ─────────────────────────────────────────────────────────────────
describe('API – clientes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getCustomers calls apiFetch clientes/get', async () => {
    await getCustomers();
    expect(apiFetch).toHaveBeenCalledWith('clientes/get');
  });

  it('getCustomer calls apiFetch with id', async () => {
    await getCustomer(7);
    expect(apiFetch).toHaveBeenCalledWith('clientes/get/7');
  });

  it('createCustomer calls apiFetch POST', async () => {
    const payload = { name: 'Juan', surnames: 'Pérez' };
    await createCustomer(payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'clientes/post',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('updateCustomer calls apiFetch PUT', async () => {
    const payload = { name: 'Juan' };
    await updateCustomer(3, payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'clientes/put/3',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload) }),
    );
  });

  it('deleteCustomer calls apiFetch DELETE', async () => {
    await deleteCustomer(8);
    expect(apiFetch).toHaveBeenCalledWith('clientes/delete/8', { method: 'DELETE' });
  });
});

// ─── Productos ────────────────────────────────────────────────────────────────
describe('API – productos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getProducts calls apiFetch productos/get', async () => {
    await getProducts();
    expect(apiFetch).toHaveBeenCalledWith('productos/get');
  });

  it('getProduct calls apiFetch with id', async () => {
    await getProduct(10);
    expect(apiFetch).toHaveBeenCalledWith('productos/get/10');
  });

  it('searchProducts encodes query and uses limit', async () => {
    await searchProducts('mesa', 5);
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('productos/search?q=mesa&limit=5'),
    );
  });

  it('searchProducts uses default limit 20', async () => {
    await searchProducts('silla');
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
    );
  });

  it('createProduct calls apiFetch POST', async () => {
    const payload = { name: 'Mesa' };
    await createProduct(payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'productos/post',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('updateProduct calls apiFetch PUT', async () => {
    const payload = { name: 'Mesa actualizada' };
    await updateProduct(2, payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'productos/put/2',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload) }),
    );
  });

  it('deleteProduct calls apiFetch DELETE', async () => {
    await deleteProduct(4);
    expect(apiFetch).toHaveBeenCalledWith('productos/delete/4', { method: 'DELETE' });
  });
});

// ─── Movimientos ──────────────────────────────────────────────────────────────
describe('API – movimientos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getMovements calls apiFetch movimientos/get', async () => {
    await getMovements();
    expect(apiFetch).toHaveBeenCalledWith('movimientos/get');
  });

  it('getMovement calls apiFetch with id', async () => {
    await getMovement(3);
    expect(apiFetch).toHaveBeenCalledWith('movimientos/get/3');
  });

  it('createMovement calls apiFetch POST', async () => {
    const payload = { amount: 100 };
    await createMovement(payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'movimientos/post',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('updateMovement calls apiFetch PUT', async () => {
    const payload = { amount: 200 };
    await updateMovement(5, payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'movimientos/put/5',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload) }),
    );
  });

  it('deleteMovement calls apiFetch DELETE', async () => {
    await deleteMovement(9);
    expect(apiFetch).toHaveBeenCalledWith('movimientos/delete/9', { method: 'DELETE' });
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
describe('API – analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAnalyticsSummary with dates builds correct URL', async () => {
    await getAnalyticsSummary('2024-01-01', '2024-12-31');
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('analytics/summary'),
    );
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('date_from=2024-01-01'),
    );
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('date_to=2024-12-31'),
    );
  });

  it('getAnalyticsSummary without dates passes empty params', async () => {
    await getAnalyticsSummary();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('analytics/summary'));
  });

  it('getAnalyticsCompare with dates builds correct URL', async () => {
    await getAnalyticsCompare('2024-01-01', '2024-06-30');
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('analytics/compare'),
    );
  });

  it('getAnalyticsCompare without dates also works', async () => {
    await getAnalyticsCompare();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('analytics/compare'));
  });

  it('exportTrendsPdf calls apiFetchBlob with params', async () => {
    await exportTrendsPdf('2024-01-01', '2024-12-31', true);
    expect(apiFetchBlob).toHaveBeenCalledWith(
      expect.stringContaining('analytics/export/pdf'),
    );
    expect(apiFetchBlob).toHaveBeenCalledWith(
      expect.stringContaining('include_compare=true'),
    );
  });

  it('exportTrendsPdf with includeCompare=false', async () => {
    await exportTrendsPdf('2024-01-01', '2024-12-31', false);
    expect(apiFetchBlob).toHaveBeenCalledWith(
      expect.stringContaining('include_compare=false'),
    );
  });

  it('aiChat calls apiFetch POST', async () => {
    const payload = { message: 'hello' };
    await aiChat(payload);
    expect(apiFetch).toHaveBeenCalledWith(
      'ai/chat',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });
});
