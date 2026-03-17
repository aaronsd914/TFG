/**
 * Shared API helpers.
 * All functions return parsed JSON or throw an Error with a descriptive message.
 */
import { API_URL } from '../config.js';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ' – ' + text : ''}`);
  }
  return res.json();
}

export async function apiFetchBlob(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ' – ' + text : ''}`);
  }
  return res.blob();
}
