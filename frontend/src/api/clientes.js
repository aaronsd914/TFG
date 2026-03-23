import { apiFetch } from './http.js';

export const getCustomers = () => apiFetch('clientes/get');

export const getCustomer = (id) => apiFetch(`clientes/get/${id}`);

export const createCustomer = (payload) =>
  apiFetch('clientes/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateCustomer = (id, payload) =>
  apiFetch(`clientes/put/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const deleteCustomer = (id) =>
  apiFetch(`clientes/delete/${id}`, { method: 'DELETE' });
