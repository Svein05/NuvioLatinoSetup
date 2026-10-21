import { expect, it, vi } from 'vitest';
import { installAddon, deleteAddon, updateAddon, installOrUpdateAioAddon } from '../addons.js';
import { pushProviderCredentials, pullProviderCredentials } from '../provider-credentials.js';
import { pullProfileSettings } from '../profile-settings-read.js';

const context = { apiUrl: 'https://nuvio.test', userId: 'synthetic', profileId: 1, accessToken: 'synthetic' };

it('does not repeat an ambiguous installation using a different POST payload', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json('synthetic-owner'))
    .mockResolvedValue(Response.json({}, { status: 503 }));
  await expect(installAddon({ ...context, fetchImpl, addonData: { profile_id: 1, url: 'https://addon.test/manifest.json' } })).rejects.toThrow();
  expect(fetchImpl.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(2);
});

it.each([deleteAddon, updateAddon])('propagates failed addon writes to retain the pending draft', async operation => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status: 503 }));
  await expect(operation({ ...context, fetchImpl, addonId: 'synthetic', name: 'Changed' })).rejects.toThrow();
  expect(fetchImpl).toHaveBeenCalledOnce();
});

it('does not delete or install any addon after an existing metadata update fails', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json('synthetic-owner'))
    .mockResolvedValueOnce(Response.json([{ id: 'old', name: 'AIOMetadata' }]))
    .mockResolvedValue(Response.json({}, { status: 503 }));
  await expect(installOrUpdateAioAddon({ ...context, fetchImpl, manifestUrl: 'https://addon.test/manifest.json' })).rejects.toThrow();
  expect(fetchImpl.mock.calls.map(([, options]) => options.method)).toEqual(['POST', 'GET', 'PATCH']);
});

it.each([pullProviderCredentials, pullProfileSettings, pushProviderCredentials])('does not disguise a service outage as empty data or successful persistence', async operation => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status: 503 }));
  await expect(operation({ ...context, fetchImpl,
    credentials: [{ provider: 'tmdb', credential_json: { api_key: 'synthetic' } }],
  })).rejects.toThrow();
  expect(fetchImpl).toHaveBeenCalledOnce();
});
