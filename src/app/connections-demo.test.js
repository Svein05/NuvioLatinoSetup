import { afterEach, expect, it, vi } from 'vitest';
import { withConnectionDemos } from './connections-demo.js';
import { assertRealSetup, demoKeyVerdict } from '../shared/demo/setup.js';

afterEach(() => vi.useRealTimers());

it.each(['OK', 'EMPTY', 'SLOW', 'LISTS-ERROR', 'PREMIUM'])('keeps %s scenarios entirely outside the real adapter', async scenario => {
  vi.useFakeTimers();
  const real = { verify: vi.fn(), lists: vi.fn() };
  const client = withConnectionDemos(real);
  const tokenId = `NUVIO-DEMO-${scenario}`;
  const pending = client.verify('https://unused.invalid', 'simkl', tokenId);
  await vi.runAllTimersAsync();
  const account = { ...await pending, tokenId };
  const lists = client.lists('https://unused.invalid', 'simkl', account);
  await vi.runAllTimersAsync();
  const result = await lists;
  expect(account.demo).toBe(true);
  expect(real.verify).not.toHaveBeenCalled(); expect(real.lists).not.toHaveBeenCalled();
  if (scenario === 'EMPTY') expect(result).toMatchObject({ lists: [], empty: true });
  if (scenario === 'PREMIUM') expect(result.limitation).toBe('premium_only');
  expect(() => assertRealSetup({ connections: { accounts: { simkl: account } } })).toThrow();
});

it('cancels slow demos without inheriting a connected account and locks unknown reserved drafts', async () => {
  vi.useFakeTimers();
  const abort = new AbortController();
  const pending = withConnectionDemos({}).verify('', 'trakt', 'NUVIO-DEMO-SLOW', abort.signal);
  const rejected = expect(pending).rejects.toThrow();
  abort.abort(); await rejected;
  expect(() => assertRealSetup({ connections: { drafts: { trakt: 'NUVIO-DEMO-UNKNOWN' } } })).toThrow();
  expect(() => assertRealSetup({ apiKeys: { tmdb: 'synthetic-real' } })).not.toThrow();
});

it.each([['OK', true], ['INVALID', false], ['ERROR', false]])('returns the %s key verdict locally', async (scenario, valid) => {
  vi.useFakeTimers();
  const pending = demoKeyVerdict(`NUVIO-DEMO-${scenario}`);
  await vi.runAllTimersAsync();
  expect(await pending).toMatchObject({ valid, demo: true });
});
