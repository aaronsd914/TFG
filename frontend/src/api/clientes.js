import { apiFetch } from './http.js';

export const getClientes = () => apiFetch('clientes/get');

export const getCliente = (id) => apiFetch(`clientes/get/${id}`);

export const createCliente = (payload) =>
  apiFetch('clientes/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateCliente = (id, payload) =>
  apiFetch(`clientes/put/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const deleteCliente = (id) =>
  apiFetch(`clientes/delete/${id}`, { method: 'DELETE' });
