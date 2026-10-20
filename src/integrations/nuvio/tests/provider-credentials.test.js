import { describe, expect, it, vi } from 'vitest';
import { pushProviderCredentials, pullProviderCredentials } from '../provider-credentials.js';

const context = { apiUrl: 'https://nuvio.test', apikey: 'key-1', accessToken: 'token-1', profileId: 5 };

describe('pushProviderCredentials', () => {
  it('returns count 0 without making requests when credentials array is empty or invalid', async () => {
    const fetchImpl = vi.fn();
    const result = await pushProviderCredentials({ ...context, credentials: [], fetchImpl });
    expect(result).toEqual({ success: true, count: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('pushes credentials successfully via sync_push_provider_credentials RPC', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const result = await pushProviderCredentials({
      ...context,
      credentials: [{ provider: 'TMDB', credential_json: { api_key: 'abc' } }],
      fetchImpl,
    });
    expect(result).toEqual({ success: true, method: 'rpc', count: 1 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://nuvio.test/rest/v1/rpc/sync_push_provider_credentials');
    expect(JSON.parse(options.body)).toMatchObject({
      p_profile_id: 5,
      p_credentials: [{ provider: 'tmdb', credential_json: { api_key: 'abc' } }],
    });
  });

  it('falls back to sync_seed_provider_credentials when push RPC fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await pushProviderCredentials({
      ...context,
      credentials: [{ provider: 'mdblist', credential_json: { api_key: 'xyz' } }],
      fetchImpl,
    });
    expect(result).toEqual({ success: true, method: 'rpc_seed', count: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toBe('https://nuvio.test/rest/v1/rpc/sync_seed_provider_credentials');
  });

  it('falls back to REST provider_credentials table when both RPCs fail', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));

    const result = await pushProviderCredentials({
      ...context,
      credentials: [{ provider: 'tmdb', credential_json: { api_key: 'abc' } }],
      fetchImpl,
    });
    expect(result).toEqual({ success: true, method: 'rest_fallback', count: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const [url, options] = fetchImpl.mock.calls[2];
    expect(url).toBe('https://nuvio.test/rest/v1/provider_credentials');
    expect(options.headers.Prefer).toBe('resolution=merge-duplicates');
  });
});

describe('pullProviderCredentials', () => {
  it('reads credentials from sync_pull_provider_credentials RPC', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json([{ provider: 'tmdb' }]));
    const result = await pullProviderCredentials({ ...context, fetchImpl });
    expect(result).toEqual([{ provider: 'tmdb' }]);
  });

  it('falls back to REST provider_credentials table when RPC fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json([{ provider: 'mdblist' }]));

    const result = await pullProviderCredentials({ ...context, fetchImpl });
    expect(result).toEqual([{ provider: 'mdblist' }]);
  });

  it('reports an outage without replacing credentials with an empty array', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }));

    await expect(pullProviderCredentials({ ...context, fetchImpl })).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
