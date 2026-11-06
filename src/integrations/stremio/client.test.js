import { expect, it, vi } from 'vitest';
import { readStremioAccount } from './client.js';

it('authenticates transiently and performs only read operations without browser credentials', async () => {
  const fetchImpl = vi.fn(async url => Response.json({ result: url.endsWith('/login') ? { authKey: 'private-auth' }
    : url.endsWith('/addonCollectionGet') ? { addons: [] } : [] }));
  const result = await readStremioAccount({ email: 'synthetic@example.invalid', password: 'private-password', fetchImpl });
  expect(result).toEqual({ addons: [], library: [] });
  expect(fetchImpl.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    '/api/login', '/api/addonCollectionGet', '/api/datastoreGet',
  ]);
  for (const [, options] of fetchImpl.mock.calls) {
    expect(options).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error' });
  }
  expect(JSON.stringify(result)).not.toContain('private');
});

it('stops on an invalid login without attempting private reads', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ error: { message: 'private detail' } }));
  await expect(readStremioAccount({ email: 'synthetic', password: 'secret', fetchImpl })).rejects.toThrow('iniciar sesión');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
