import { expect, it, vi } from 'vitest';
import { createAiometadataClient } from '../client.js';
import { metadataOwner } from '../contracts.js';

const instance = 'https://metadata.example.invalid';
const payload = { password: 'synthetic-secret', config: { catalogs: [] } };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

it.each([401, 403, 404, 429, 500])('reports HTTP %s without exposing provider error text', async status => {
  const fetchImpl = vi.fn(async () => response({ error: 'synthetic-secret', password: 'synthetic-secret' }, status));
  const client = createAiometadataClient({ fetchImpl });
  await expect(client.updateConfiguration(instance, 'id', payload)).rejects.toMatchObject({ status, operation: 'update', outcome: status >= 500 ? 'unknown' : 'failed' });
  await expect(client.loadConfiguration(instance, 'id', payload.password)).rejects.not.toThrow('synthetic-secret');
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

it.each([{}, [], { success: false }, { success: true, userUUID: 'another-id' }])('does not accept an unconfirmed update: %j', body => {
  const client = createAiometadataClient({ fetchImpl: async () => response(body) });
  return expect(client.updateConfiguration(instance, 'id', payload)).rejects.toMatchObject({ operation: 'update' });
});

it.each([null, [], { success: true }, { config: null }, { config: 'invalid' }, { error: 'synthetic-secret' }])('rejects an invalid configuration response: %j', body => {
  const client = createAiometadataClient({ fetchImpl: async () => response(body) });
  return expect(client.loadConfiguration(instance, 'id', payload.password)).rejects.toMatchObject({ operation: 'load' });
});

it.each(['create', 'update'])('retains unknown outcome after an unreadable %s response', async operation => {
  const fetchImpl = vi.fn(async () => new Response('<html>unavailable</html>'));
  const client = createAiometadataClient({ fetchImpl });
  const result = operation === 'create' ? client.saveConfiguration(instance, payload) : client.updateConfiguration(instance, 'id', payload);
  await expect(result).rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('does not retry a network failure, follow redirects or send cookies', async () => {
  const fetchImpl = vi.fn(async () => { throw new TypeError('synthetic unavailable'); });
  const client = createAiometadataClient({ fetchImpl });
  await expect(client.saveConfiguration(instance, payload)).rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'error', credentials: 'omit' });
});

it('cancels before starting a request and preserves its abort reason', async () => {
  const fetchImpl = vi.fn();
  const controller = new AbortController();
  controller.abort(new DOMException('synthetic cancellation', 'AbortError'));
  const client = createAiometadataClient({ fetchImpl });
  await expect(client.saveConfiguration(instance, payload, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('applies a bounded timeout without retrying a write', async () => {
  const fetchImpl = vi.fn((_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))));
  const client = createAiometadataClient({ fetchImpl, timeoutMs: 10 });
  await expect(client.saveConfiguration(instance, payload)).rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('does not invent a manifest after a failed read', async () => {
  const client = createAiometadataClient({ fetchImpl: async () => response({}, 503) });
  await expect(client.fetchManifest(`${instance}/stremio/id/manifest.json`)).rejects.toMatchObject({ operation: 'manifest' });
});

it('requires a creation password and keeps it outside flat configuration data', async () => {
  const fetchImpl = vi.fn(async () => response({ userUUID: 'id' }));
  const client = createAiometadataClient({ fetchImpl });
  await expect(client.saveConfiguration(instance, { config: { catalogs: [] } })).rejects.toThrow('contraseña');
  expect(fetchImpl).not.toHaveBeenCalled();
  await client.saveConfiguration(instance, { password: payload.password, catalogs: [] });
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ password: payload.password, config: { catalogs: [] } });
});

it.each(['http://metadata.example.invalid', 'https://user:password@metadata.example.invalid', 'https://metadata.example.invalid?token=synthetic'])('rejects an unsafe instance %s before sending credentials', async url => {
  const fetchImpl = vi.fn();
  await expect(createAiometadataClient({ fetchImpl }).saveConfiguration(url, payload)).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each(['/stremio/id/manifest.json', '/id/manifest.json'])('resolves its owner from %s while preserving path casing', suffix => {
  expect(metadataOwner(`${instance}/CaseSensitive${suffix}`)).toEqual({ instanceUrl: `${instance}/CaseSensitive`, uuid: 'id' });
});
