import { describe, expect, it, vi } from 'vitest';
import { pushCollections, pullCollections } from '../collections.js';

const context = {
  apiUrl: 'https://nuvio.test',
  apikey: 'test-key',
  accessToken: 'token-123',
  profileId: 42,
};

describe('pushCollections', () => {
  it('calls sync_push_collections RPC and returns success with rpc method', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const result = await pushCollections({
      ...context,
      collectionsJson: [{ name: 'Animación' }],
      fetchImpl,
    });

    expect(result).toEqual({ success: true, method: 'rpc' });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://nuvio.test/rest/v1/rpc/sync_push_collections');
    expect(JSON.parse(options.body)).toEqual({
      p_profile_id: 42,
      p_collections_json: [{ name: 'Animación' }],
    });
  });

  it('falls back to REST collections when RPC fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ message: 'Function not found' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({}, { status: 201 }));

    const result = await pushCollections({
      ...context,
      collectionsJson: [{ name: 'Series' }],
      fetchImpl,
    });

    expect(result).toEqual({ success: true, method: 'rest_fallback' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [fallbackUrl, fallbackOpts] = fetchImpl.mock.calls[1];
    expect(fallbackUrl).toBe('https://nuvio.test/rest/v1/collections');
    expect(fallbackOpts.headers.Prefer).toBe('resolution=merge-duplicates');
  });

  it('throws RPC error when both RPC and REST fallback fail', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ message: 'RPC failed' }, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ message: 'REST failed' }, { status: 500 }));

    await expect(pushCollections({
      ...context,
      collectionsJson: [],
      fetchImpl,
    })).rejects.toMatchObject({ status: 500 });
  });
});

describe('pullCollections', () => {
  it('reads collections directly from sync_pull_collections RPC array', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json([{ id: 'c1', name: 'Películas' }]));
    const result = await pullCollections({ ...context, fetchImpl });
    expect(result).toEqual([{ id: 'c1', name: 'Películas' }]);
  });

  it('reads collections from RPC object wrapping a collections property', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ collections: [{ id: 'c2' }] }));
    const result = await pullCollections({ ...context, fetchImpl });
    expect(result).toEqual([{ id: 'c2' }]);
  });

  it('falls back to collections REST table when RPC fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json([{ id: 'c3', title: 'Rest Col' }]));

    const result = await pullCollections({ ...context, fetchImpl });
    expect(result).toEqual([{ id: 'c3', title: 'Rest Col' }]);
  });

  it('falls back to profile_collections REST table when collections table is empty', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([{ id: 'c4', title: 'Profile Col' }]));

    const result = await pullCollections({ ...context, fetchImpl });
    expect(result).toEqual([{ id: 'c4', title: 'Profile Col' }]);
  });

  it('returns empty array when all endpoints fail or return empty', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }));

    const result = await pullCollections({ ...context, fetchImpl });
    expect(result).toEqual([]);
  });
});
