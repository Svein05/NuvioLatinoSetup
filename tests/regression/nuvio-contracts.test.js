import { afterEach, describe, expect, it, vi } from 'vitest';
import { NuvioClient } from '../../src/integrations/nuvio/client.js';

const context = { apiUrl: 'https://nuvio.invalid', apikey: 'public-test', accessToken: 'synthetic', profileId: 1 };

afterEach(() => vi.unstubAllGlobals());

describe('legacy Nuvio adapter regression contracts', () => {
  it.each(['pullWatchProgress', 'pullWatched', 'pullLibrary'])('%s excludes records of another profile', async method => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([{ profile_id: 2, title: 'Other profile' }])));
    const items = await NuvioClient[method](context);
    expect([...items]).toEqual([]);
    expect(items.totalCount).toBe(0);
  });

  it('does not report successful settings writes when the server rejects them', async () => {
    const fetchMock = vi.fn(async () => Response.json({ code: 'unavailable' }, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(NuvioClient.pushProfileSettings(context)).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('checks an empty progress RPC against the scoped table without inventing items', async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    vi.stubGlobal('fetch', fetchMock);
    expect([...(await NuvioClient.pullWatchProgress(context))]).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
    expect(fetchMock.mock.calls[1][0]).toContain('profile_id=eq.1');
  });
});
