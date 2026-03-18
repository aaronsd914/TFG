/**
 * fetchInterceptor.test.js
 * Verifies that the global fetch interceptor injects the Authorization header
 * for requests targeting the backend BASE_URL, and leaves other requests untouched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules BEFORE importing the interceptor so its closure picks up the mocks
vi.mock('../src/config.js', () => ({ BASE_URL: 'https://api.example.com' }));
vi.mock('../src/api/auth.js', () => ({ getToken: vi.fn() }));

import { getToken } from '../src/api/auth.js';

// Save the native fetch (already mocked by test-setup.js as vi.fn)
const nativeFetch = globalThis.fetch;

// Import the interceptor — this patches globalThis.fetch as a side effect
await import('../src/api/fetchInterceptor.js');
const interceptedFetch = globalThis.fetch;

describe('fetchInterceptor', () => {
  beforeEach(() => {
    nativeFetch.mockClear();
    getToken.mockReturnValue(null);
  });

  it('patches globalThis.fetch', () => {
    expect(interceptedFetch).not.toBe(nativeFetch);
  });

  it('injects Authorization header when token exists and URL matches BASE_URL', async () => {
    getToken.mockReturnValue('my-jwt-token');
    nativeFetch.mockResolvedValueOnce({ ok: true });

    await interceptedFetch('https://api.example.com/api/clientes/get');

    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('does not inject Authorization header when no token', async () => {
    getToken.mockReturnValue(null);
    nativeFetch.mockResolvedValueOnce({ ok: true });

    await interceptedFetch('https://api.example.com/api/clientes/get');

    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('does not inject Authorization header for external URLs', async () => {
    getToken.mockReturnValue('my-jwt-token');
    nativeFetch.mockResolvedValueOnce({ ok: true });

    await interceptedFetch('https://external-service.com/data');

    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('preserves existing headers alongside Authorization', async () => {
    getToken.mockReturnValue('tok');
    nativeFetch.mockResolvedValueOnce({ ok: true });

    await interceptedFetch('https://api.example.com/api/test', {
      headers: { 'Content-Type': 'application/json' },
    });

    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('forwards the original input and options to native fetch', async () => {
    getToken.mockReturnValue(null);
    nativeFetch.mockResolvedValueOnce({ ok: true });

    const options = { method: 'POST', body: 'hello' };
    await interceptedFetch('https://other.com/path', options);

    const [url, init] = nativeFetch.mock.calls[0];
    expect(url).toBe('https://other.com/path');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('hello');
  });

  it('handles Request objects by reading their URL', async () => {
    getToken.mockReturnValue('req-token');
    nativeFetch.mockResolvedValueOnce({ ok: true });

    const req = new Request('https://api.example.com/api/productos/get');
    await interceptedFetch(req);

    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer req-token');
  });
});
