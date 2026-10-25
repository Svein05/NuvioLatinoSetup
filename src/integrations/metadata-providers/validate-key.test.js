import { expect, it, vi } from 'vitest';
import { validateProviderKey } from './validate-key.js';

const validResponses = { tmdb: { success: true }, mdblist: { user_id: 1, username: 'synthetic' }, rpdb: { valid: true },
  tvdb: { status: 'success', data: { token: 'private-token' } }, gemini: { models: [] }, openrouter: { data: { label: 'synthetic' } } };

it.each(Object.keys(validResponses))('verifies %s only from a recognized successful response', async provider => {
  const result = await validateProviderKey(provider, 'synthetic-private-key', {
    fetchImpl: async () => Response.json(validResponses[provider]),
  });
  expect(result).toEqual({ valid: true, status: 'valid' });
  expect(JSON.stringify(result)).not.toContain('private');
});

it('does not contact a provider for a cancelled validation', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetchImpl = vi.fn();
  await expect(validateProviderKey('tmdb', 'synthetic', { fetchImpl, signal: controller.signal })).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each(Object.keys(validResponses))('does not mark a plausible %s key valid when offline', async provider => {
  const fetchImpl = vi.fn(async () => { throw new TypeError('offline'); });
  const result = await validateProviderKey(provider, '0123456789abcdef0123456789abcdef', { fetchImpl });
  expect(result).toMatchObject({ valid: false, status: 'unverifiable' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([401, 403, 429, 503])('distinguishes provider rejection from an unavailable response: HTTP %s', async status => {
  const result = await validateProviderKey('tmdb', 'synthetic', { fetchImpl: async () => Response.json({}, { status }) });
  expect(result).toMatchObject({ valid: false, status: [401, 403].includes(status) ? 'invalid' : 'unverifiable', httpStatus: status });
});

it('treats unexpected payloads and invalid JSON as unverifiable without probing proxies', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ unexpected: true }));
  expect(await validateProviderKey('tmdb', 'synthetic', { fetchImpl })).toMatchObject({ valid: false, status: 'unverifiable' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(await validateProviderKey('tmdb', 'synthetic', { fetchImpl: async () => new Response('invalid') }))
    .toMatchObject({ valid: false, status: 'unverifiable' });
});
