/**
 * Shared API helpers.
 * All functions return parsed JSON or throw an Error with a descriptive message.
 * The JWT token is automatically attached from localStorage.
 */
import { API_URL } from '../config.js';
import { getToken } from './auth.js';

function authHeaders(extra = {}) {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, ...extra }
    : { ...extra };
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ' – ' + text : ''}`);
  }
  return res.json();
}

export async function apiFetchBlob(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ' – ' + text : ''}`);
  }
  return res.blob();
}
