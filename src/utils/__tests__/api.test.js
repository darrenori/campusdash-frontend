import { apiRequest } from '../api.js';

// Mock dependencies so the API util doesn't trigger real network calls,
// real auth-store logic, or real router navigation during tests.
jest.mock('../../stores/auth.js', () => ({
  useAuthStore: jest.fn(() => ({
    logout: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../router/index.js', () => ({
  __esModule: true,
  default: { push: jest.fn() },
}));

const BASE = 'http://localhost:8080/api';

// Helpers to build fetch mock responses
const okResponse = (body) => ({
  status: 200,
  ok: true,
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  json: jest.fn().mockResolvedValue(body),
});

const errorResponse = (status, body) => ({
  status,
  ok: false,
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  json: jest.fn().mockResolvedValue(body),
});

const emptyResponse = () => ({
  status: 204,
  ok: true,
  text: jest.fn().mockResolvedValue(''),
});

describe('apiRequest', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  // ── GET ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('calls fetch with the correct URL and credentials', async () => {
      global.fetch.mockResolvedValue(okResponse({ ok: true }));
      await apiRequest.get('/test');
      expect(fetch).toHaveBeenCalledWith(`${BASE}/test`, {
        method: 'GET',
        credentials: 'include',
      });
    });

    it('returns parsed JSON on success', async () => {
      global.fetch.mockResolvedValue(okResponse({ value: 42 }));
      const result = await apiRequest.get('/test');
      expect(result).toEqual({ value: 42 });
    });

    it('returns null for an empty response body', async () => {
      global.fetch.mockResolvedValue(emptyResponse());
      const result = await apiRequest.get('/test');
      expect(result).toBeNull();
    });

    it('throws when the server returns a non-OK status', async () => {
      global.fetch.mockResolvedValue(errorResponse(500, { error: 'Server error' }));
      await expect(apiRequest.get('/test')).rejects.toThrow('Server error');
    });

    it('throws a session-expired error on 401', async () => {
      global.fetch.mockResolvedValue({ status: 401, ok: false, text: jest.fn().mockResolvedValue('') });
      await expect(apiRequest.get('/test')).rejects.toThrow('Session expired');
    });
  });

  // ── POST ──────────────────────────────────────────────────────────────────

  describe('post', () => {
    it('calls fetch with method POST, JSON headers, and serialised body', async () => {
      global.fetch.mockResolvedValue(okResponse({ created: true }));
      const payload = { name: 'Alice' };
      await apiRequest.post('/resource', payload);
      expect(fetch).toHaveBeenCalledWith(`${BASE}/resource`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
    });

    it('returns parsed JSON on success', async () => {
      global.fetch.mockResolvedValue(okResponse({ id: 99 }));
      const result = await apiRequest.post('/resource', {});
      expect(result).toEqual({ id: 99 });
    });

    it('throws when the server returns a non-OK status', async () => {
      global.fetch.mockResolvedValue(errorResponse(400, { error: 'Bad request' }));
      await expect(apiRequest.post('/resource', {})).rejects.toThrow('Bad request');
    });

    it('does NOT redirect on 401 for /auth/login', async () => {
      const { default: router } = require('../../router/index.js');
      global.fetch.mockResolvedValue({ status: 401, ok: false, text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Unauthorized' })) });
      await expect(apiRequest.post('/auth/login', {})).rejects.toThrow();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  // ── PATCH ─────────────────────────────────────────────────────────────────

  describe('patch', () => {
    it('calls fetch with method PATCH and serialised body', async () => {
      global.fetch.mockResolvedValue(okResponse({ updated: true }));
      await apiRequest.patch('/resource/1', { name: 'Bob' });
      expect(fetch).toHaveBeenCalledWith(`${BASE}/resource/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bob' }),
        credentials: 'include',
      });
    });

    it('returns parsed JSON on success', async () => {
      global.fetch.mockResolvedValue(okResponse({ ok: true }));
      const result = await apiRequest.patch('/resource/1', {});
      expect(result).toEqual({ ok: true });
    });
  });

  // ── PUT ───────────────────────────────────────────────────────────────────

  describe('put', () => {
    it('calls fetch with method PUT and serialised body', async () => {
      global.fetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({ replaced: true }),
      });
      await apiRequest.put('/resource/1', { name: 'Carol' });
      expect(fetch).toHaveBeenCalledWith(`${BASE}/resource/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Carol' }),
        credentials: 'include',
      });
    });
  });

  // ── postFormData ──────────────────────────────────────────────────────────

  describe('postFormData', () => {
    it('calls fetch without a Content-Type header so the browser sets the boundary', async () => {
      global.fetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({ uploaded: true }),
      });
      const fd = new FormData();
      fd.append('file', 'data');
      await apiRequest.postFormData('/upload', fd);
      const [, options] = fetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.headers).toBeUndefined();
      expect(options.body).toBe(fd);
    });
  });
});
