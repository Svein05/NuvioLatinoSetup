import { describe, expect, it, vi } from 'vitest';
import { pushProfileSettings } from '../profile-settings.js';
import { buildSettingsPayload } from '../settings-payload.js';

const context = { apiUrl: 'https://nuvio.invalid', apikey: 'public-test', accessToken: 'synthetic', profileId: 2 };

describe('profile settings writes', () => {
  it('falls back only for a missing compatible RPC and confirms REST success', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(pushProfileSettings({ ...context, fetchImpl })).resolves.toMatchObject({ method: 'rest_fallback' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const [url, options] = fetchImpl.mock.calls[2];
    expect(url).toBe('https://nuvio.invalid/rest/v1/profile_settings');
    expect(JSON.parse(options.body)).toMatchObject({ profile_id: 2, platform: 'tv' });
  });

  it.each([401, 403, 503])('does not retry writes after HTTP %s', async status => {
    const fetchImpl = vi.fn(async () => Response.json({}, { status }));
    await expect(pushProfileSettings({ ...context, fetchImpl })).rejects.toMatchObject({ status });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports an unknown write outcome without retrying on network failure', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('offline'); });
    await expect(pushProfileSettings({ ...context, fetchImpl })).rejects.toMatchObject({ outcome: 'unknown' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not report success when the final REST fallback fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    await expect(pushProfileSettings({ ...context, fetchImpl })).rejects.toMatchObject({ status: 503 });
  });
});

describe('settings payload compatibility', () => {
  it('preserves badges, languages and platform schemas without mutating inputs', () => {
    const settings = { enrichment_enabled: true, ratings_enabled: true, tmdb_api_key: 'key',
      mdblist_api_key: 'ratings', stream_badge_settings: { custom: true } };
    const snapshot = structuredClone(settings);
    const result = buildSettingsPayload(settings, 'desktop');
    expect(result.version).toBe(4);
    expect(result.features.stream_badge_settings).toEqual({ custom: true });
    expect(result.features.tmdb_settings.tmdb_language.value).toBe('es-MX');
    expect(result.features.mdblist_settings.mdblist_show_imdb.value).toBe(true);
    expect(result.features.mdblist_settings.mdblist_use_imdb.value).toBe(true);
    expect(settings).toEqual(snapshot);
  });
});
