import { describe, expect, it, vi } from 'vitest';
import { listPlugins } from '../plugins.js';
import { pullProfileSettings } from '../profile-settings-read.js';

const context = { apiUrl: 'https://nuvio.test', apikey: 'key-1', accessToken: 'token-1', profileId: 7 };

describe('listPlugins', () => {
  it('reads plugins from sync_pull_plugins RPC', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json([{ name: 'Plugin 1' }]));
    const result = await listPlugins({ ...context, fetchImpl });
    expect(result).toEqual([{ name: 'Plugin 1' }]);
  });

  it('falls back to plugins REST table when RPC fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json([{ name: 'Plugin 2' }]));

    const result = await listPlugins({ ...context, fetchImpl });
    expect(result).toEqual([{ name: 'Plugin 2' }]);
  });

  it('returns empty array when all plugin requests fail', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }));

    const result = await listPlugins({ ...context, fetchImpl });
    expect(result).toEqual([]);
  });
});

describe('pullProfileSettings', () => {
  it('reads settings from sync_pull_profile_settings_blob RPC', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ tmdb_language: 'es-MX' }));
    const result = await pullProfileSettings({ ...context, fetchImpl });
    expect(result).toEqual({ tmdb_language: 'es-MX' });
  });

  it('falls back to REST profile_settings with platform query when RPC fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json([{ settings: { language: 'es-MX' } }]));

    const result = await pullProfileSettings({ ...context, platform: 'desktop', fetchImpl });
    expect(result).toEqual({ language: 'es-MX' });
  });

  it('returns null when no settings are found or endpoints fail', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([]));

    const result = await pullProfileSettings({ ...context, fetchImpl });
    expect(result).toBeNull();
  });
});
