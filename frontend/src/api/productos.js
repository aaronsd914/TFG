import { apiFetch } from './http.js';

export const getProductos = () => apiFetch('productos/get');

export const getProducto = (id) => apiFetch(`productos/get/${id}`);

export const searchProductos = (q, limit = 20) =>
  apiFetch(`productos/search?q=${encodeURIComponent(q)}&limit=${limit}`);

export const createProducto = (payload) =>
  apiFetch('productos/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateProducto = (id, payload) =>
  apiFetch(`productos/put/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const deleteProducto = (id) =>
  apiFetch(`productos/delete/${id}`, { method: 'DELETE' });
