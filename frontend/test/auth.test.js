/**
 * auth.test.js
 * Tests unitarios para api/auth.js:
 * login(), saveToken(), getToken(), removeToken(), isAuthenticated()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  login,
  saveToken,
  getToken,
  removeToken,
  isAuthenticated,
} from '../src/api/auth.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeJwt(exp) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'admin', exp }));
  return `${header}.${payload}.signature`;
}

// ── localStorage helpers ─────────────────────────────────────────────────────

describe('saveToken / getToken / removeToken', () => {
  beforeEach(() => localStorage.clear());

  it('saveToken almacena el token en localStorage', () => {
    saveToken('abc.def.ghi');
    expect(localStorage.getItem('token')).toBe('abc.def.ghi');
  });

  it('getToken devuelve null si no hay token', () => {
    expect(getToken()).toBeNull();
  });

  it('getToken devuelve el token almacenado', () => {
    localStorage.setItem('token', 'tok');
    expect(getToken()).toBe('tok');
  });

  it('removeToken elimina el token', () => {
    localStorage.setItem('token', 'tok');
    removeToken();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

// ── isAuthenticated ──────────────────────────────────────────────────────────

describe('isAuthenticated', () => {
  beforeEach(() => localStorage.clear());

  it('devuelve false si no hay token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('devuelve false si el token no es un JWT válido', () => {
    localStorage.setItem('token', 'invalid-token');
    expect(isAuthenticated()).toBe(false);
  });

  it('devuelve false si el token ha expirado', () => {
    const expiredToken = makeJwt(Math.floor(Date.now() / 1000) - 3600);
    localStorage.setItem('token', expiredToken);
    expect(isAuthenticated()).toBe(false);
  });

  it('devuelve true si el token es válido y no ha expirado', () => {
    const validToken = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('token', validToken);
    expect(isAuthenticated()).toBe(true);
  });
});

// ── login() ──────────────────────────────────────────────────────────────────

describe('login', () => {
  afterEach(() => vi.restoreAllMocks());

  it('devuelve el token en login correcto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'tok123', token_type: 'bearer' }),
    });

    const result = await login('admin', 'admin123');
    expect(result.access_token).toBe('tok123');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('llama al endpoint correcto con body form-urlencoded', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'x', token_type: 'bearer' }),
    });

    await login('user1', 'pass1');
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/api/auth/login');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(opts.body.toString()).toContain('username=user1');
  });

  it('lanza error con el mensaje del servidor si la respuesta no es ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Credenciales incorrectas' }),
    });

    await expect(login('admin', 'wrong')).rejects.toThrow('Credenciales incorrectas');
  });

  it('lanza error genérico si la respuesta no tiene detail', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('parse error')),
    });

    await expect(login('admin', 'wrong')).rejects.toThrow('Credenciales incorrectas');
  });
});
