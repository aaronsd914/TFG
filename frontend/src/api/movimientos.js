import { apiFetch } from './http.js';

export const getMovements = () => apiFetch('movimientos/get');

export const getMovement = (id) => apiFetch(`movimientos/get/${id}`);

export const createMovement = (payload) =>
  apiFetch('movimientos/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateMovement = (id, payload) =>
  apiFetch(`movimientos/put/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const deleteMovement = (id) =>
  apiFetch(`movimientos/delete/${id}`, { method: 'DELETE' });
