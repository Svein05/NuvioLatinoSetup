import { expect, it, vi } from 'vitest';
import { createAvatarRanking } from './avatar-ranking.js';
import { BASELINE_TOP_AVATARS, completeAvatarRanking, createAvatarRankingStore, normalizeAvatarStorageKey } from '../features/avatars/index.js';

const key = BASELINE_TOP_AVATARS[0];
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function fixture() {
  const local = memory();
  const session = memory();
  const store = createAvatarRankingStore({ local, session });
  const client = { top: vi.fn().mockResolvedValue([{ key, score: 4 }]), record: vi.fn().mockResolvedValue({ status: 'recorded', score: 5 }) };
  const reportWarning = vi.fn();
  return { local, session, client, reportWarning, ranking: createAvatarRanking({ store, client, reportWarning }) };
}

it('preserves the same eight baseline choices and fills a remote ranking without duplicates', async () => {
  const f = fixture();
  const result = await f.ranking.top();
  expect(result).toHaveLength(8);
  expect(result[0]).toEqual({ key, score: 4 });
  expect(new Set(result.map(item => item.key)).size).toBe(8);
  expect(JSON.parse(f.local.getItem('nuvio_avatar_ranks_cached_top'))).toEqual(result);
});

it('uses the old string cache format during an outage, honoring the requested limit', async () => {
  const f = fixture();
  f.local.setItem('nuvio_avatar_ranks_cached_top', JSON.stringify(BASELINE_TOP_AVATARS));
  f.client.top.mockRejectedValue(new Error('unavailable'));
  expect(await f.ranking.top(2)).toEqual(BASELINE_TOP_AVATARS.slice(0, 2).map(key => ({ key, score: 0 })));
  expect(f.reportWarning).toHaveBeenCalled();
});

it('returns the baseline when neither the Worker nor a cache is available', async () => {
  const f = fixture();
  f.client.top.mockRejectedValue(new Error('old Worker route returns 404'));
  expect(await f.ranking.top()).toEqual(BASELINE_TOP_AVATARS.map(key => ({ key, score: 0 })));
});

it('filters corrupt cached entries and duplicates instead of rendering them', () => {
  const result = completeAvatarRanking([{ key: '../unsafe.webp', score: 1 }, { key, score: 4 }, { key, score: 8 }, null]);
  expect(result[0]).toEqual({ key, score: 4 });
  expect(result).toHaveLength(8);
});

it.each([`../assets/profile_icons/${key}`, `https://raw.githubusercontent.com/synthetic/repo/main/assets/profile_icons/${key}`])('preserves canonical key normalization: %s', path => {
  expect(normalizeAvatarStorageKey(path)).toBe(key);
});

it('coalesces concurrent votes, marks only confirmed results and invalidates the ranking cache', async () => {
  const f = fixture();
  await f.ranking.top();
  const first = f.ranking.record(`../assets/profile_icons/${key}`, { accessToken: 'synthetic-token' });
  expect(f.ranking.record(key, { accessToken: 'synthetic-token' })).toBe(first);
  expect(await first).toMatchObject({ status: 'recorded' });
  expect(await f.ranking.record(key, { accessToken: 'synthetic-token' })).toEqual({ status: 'duplicate' });
  expect(f.client.record).toHaveBeenCalledTimes(1);
  expect(f.session.getItem(`nuvio_avatar_voted_${key}`)).toBe('true');
  expect(f.local.getItem('nuvio_avatar_ranks_cached_top')).toBeNull();
});

it.each(['failed', 'unknown'])('does not mark a %s vote successful', async outcome => {
  const f = fixture();
  f.client.record.mockRejectedValue(Object.assign(new Error('synthetic error'), { outcome }));
  expect(await f.ranking.record(key, { accessToken: 'synthetic-token' })).toMatchObject({ status: outcome });
  expect(f.session.getItem(`nuvio_avatar_voted_${key}`)).toBeNull();
  expect(f.client.record).toHaveBeenCalledTimes(1);
});

it('does not request a vote without an authenticated session or a canonical key', async () => {
  const f = fixture();
  expect(await f.ranking.record(key)).toEqual({ status: 'unavailable' });
  expect(await f.ranking.record('https://unrelated.invalid/file.webp')).toEqual({ status: 'skipped' });
  expect(f.client.record).not.toHaveBeenCalled();
});

it('works in memory with blocked storage and avoids a repeated confirmed vote', async () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const store = createAvatarRankingStore({ local: blocked, session: blocked, reportWarning: vi.fn() });
  const client = { record: vi.fn().mockResolvedValue({ status: 'recorded', score: 4 }) };
  const ranking = createAvatarRanking({ store, client });
  await ranking.record(key, { accessToken: 'synthetic-token' });
  expect(await ranking.record(key, { accessToken: 'synthetic-token' })).toEqual({ status: 'duplicate' });
  expect(client.record).toHaveBeenCalledTimes(1);
});

it('propagates read cancellation without writing a late result', async () => {
  const f = fixture();
  const controller = new AbortController();
  f.client.top.mockImplementation(async () => { controller.abort(); return [{ key, score: 4 }]; });
  await expect(f.ranking.top(8, { signal: controller.signal })).rejects.toBeDefined();
  expect(f.local.getItem('nuvio_avatar_ranks_cached_top')).toBeNull();
});
