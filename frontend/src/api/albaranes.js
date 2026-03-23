import { apiFetch, apiFetchBlob } from './http.js';

export const getDeliveryNotes = () => apiFetch('albaranes/get');

export const getDeliveryNote = (id) => apiFetch(`albaranes/get/${id}`);

export const createDeliveryNote = (payload) =>
  apiFetch('albaranes/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateDeliveryNoteStatus = (id, status) =>
  apiFetch(`albaranes/estado/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

export const deleteDeliveryNote = (id) =>
  apiFetch(`albaranes/delete/${id}`, { method: 'DELETE' });

export const exportDeliveryNotePdf = (id) =>
  apiFetchBlob(`albaranes/pdf/${id}`);
