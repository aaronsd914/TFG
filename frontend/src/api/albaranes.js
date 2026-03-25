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
  apiFetch(`albaranes/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

export const exportDeliveryNotePdf = (id) =>
  apiFetchBlob(`albaranes/pdf/${id}`);
