import { afterEach, expect, it, vi } from 'vitest';
import { createAiometadataClient } from '../client.js';

const client = createAiometadataClient();

const instance = 'https://metadata.example.invalid';
const password = 'synthetic-private-password';
const config = { catalogs: [{ id: 'kept', options: { keep: true } }], apiKeys: { tmdb: 'synthetic' } };
const response = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

it('preserves the configuration envelope, password and creation result', async () => {
  const fetchImpl = vi.fn(async () => response({ success: true, userUUID: 'synthetic-id' }));
  vi.stubGlobal('fetch', fetchImpl);
  const original = structuredClone(config);
  const result = await client.saveConfiguration(`${instance}/`, { password, config });
  expect(fetchImpl.mock.calls[0][0]).toBe(`${instance}/api/config/save`);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ password, config });
  expect(result).toMatchObject({ uuid: 'synthetic-id', instanceUrl: instance, manifestUrl: `${instance}/stremio/synthetic-id/manifest.json` });
  expect(config).toEqual(original);
});

it('loads configuration and preserves provider fields', async () => {
  const fetchImpl = vi.fn(async () => response({ config, hasPassword: true }));
  vi.stubGlobal('fetch', fetchImpl);
  const result = await client.loadConfiguration(instance, 'synthetic-id', password);
  expect(result.config).toEqual(config);
  expect(result.hasPassword).toBe(true);
  expect(fetchImpl.mock.calls[0][0]).toBe(`${instance}/api/config/load/synthetic-id`);
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ password });
});

it('updates the same identifier with the same wire payload', async () => {
  const fetchImpl = vi.fn(async () => response({ success: true, userUUID: 'synthetic-id' }));
  vi.stubGlobal('fetch', fetchImpl);
  expect(await client.updateConfiguration(instance, 'synthetic-id', { password, config }))
    .toMatchObject({ success: true, uuid: 'synthetic-id', instanceUrl: instance });
  expect(fetchImpl.mock.calls[0][0]).toBe(`${instance}/api/config/update/synthetic-id`);
  expect(fetchImpl.mock.calls[0][1].method).toBe('PUT');
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ password, config });
});

it('reads the actual addon name from its manifest', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response({ id: 'aio-metadata', name: 'Synthetic metadata', catalogs: [] })));
  expect(await client.fetchManifest(`${instance}/stremio/synthetic-id/manifest.json`))
    .toMatchObject({ id: 'aio-metadata', name: 'Synthetic metadata' });
});
