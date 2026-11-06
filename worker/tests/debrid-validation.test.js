import { expect, it, vi } from 'vitest';
import { validateTorboxRoute } from '../src/routes/debrid-validation.js';

const request = (origin, apiKey = 'synthetic-key') => new Request('https://worker.invalid/api/debrid/torbox/validate', {
  method: 'POST', headers: { Origin: origin }, body: JSON.stringify({ apiKey }),
});

it('uses a fixed provider target and returns no private provider account details', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ success: true, data: { email: 'private', plan: 0 } }));
  const response = await validateTorboxRoute(request('http://localhost:5173'), fetchImpl);
  expect(await response.json()).toEqual({ valid: true, status: 'valid', user: 'TorBox', plan: 'Gratis' });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(fetchImpl.mock.calls[0][0]).toBe('https://api.torbox.app/v1/api/user/me');
  expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'manual', headers: { Authorization: 'Bearer synthetic-key' } });
});

it('rejects unknown origins and empty keys before contacting the provider', async () => {
  const fetchImpl = vi.fn();
  await expect(validateTorboxRoute(request('https://untrusted.invalid'), fetchImpl)).rejects.toThrow('Origen');
  await expect(validateTorboxRoute(request('http://localhost:5173', ''), fetchImpl)).rejects.toThrow('Clave');
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([401, 503])('distinguishes provider rejection from unavailability: %s', async status => {
  const response = await validateTorboxRoute(request('https://guia.lat-add.com'), async () => new Response('', { status }));
  expect((await response.json()).status).toBe(status === 401 ? 'invalid' : 'unverifiable');
});
