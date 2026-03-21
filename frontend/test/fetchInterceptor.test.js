/**
 * fetchInterceptor.test.js
 * Verifies that the global fetch interceptor injects the Authorization header
 * for requests targeting the backend BASE_URL, and leaves other requests untouched.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config.js', () => ({ BASE_URL: 'https://api.example.com' }));
vi.mock('../src/api/auth.js', () => ({ getToken: vi.fn(), removeToken: vi.fn() }));

import { getToken, removeToken } from '../src/api/auth.js';

const nativeFetch = globalThis.fetch;
let interceptedFetch;

beforeAll(async () => {
  await import('../src/api/fetchInterceptor.js');
  interceptedFetch = globalThis.fetch;
});

describe('fetchInterceptor', () => {
  beforeEach(() => {
    nativeFetch.mockClear();
    removeToken.mockClear();
    getToken.mockReturnValue(null);
    vi.stubGlobal('location', { replace: vi.fn() });
  });

  it('patches globalThis.fetch', () => {
    expect(interceptedFetch).not.toBe(nativeFetch);
  });

  it('injects Authorization header when token exists and URL matches BASE_URL', async () => {
    getToken.mockReturnValue('my-jwt-token');
    nativeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await interceptedFetch('https://api.example.com/api/clientes/get');
    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('does not inject Authorization header when no token', async () => {
    getToken.mockReturnValue(null);
    nativeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await interceptedFetch('https://api.example.com/api/clientes/get');
    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('does not inject Authorization header for external URLs', async () => {
    getToken.mockReturnValue('my-jwt-token');
    nativeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await interceptedFetch('https://external-service.com/data');
    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it('preserves existing headers alongside Authorization', async () => {
    getToken.mockReturnValue('tok');
    nativeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await interceptedFetch('https://api.example.com/api/test', {
      headers: { 'Content-Type': 'application/json' },
    });
    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('forwards the original input and options to native fetch', async () => {
    getToken.mockReturnValue(null);
    nativeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const options = { method: 'POST', body: 'hello' };
    await interceptedFetch('https://other.com/path', options);
    const [url, init] = nativeFetch.mock.calls[0];
    expect(url).toBe('https://other.com/path');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('hello');
  });

  it('handles Request objects by reading their URL', async () => {
    getToken.mockReturnValue('req-token');
    nativeFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const req = new Request('https://api.example.com/api/productos/get');
    await interceptedFetch(req);
    const [, init] = nativeFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer req-token');
  });

  it('on 401 from backend: calls removeToken and redirects to /login', async () => {
    getToken.mockReturnValue('expired-token');
    nativeFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await interceptedFetch('https://api.example.com/api/clientes/get');
    expect(removeToken).toHaveBeenCalledOnce();
    expect(window.location.replace).toHaveBeenCalledWith('/login');
  });

  it('on 401 from external URL: does NOT call removeToken', async () => {
    getToken.mockReturnValue('tok');
    nativeFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await interceptedFetch('https://external.com/api');
    expect(removeToken).not.toHaveBeenCalled();
  });
});
