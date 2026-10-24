import { afterEach, expect, it, vi } from 'vitest';
import { mountLiveCounter } from '../ui/live-counter.js';

const createCelebration = () => ({ play: async commit => commit(), dispose() {} });
const disposals = [];
afterEach(() => { disposals.splice(0).forEach(dispose => dispose()); vi.useRealTimers(); });

function fixture() {
  vi.useFakeTimers();
  const root = new EventTarget();
  root.hidden = false;
  const counter = {
    snapshot: () => ({ count: 150, source: 'cache' }),
    refresh: vi.fn().mockResolvedValue({ count: 151, source: 'network' }),
    record: vi.fn().mockResolvedValue({ count: 152, source: 'network', status: 'recorded' }),
  };
  const view = { render: vi.fn(), celebrate: vi.fn(), dispose: vi.fn() };
  const reportWarning = vi.fn();
  const mount = () => {
    const instance = mountLiveCounter({ counter, createCelebration, createView: () => view, reportWarning }, root);
    disposals.push(instance.dispose);
    return instance;
  };
  return { root, counter, view, mount, reportWarning };
}

it('renders a changed remote value instead of comparing it with an already-updated cache', async () => {
  const f = fixture();
  f.mount();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.view.render).toHaveBeenLastCalledWith({ count: 151, source: 'network' }, true);
});

it('pauses hidden-tab polling and refreshes when visibility returns', async () => {
  const f = fixture();
  f.mount();
  await vi.advanceTimersByTimeAsync(0);
  f.root.hidden = true;
  await vi.advanceTimersByTimeAsync(75000);
  expect(f.counter.refresh).toHaveBeenCalledTimes(1);
  f.root.hidden = false;
  f.root.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(0);
  expect(f.counter.refresh).toHaveBeenCalledTimes(2);
});

it('does not overlap polling while a refresh is pending', async () => {
  const f = fixture();
  f.counter.refresh.mockImplementation(() => new Promise(() => {}));
  f.mount();
  await vi.advanceTimersByTimeAsync(75000);
  expect(f.counter.refresh).toHaveBeenCalledTimes(1);
});

it('disposal cancels reads, removes polling/listeners and ignores late results', async () => {
  const f = fixture();
  let resolve;
  f.counter.refresh.mockImplementation(() => new Promise(done => { resolve = done; }));
  const instance = f.mount();
  instance.dispose();
  expect(f.counter.refresh.mock.calls[0][0].signal.aborted).toBe(true);
  resolve({ count: 999, source: 'network' });
  await vi.advanceTimersByTimeAsync(75000);
  f.root.dispatchEvent(new Event('visibilitychange'));
  expect(f.counter.refresh).toHaveBeenCalledTimes(1);
  expect(f.view.render).toHaveBeenCalledTimes(1);
  expect(f.view.dispose).toHaveBeenCalledOnce();
});

it('a late read cannot hide a newer recording result or its warning', async () => {
  const f = fixture();
  let resolve;
  f.counter.refresh.mockImplementation(() => new Promise(done => { resolve = done; }));
  f.counter.record.mockResolvedValue({ count: 150, source: 'cache', status: 'unknown', warning: 'synthetic pending hit' });
  const instance = f.mount();
  await instance.record();
  resolve({ count: 149, source: 'network' });
  await vi.advanceTimersByTimeAsync(0);
  expect(f.view.render).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unknown' }), true);
  expect(f.reportWarning).toHaveBeenCalledWith('synthetic pending hit');
  expect(f.view.celebrate).not.toHaveBeenCalled();
});

it('shows the increment celebration only after a confirmed write', async () => {
  const f = fixture();
  const instance = f.mount();
  await instance.record();
  expect(f.view.celebrate).not.toHaveBeenCalled();
  expect(f.view.render).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'recorded', count: 152 }), true);
});

it('publishes initial, refresh and record results without creating another polling loop', async () => {
  const f = fixture();
  const onUpdate = vi.fn();
  const instance = mountLiveCounter({ counter: f.counter, createCelebration, createView: () => f.view, onUpdate }, f.root);
  disposals.push(instance.dispose);
  expect(onUpdate).toHaveBeenCalledWith({ count: 150, source: 'cache' });
  await vi.advanceTimersByTimeAsync(0);
  expect(onUpdate).toHaveBeenLastCalledWith({ count: 151, source: 'network' });
  await instance.record();
  expect(onUpdate).toHaveBeenLastCalledWith({ count: 152, source: 'network', status: 'recorded' });
  expect(f.counter.refresh).toHaveBeenCalledTimes(1);
});

it('defers the odometer until arrival, pauses polling and skips duplicate effects', async () => {
  const f = fixture();
  let arrive, finish;
  const play = vi.fn(commit => new Promise(resolve => { arrive = commit; finish = resolve; }));
  const instance = mountLiveCounter({ counter: f.counter, createView: () => f.view,
    createCelebration: () => ({ play, dispose() {} }) }, f.root);
  disposals.push(instance.dispose);
  await vi.advanceTimersByTimeAsync(0);
  const task = instance.record('first');
  await vi.advanceTimersByTimeAsync(75000);
  expect(play).toHaveBeenCalledOnce();
  expect(f.counter.refresh).toHaveBeenCalledOnce();
  expect(f.view.render).toHaveBeenLastCalledWith({ count: 151, source: 'network' }, true);
  arrive(); finish(); await task;
  expect(f.view.render).toHaveBeenLastCalledWith(expect.objectContaining({ count: 152 }), true);
  f.counter.record.mockResolvedValueOnce({ count: 152, source: 'network', status: 'duplicate' });
  await instance.record('duplicate');
  expect(play).toHaveBeenCalledOnce();
});
