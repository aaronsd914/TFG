import { apiFetch, apiFetchBlob } from './http.js';

export const getAlbaranes = () => apiFetch('albaranes/get');

export const getAlbaran = (id) => apiFetch(`albaranes/get/${id}`);

export const createAlbaran = (payload) =>
  apiFetch('albaranes/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateEstadoAlbaran = (id, estado) =>
  apiFetch(`albaranes/estado/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });

export const deleteAlbaran = (id) =>
  apiFetch(`albaranes/delete/${id}`, { method: 'DELETE' });

export const exportAlbaranPdf = (id) =>
  apiFetchBlob(`albaranes/pdf/${id}`);
