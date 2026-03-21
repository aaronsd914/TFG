/**
 * fetchInterceptor.js
 * Patches the global fetch so that every request targeting the backend API
 * automatically includes the Authorization: Bearer header.
 * On 401 responses, clears the token and redirects to /login.
 * Must be imported once in main.jsx before any component is rendered.
 */
import { BASE_URL } from '../config.js';
import { getToken, removeToken } from './auth.js';

const _nativeFetch = globalThis.fetch;

globalThis.fetch = async function interceptedFetch(input, init = {}) {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);

  const token = getToken();
  if (token && url.startsWith(BASE_URL)) {
    init = {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    };
  }

  const response = await _nativeFetch(input, init);

  if (response.status === 401 && url.startsWith(BASE_URL)) {
    removeToken();
    window.location.replace('/login');
  }

  return response;
};
