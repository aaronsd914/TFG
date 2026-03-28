/**
 * http.test.js
 * Tests the error paths in apiFetch and apiFetchBlob.
 * Does NOT mock http.js so the real code is exercised.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/api/auth.js', () => ({
  getToken: vi.fn(() => null),
}));

import { apiFetch, apiFetchBlob } from '../../frontend/src/api/http.js';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) })
    );
    const result = await apiFetch('some/path');
    expect(result).toEqual({ id: 1 });
  });

  it('throws Error when response is not ok', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('resource not found'),
      })
    );
    await expect(apiFetch('some/path')).rejects.toThrow('404 Not Found');
  });

  it('throws Error without body text when text() fails', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.reject(new Error('no body')),
      })
    );
    await expect(apiFetch('some/path')).rejects.toThrow('500 Internal Server Error');
  });

  it('attaches Authorization header when token is present', async () => {
    const { getToken } = await import('../../frontend/src/api/auth.js');
    getToken.mockReturnValue('test-token');

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
    await apiFetch('some/path');
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
  });
});

describe('apiFetchBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns blob on success', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
    );
    const result = await apiFetchBlob('some/file.pdf');
    expect(result).toBe(mockBlob);
  });

  it('throws Error when response is not ok', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('access denied'),
      })
    );
    await expect(apiFetchBlob('some/file.pdf')).rejects.toThrow('403 Forbidden');
  });

  it('throws Error without body text when text() fails on error', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.reject(new Error('stream error')),
      })
    );
    await expect(apiFetchBlob('some/file.pdf')).rejects.toThrow('500 Server Error');
  });

  it('passes extra options to fetch', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) })
    );
    await apiFetchBlob('download', { headers: { 'X-Custom': 'value' } });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Custom': 'value' }),
      })
    );
  });
});
