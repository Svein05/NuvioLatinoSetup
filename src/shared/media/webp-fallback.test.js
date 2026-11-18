import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const workers = [];
class FakeWorker {
  constructor() { workers.push(this); }
  messages = [];
  terminate = vi.fn();
  postMessage(message, transfer) { this.messages.push({ message, transfer }); }
  reply(index, extra = {}) { this.onmessage({ data: { id: this.messages[index].message.id, buffer: new ArrayBuffer(12), ...extra } }); }
}
const canvas = () => ({ width: 2, height: 3, getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray(24) }) }) });
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); workers.length = 0; vi.stubGlobal('Worker', FakeWorker); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('transfers RGBA data and correlates concurrent replies using one worker', async () => {
  const { encodeCanvasWebp } = await import('./webp-fallback.js');
  const first = encodeCanvasWebp(canvas(), .9); const second = encodeCanvasWebp(canvas(), .8);
  expect(workers).toHaveLength(1);
  expect(workers[0].messages[0].message).toMatchObject({ width: 2, height: 3, quality: .9 });
  expect(workers[0].messages[0].transfer[0]).toBe(workers[0].messages[0].message.pixels);
  workers[0].reply(1); workers[0].reply(0);
  expect((await first).type).toBe('image/webp'); expect((await second).size).toBe(12);
  await vi.advanceTimersByTimeAsync(30000);
  expect(workers[0].terminate).toHaveBeenCalledOnce();
  const next = encodeCanvasWebp(canvas(), .9); workers[1].reply(0); await next;
});

it('rejects outstanding jobs on worker failure and allows a fresh attempt', async () => {
  const { encodeCanvasWebp } = await import('./webp-fallback.js');
  const first = encodeCanvasWebp(canvas(), .9); const second = encodeCanvasWebp(canvas(), .9);
  const results = Promise.allSettled([first, second]);
  workers[0].onerror({ preventDefault: vi.fn() });
  expect((await results).map(result => result.status)).toEqual(['rejected', 'rejected']);
  expect(workers[0].terminate).toHaveBeenCalledOnce();
  const retry = encodeCanvasWebp(canvas(), .9); workers[1].reply(0); await retry;
});

it('bounds stalled requests and releases the worker', async () => {
  const { encodeCanvasWebp } = await import('./webp-fallback.js');
  const result = expect(encodeCanvasWebp(canvas(), .9)).rejects.toThrow('Tus cambios anteriores se conservan');
  await vi.advanceTimersByTimeAsync(60000); await result;
  expect(workers[0].terminate).toHaveBeenCalledOnce();
});

it.each([{ error: true }, { buffer: 'invalid' }])('rejects encoder errors or malformed replies', async reply => {
  const { encodeCanvasWebp } = await import('./webp-fallback.js');
  const result = expect(encodeCanvasWebp(canvas(), .9)).rejects.toThrow('convertir');
  workers[0].reply(0, reply); await result;
  expect(workers[0].terminate).toHaveBeenCalledOnce();
});

it('reports missing browser capabilities without creating a worker', async () => {
  vi.stubGlobal('WebAssembly', undefined);
  const { encodeCanvasWebp } = await import('./webp-fallback.js');
  await expect(encodeCanvasWebp(canvas(), .9)).rejects.toThrow('convertir');
  expect(workers).toHaveLength(0);
});
