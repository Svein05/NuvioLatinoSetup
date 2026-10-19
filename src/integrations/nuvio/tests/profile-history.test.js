import { describe, expect, it, vi } from 'vitest';
import { readProfileHistory } from '../profile-history.js';

const context = { apiUrl: 'https://nuvio.invalid', accessToken: 'synthetic', apikey: 'public', profileId: 2 };

describe('profile history', () => {
  it('recovers continue-watching rows from REST when the progress RPC returns an empty list', async () => {
    const row = { profile_id: 2, content_id: 'synthetic-movie', position: 120, duration: 3600 };
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([row]));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'progress');
    expect(result.items).toEqual([row]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toContain('/watch_progress?');
    expect(fetchImpl.mock.calls[1][0]).toContain('profile_id=eq.2');
  });

  it('recovers a read through REST after an unavailable RPC without changing profile scope', async () => {
    const row = { profile_id: 2, content_id: 'synthetic-movie', position: 120, duration: 3600 };
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(Response.json([row, { ...row, profile_id: 3 }]));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'progress');
    expect(result.items).toEqual([row]);
  });

  it('does not hide a failed REST check behind a confirmed empty progress list', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    await expect(readProfileHistory({ ...context, fetchImpl }, 'progress')).rejects.toMatchObject({ status: 503 });
  });

  it.each([null, {}, { unexpected: true }])('recovers from a non-list RPC response: %j', async body => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json(body))
      .mockResolvedValueOnce(Response.json([{ profile_id: 2, position: 10 }]));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'progress');
    expect(result.items).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('recovers from an invalid JSON RPC response through a scoped GET', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('invalid json'))
      .mockResolvedValueOnce(Response.json([{ profile_id: 2, position: 10 }]));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'progress');
    expect(result.items).toHaveLength(1);
    expect(fetchImpl.mock.calls[1][1].method).toBe('GET');
  });

  it('preserves read failover on network errors without applying this policy to writes', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new TypeError('synthetic network failure'))
      .mockResolvedValueOnce(Response.json([{ profile_id: 2, position: 10 }]));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'progress');
    expect(result.items).toHaveLength(1);
    expect(fetchImpl.mock.calls[1][1].method).toBe('GET');
  });

  it('does not bypass cancellation by starting another request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn().mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
    await expect(readProfileHistory({ ...context, fetchImpl, signal: controller.signal }, 'progress')).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 400])('does not bypass authentication, permissions or validation after HTTP %s', async status => {
    const fetchImpl = vi.fn(async () => Response.json({}, { status }));
    await expect(readProfileHistory({ ...context, fetchImpl }, 'progress')).rejects.toMatchObject({ status });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('preserves explicit RPC totals for the selected profile', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ items: [{ profile_id: 2 }], total: 150 }));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'progress');
    expect(result).toEqual({ items: [{ profile_id: 2 }], totalCount: 150 });
  });

  it('preserves REST totals while using a compatibility fallback', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json([{ profile_id: 2 }], { headers: { 'content-range': '0-0/150' } }));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'library');
    expect(result.totalCount).toBe(150);
    expect(fetchImpl.mock.calls[1][1].headers.Prefer).toBe('count=exact');
  });

  it('does not trust aggregate counts belonging to a mixed response', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ items: [null, { profile_id: 3 }], total: 150 }));
    const result = await readProfileHistory({ ...context, fetchImpl }, 'watched');
    expect(result).toEqual({ items: [], totalCount: 0 });
  });

  it('reports malformed history instead of inventing an empty list', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ unexpected: true }));
    await expect(readProfileHistory({ ...context, fetchImpl }, 'progress')).rejects.toThrow('formato inválido');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
