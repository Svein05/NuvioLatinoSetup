import { expect, it, vi } from 'vitest';
import { createConnectionsClient } from './connections.js';

const instance = 'https://authorized.invalid';
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

it('never sends identifiers to unapproved instances and rejects provider mismatches', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(json({ provider: 'simkl', username: 'synthetic' }));
  const client = createConnectionsClient([instance], { fetchImpl });
  await expect(client.verify('https://untrusted.invalid', 'trakt', 'synthetic')).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
  await expect(client.verify(instance, 'trakt', 'synthetic')).rejects.toThrow('servicio');
  expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'error', cache: 'no-store', credentials: 'omit', method: 'POST' });
});

it('reads only own Trakt lists with pagination and no token in request URLs', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(json(Array.from({ length: 100 }, (_, id) => ({ id }))))
    .mockResolvedValueOnce(json([{ id: 101 }]));
  const client = createConnectionsClient([instance], { fetchImpl });
  const result = await client.lists(instance, 'trakt', { tokenId: 'synthetic-private', username: 'a/b' });
  expect(result.lists).toHaveLength(101);
  expect(JSON.parse(fetchImpl.mock.calls[1][1].body).endpoint).toBe('/users/a%2Fb/lists?limit=100&page=2');
  expect(fetchImpl.mock.calls.every(([url]) => !url.includes('synthetic-private'))).toBe(true);
});

it('keeps premium limitations distinct from empty lists', async () => {
  const client = createConnectionsClient([instance], { fetchImpl: vi.fn().mockResolvedValue(json({ error: 'premium_only' })) });
  expect(await client.lists(instance, 'simkl', { tokenId: 'synthetic' })).toEqual({ lists: [], limitation: 'premium_only' });
});
