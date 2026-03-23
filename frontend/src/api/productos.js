import { apiFetch } from './http.js';

export const getProducts = () => apiFetch('productos/get');

export const getProduct = (id) => apiFetch(`productos/get/${id}`);

export const searchProducts = (q, limit = 20) =>
  apiFetch(`productos/search?q=${encodeURIComponent(q)}&limit=${limit}`);

export const createProduct = (payload) =>
  apiFetch('productos/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateProduct = (id, payload) =>
  apiFetch(`productos/put/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const deleteProduct = (id) =>
  apiFetch(`productos/delete/${id}`, { method: 'DELETE' });
