/**
 * fetchInterceptor.js
 * Patches the global fetch so that every request targeting the backend API
 * automatically includes the Authorization: Bearer header.
 * Must be imported once in main.jsx before any component is rendered.
 */
import { BASE_URL } from '../config.js';
import { getToken } from './auth.js';

const _nativeFetch = globalThis.fetch;

globalThis.fetch = function interceptedFetch(input, init = {}) {
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

  return _nativeFetch(input, init);
};
