import { BASE_URL } from '../config.js';
import i18n from '../i18n.js';

/**
 * Login: returns { access_token, token_type } or throws on error.
 */
export async function login(username, password) {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || i18n.t('common.invalidCredentials'));
  }
  return res.json();
}

export function saveToken(token) {
  localStorage.setItem('token', token);
}

export function getToken() {
  return localStorage.getItem('token');
}

export function removeToken() {
  localStorage.removeItem('token');
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    // JWT uses Base64url (- and _ instead of + and /). atob() needs standard Base64.
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
