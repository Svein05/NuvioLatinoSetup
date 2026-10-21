import { describe, expect, it, vi } from 'vitest';
import { requestJson } from './request-json.js';

describe('JSON transport', () => {
  it('returns JSON and accepts a bodyless acknowledged response', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ value: 3 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(requestJson('https://synthetic.invalid', { fetchImpl })).resolves.toEqual({ value: 3 });
    await expect(requestJson('https://synthetic.invalid', { fetchImpl })).resolves.toBeNull();
  });

  it('redacts server response details while preserving HTTP status and compatibility code', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ code: 'PGRST202', detail: 'synthetic-secret' }, { status: 404 }));
    const error = await requestJson('https://synthetic.invalid', { fetchImpl }).catch(error => error);
    expect(error.status).toBe(404);
    expect(error.code).toBe('PGRST202');
    expect(error.message).not.toContain('synthetic-secret');
  });

  it('treats an unreadable successful write response as an unknown outcome', async () => {
    const fetchImpl = vi.fn(async () => new Response('invalid json', { status: 200 }));
    await expect(requestJson('https://synthetic.invalid', { fetchImpl, method: 'POST' }))
      .rejects.toMatchObject({ outcome: 'unknown' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps HTTP failures identifiable when their bodies are not JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('synthetic-private-body', { status: 503 }));
    await expect(requestJson('https://synthetic.invalid', { fetchImpl }))
      .rejects.toMatchObject({ status: 503, outcome: 'failed' });
  });

  it('cancels a pending read when its timeout expires', async () => {
    const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    await expect(requestJson('https://synthetic.invalid', { fetchImpl, timeoutMs: 5 }))
      .rejects.toMatchObject({ outcome: 'failed' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
