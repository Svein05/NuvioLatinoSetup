import { expect, it, vi } from 'vitest';
import { loadBadgePack } from './load-pack.js';

const url = 'https://raw.githubusercontent.com/example/badges/main/pack.json';

it('accepts explicit empty filters as a valid catalog', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ groups: [], filters: [] }));
  expect(await loadBadgePack(url, { fetchImpl })).toEqual({ groups: [], filters: [] });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([401, 403, 404, 429])('does not use a public proxy to bypass HTTP %s', async status => {
  const fetchImpl = vi.fn(async () => Response.json({}, { status }));
  await expect(loadBadgePack(url, { fetchImpl })).rejects.toMatchObject({ status });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('uses the compatibility proxy for an unavailable public catalog', async () => {
  const fetchImpl = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(Response.json({ filters: [{ id: 'synthetic' }] }));
  expect(await loadBadgePack(url, { fetchImpl })).toMatchObject({ filters: [{ id: 'synthetic' }] });
  expect(fetchImpl.mock.calls[1][0]).toBe(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
});

it('propagates unavailable reads and malformed catalogs without returning replacement rules', async () => {
  const fetchImpl = vi.fn(async () => Response.json({}, { status: 503 }));
  await expect(loadBadgePack(url, { fetchImpl })).rejects.toMatchObject({ status: 503 });
  await expect(loadBadgePack(url, { fetchImpl: async () => Response.json({ unrelated: true }) })).rejects.toThrow('lista');
});

it('does not start a compatibility read after cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetchImpl = vi.fn(async () => { throw new DOMException('cancelled', 'AbortError'); });
  await expect(loadBadgePack(url, { fetchImpl, signal: controller.signal })).rejects.toThrow();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('rejects private or credential-bearing sources before contacting a proxy', async () => {
  const fetchImpl = vi.fn();
  await expect(loadBadgePack('https://user:password@example.invalid/private', { fetchImpl })).rejects.toThrow('pública');
  expect(fetchImpl).not.toHaveBeenCalled();
});
