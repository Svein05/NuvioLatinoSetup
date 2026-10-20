import { expect, it, vi } from 'vitest';
import { validateDebridKey } from './validate-key.js';

const accounts = [
  ['torbox', { success: true, data: { email: 'synthetic@example.invalid', plan: 0 } }, 'synthetic@example.invalid', 'Gratis'],
  ['alldebrid', { status: 'success', data: { user: { username: 'Synthetic user', isPremium: true } } }, 'Synthetic user', 'Premium Activo'],
  ['realdebrid', { username: 'Synthetic user', type: 'premium' }, 'Synthetic user', 'Premium'],
  ['premiumize', { status: 'success', customer_id: 123, premium_until: 999999 }, 'ID: 123', 'Premium Activo'],
  ['debridlink', { success: true, value: { pseudo: 'Synthetic user', premium: true } }, 'Synthetic user', 'Premium'],
];

it.each(accounts)('preserves a verified %s account and request credentials', async (provider, payload, user, plan) => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json(payload));
  expect(await validateDebridKey(provider.toUpperCase(), ' synthetic key ', { fetchImpl, now: () => 0 }))
    .toEqual({ valid: true, status: 'valid', user, plan });
  const [url, options] = fetchImpl.mock.calls[0];
  if (['alldebrid', 'premiumize'].includes(provider)) expect(url).toContain('apikey=synthetic%20key');
  else expect(options.headers.Authorization).toBe('Bearer synthetic key');
  expect(options.credentials).toBe('omit');
});

it.each(accounts)('never validates %s by key format after a network failure', async provider => {
  const fetchImpl = vi.fn().mockRejectedValue(new Error('synthetic offline'));
  const result = await validateDebridKey(provider, '12345678-1234-1234-1234-123456789abc', { fetchImpl });
  expect(result).toMatchObject({ valid: false, status: 'unverifiable' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([400, 401, 403, 429, 503])('classifies HTTP %i without exposing response contents', async status => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({ message: 'synthetic-private-key' }, { status }));
  const result = await validateDebridKey('torbox', 'synthetic-private-key', { fetchImpl });
  expect(result).toMatchObject({ valid: false, status: status < 429 ? 'invalid' : 'unverifiable' });
  expect(JSON.stringify(result)).not.toContain('synthetic-private-key');
});

it.each(['torbox', 'alldebrid', 'realdebrid', 'premiumize', 'debridlink'])('rejects unrecognizable %s responses', async provider => {
  expect(await validateDebridKey(provider, 'synthetic-key', { fetchImpl: async () => Response.json({}) }))
    .toMatchObject({ valid: false, status: 'unverifiable' });
});

it.each([['torbox', { success: false }], ['alldebrid', { status: 'error' }], ['realdebrid', { error_code: 8 }],
  ['premiumize', { status: 'error' }], ['debridlink', { success: false, value: {} }]])(
  'honors explicit %s rejection', async (provider, body) => {
    expect(await validateDebridKey(provider, 'synthetic-key', { fetchImpl: async () => Response.json(body) }))
      .toMatchObject({ valid: false, status: 'invalid' });
  },
);

it.each(['unknown', 'constructor', 'toString'])('does not claim an unsupported %s provider was verified', async provider => {
  const fetchImpl = vi.fn();
  expect(await validateDebridKey(provider, 'synthetic-key', { fetchImpl })).toMatchObject({ valid: false, status: 'unsupported' });
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('does not send an empty key or an already-cancelled request', async () => {
  const fetchImpl = vi.fn();
  expect(await validateDebridKey('torbox', ' ', { fetchImpl })).toMatchObject({ status: 'invalid' });
  await expect(validateDebridKey('torbox', 'synthetic-key', { fetchImpl, signal: AbortSignal.abort() })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('does not swallow a cancellation or turn it into an invalid credential verdict', async () => {
  const controller = new AbortController();
  const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const result = validateDebridKey('torbox', 'synthetic-key', { fetchImpl, signal: controller.signal });
  controller.abort();
  await expect(result).rejects.toBeDefined();
});
