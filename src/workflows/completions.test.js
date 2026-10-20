import { expect, it, vi } from 'vitest';
import { createCompletionStore } from '../features/completions/index.js';
import { createCompletions } from './completions.js';

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

function fixture(overrides = {}) {
  const local = overrides.local || storage({ nuvio_completions_cached_count: '150' });
  const session = storage();
  const reportWarning = vi.fn();
  const store = createCompletionStore({ local, session, now: () => 10000, reportWarning });
  const incrementCount = vi.fn().mockResolvedValue(151);
  const readCount = vi.fn().mockResolvedValue(152);
  const endpoints = [{ get: 'primary/get', hit: 'primary/hit' }, { get: 'fallback/get', hit: 'fallback/hit' }];
  const counter = createCompletions({ endpoints, store, incrementCount, readCount, reportWarning, ...overrides });
  return { counter, local, session, incrementCount, readCount, reportWarning, store };
}

it('loads the primary count and persists the legacy cache schema', async () => {
  const f = fixture();
  expect(await f.counter.refresh()).toEqual({ count: 152, source: 'network' });
  expect(f.local.getItem('nuvio_completions_cached_count')).toBe('152');
  expect(f.local.getItem('nuvio_completions_cached_ts')).toBe('10000');
});

it('uses a backup read after primary failure and reports the failure', async () => {
  const f = fixture();
  f.readCount.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(0);
  expect(await f.counter.refresh()).toEqual({ count: 0, source: 'network' });
  expect(f.readCount.mock.calls.map(([url]) => url)).toEqual(['primary/get', 'fallback/get']);
  expect(f.reportWarning).toHaveBeenCalledOnce();
});

it('returns an explicit cache warning during an outage without replacing its value', async () => {
  const f = fixture();
  f.readCount.mockRejectedValue(new Error('offline'));
  expect(await f.counter.refresh()).toMatchObject({ count: 150, source: 'cache', warning: expect.any(String) });
});

it('coalesces concurrent writes and marks a confirmed increment once', async () => {
  const f = fixture();
  const first = f.counter.record();
  expect(f.counter.record()).toBe(first);
  expect(await first).toEqual({ count: 151, source: 'network', status: 'confirmed' });
  expect(await f.counter.record()).toMatchObject({ count: 151, status: 'duplicate' });
  expect(f.incrementCount).toHaveBeenCalledExactlyOnceWith('primary/hit');
  expect(f.session.getItem('nuvio_completion_session_recorded')).toBe('true');
  expect(f.local.getItem('nuvio_completion_recorded_token')).toBe('10000');
  expect(f.local.getItem('nuvio_completion_pending_token')).toBeNull();
});

it('does not invent an increment when no provider is configured', async () => {
  const f = fixture({ endpoints: [] });
  expect(await f.counter.record()).toMatchObject({ count: 150, status: 'unavailable' });
  expect(f.incrementCount).not.toHaveBeenCalled();
  expect(f.session.getItem('nuvio_completion_session_recorded')).toBeNull();
});

it('selects the fallback hit only when the primary hit is not configured', async () => {
  const f = fixture({ endpoints: [{ get: 'primary/get' }, { hit: 'fallback/hit' }] });
  expect(await f.counter.record()).toMatchObject({ status: 'confirmed' });
  expect(f.incrementCount).toHaveBeenCalledExactlyOnceWith('fallback/hit');
});

it('never retries an ambiguous hit or marks it confirmed, including after reload', async () => {
  const f = fixture();
  f.incrementCount.mockRejectedValue(Object.assign(new Error('timeout'), { outcome: 'unknown' }));
  expect(await f.counter.record()).toMatchObject({ count: 150, status: 'unknown' });
  expect(await f.counter.record()).toMatchObject({ status: 'unknown' });
  expect(await fixture({ local: f.local }).counter.record()).toMatchObject({ status: 'unknown' });
  expect(f.incrementCount).toHaveBeenCalledTimes(1);
  expect(f.local.getItem('nuvio_completion_recorded_token')).toBeNull();
});

it('retains the previous total after rejection and permits a later explicit retry', async () => {
  const f = fixture();
  f.incrementCount.mockRejectedValueOnce(new Error('rejected'));
  expect(await f.counter.record()).toMatchObject({ count: 150, status: 'failed' });
  expect(f.incrementCount).toHaveBeenCalledTimes(1);
  expect(await f.counter.record()).toMatchObject({ count: 151, status: 'confirmed' });
});

it('prevents a late read from overwriting an increment confirmed while it was pending', async () => {
  const f = fixture();
  let resolve;
  f.readCount.mockImplementation(() => new Promise(done => { resolve = done; }));
  const read = f.counter.refresh();
  await f.counter.record();
  resolve(149);
  expect(await read).toMatchObject({ count: 151 });
  expect(f.store.snapshot()).toMatchObject({ count: 151 });
});

it('ignores an older read that resolves after a newer read', async () => {
  const f = fixture();
  let resolve;
  f.readCount.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const old = f.counter.refresh();
  await f.counter.refresh();
  resolve(149);
  expect(await old).toMatchObject({ count: 152 });
});

it('does not save or query the backup after a cancelled read', async () => {
  const f = fixture();
  const controller = new AbortController();
  f.readCount.mockImplementation(async () => { controller.abort(); return 152; });
  await expect(f.counter.refresh({ signal: controller.signal })).rejects.toBeDefined();
  expect(f.readCount).toHaveBeenCalledTimes(1);
  expect(f.store.snapshot().count).toBe(150);
});

it('works in memory with blocked storage without repeatedly counting the same session', async () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const f = fixture({ local: blocked });
  expect(await f.counter.record()).toMatchObject({ count: 151, status: 'confirmed' });
  expect(await f.counter.record()).toMatchObject({ count: 151, status: 'duplicate' });
  expect(f.incrementCount).toHaveBeenCalledOnce();
});

it.each(['nuvio_completion_recorded_token', 'nuvio_completion_pending_token'])('preserves the existing time window for %s', async key => {
  const f = fixture({ local: storage({ [key]: '9999' }) });
  expect(await f.counter.record()).toMatchObject({ status: key.includes('pending') ? 'unknown' : 'duplicate' });
  expect(f.incrementCount).not.toHaveBeenCalled();
});
