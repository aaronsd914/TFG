import { apiFetch } from './http.js';

export const getMovimientos = () => apiFetch('movimientos/get');

export const getMovimiento = (id) => apiFetch(`movimientos/get/${id}`);

export const createMovimiento = (payload) =>
  apiFetch('movimientos/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateMovimiento = (id, payload) =>
  apiFetch(`movimientos/put/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const deleteMovimiento = (id) =>
  apiFetch(`movimientos/delete/${id}`, { method: 'DELETE' });
