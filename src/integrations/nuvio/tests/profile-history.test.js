import { describe, expect, it, vi } from 'vitest';
import { readProfileHistory } from '../profile-history.js';

const context = { apiUrl: 'https://nuvio.invalid', accessToken: 'synthetic', apikey: 'public', profileId: 2 };

describe('profile history', () => {
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
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
