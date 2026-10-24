import { expect, it, vi } from 'vitest';
import { createWorker } from '../src/index.js';
import { completionCommand, completionCount, RECORD_COMPLETION_SCRIPT } from '../src/services/completions.js';

const env = { AVATAR_REDIS_URL: 'https://synthetic.upstash.io', AVATAR_REDIS_TOKEN: 'synthetic-secret' };
const clientId = '12345678-1234-4234-8234-123456789abc';
const request = (origin = 'https://guia.lat-add.com', body = { clientId }) => new Request('https://worker.invalid/api/completions', {
  method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(body),
});
const backend = result => vi.fn(async () => Response.json({ result }));

it.each([null, '55', '0', '71'])('reads confirmed setups without initializing or overwriting Redis: %s', async result => {
  const fetchImpl = backend(result);
  const response = await createWorker({ fetchImpl }).fetch(new Request('https://worker.invalid/api/completions'), env);
  expect(await response.json()).toEqual({ value: result === null ? 55 : Number(result), environment: 'production' });
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(['GET', 'nuvio:completions:production']);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each(['recorded', 'duplicate'])('confirms %s with a single atomic command', async status => {
  const fetchImpl = backend([status, '56']);
  const response = await createWorker({ fetchImpl, now: () => 1000 }).fetch(request(), env);
  expect(await response.json()).toEqual({ value: 56, status, environment: 'production' });
  const command = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(command.slice(0, 4)).toEqual(['EVAL', RECORD_COMPLETION_SCRIPT, 3, 'nuvio:completions:production']);
  expect(command.slice(-2)).toEqual(['55', 'legacy']);
  expect(command.join(' ')).not.toContain('192.0.2.1');
  expect(command.join(' ')).not.toContain(clientId);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('deduplicates retries across days and changes network daily rate keys', async () => {
  const first = await completionCommand({ clientId, ip: '192.0.2.1', now: 1000 });
  const next = await completionCommand({ clientId, ip: '192.0.2.1', now: 86400001 });
  expect(first[4]).toBe(next[4]);
  expect(first[5]).not.toBe(next[5]);
  expect(RECORD_COMPLETION_SCRIPT).toContain("ARGV[1], 'NX'");
  expect(RECORD_COMPLETION_SCRIPT.indexOf("'EXISTS'")).toBeLessThan(RECORD_COMPLETION_SCRIPT.indexOf("'INCR'"));
});

it.each(['https://unknown.invalid', 'null', ''])('rejects %s writes before Redis', async origin => {
  const fetchImpl = backend(['recorded', '56']);
  expect((await createWorker({ fetchImpl }).fetch(request(origin), env)).status).toBe(403);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([{}, { clientId: 'invalid' }, { clientId, value: 999 }])('rejects malformed client bodies', async body => {
  const fetchImpl = backend(null);
  expect((await createWorker({ fetchImpl }).fetch(request(undefined, body), env)).status).toBe(400);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([['limited', 429], ['overflow', 503], ['unexpected', 502]])('rejects %s results', async (status, code) => {
  const response = await createWorker({ fetchImpl: backend([status, '56']) }).fetch(request(), env);
  expect(response.status).toBe(code);
});

it('never retries an ambiguous write or silently substitutes the baseline during an outage', async () => {
  const fetchImpl = vi.fn().mockRejectedValue(new Error('synthetic disconnect'));
  const worker = createWorker({ fetchImpl });
  const response = await worker.fetch(request(), env);
  expect(await response.json()).toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect((await worker.fetch(new Request('https://worker.invalid/api/completions'), env)).status).toBe(502);
});

it.each(['', true, -1, 1.5, 'not-a-count', Number.MAX_SAFE_INTEGER + 1])('rejects corrupted stored counts: %s', value => {
  expect(() => completionCount(value)).toThrow();
});

it.each(['http://localhost:5173', 'http://127.0.0.1:4173', 'https://testing-latinosetup.pages.dev'])('isolates testing counters for %s', async origin => {
  const fetchImpl = backend(null);
  const worker = createWorker({ fetchImpl });
  const response = await worker.fetch(new Request('https://worker.invalid/api/completions', { headers: { Origin: origin } }), env);
  expect(await response.json()).toEqual({ value: 0, environment: 'testing' });
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(['GET', 'nuvio:completions:testing']);
  fetchImpl.mockResolvedValueOnce(Response.json({ result: ['recorded', '1'] }));
  expect(await (await worker.fetch(request(origin, { clientId, completionId: clientId }), env)).json()).toEqual({ value: 1, status: 'recorded', environment: 'testing' });
  const command = JSON.parse(fetchImpl.mock.calls[1][1].body);
  expect(command[3]).toBe('nuvio:completions:testing');
  expect(command[4]).toMatch(/^completion:testing:event:/);
  expect(command.slice(-2)).toEqual(['0', 'event']);
});

it('keeps event deduplication stable across days but distinct across runs and environments', async () => {
  const input = { clientId, completionId: clientId, ip: '192.0.2.1', now: 1000 };
  const first = await completionCommand(input);
  expect((await completionCommand({ ...input, now: 86400001 }))[4]).toBe(first[4]);
  expect((await completionCommand({ ...input, completionId: '22345678-1234-4234-8234-123456789abc' }))[4]).not.toBe(first[4]);
  expect((await completionCommand({ ...input, environment: 'testing' }))[4]).not.toBe(first[4]);
  expect(first.slice(-2)).toEqual(['55', 'event']);
  expect(RECORD_COMPLETION_SCRIPT).toContain("if ARGV[2] == 'event' then redis.call('SET', KEYS[2], '1')");
});
