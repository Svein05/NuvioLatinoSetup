import { expect, it, vi } from 'vitest';
import { createStreamingUser } from './create-user.js';

const instance = 'https://streaming.invalid/CustomPath';
const saved = { success: true, data: { uuid: 'synthetic-id', encryptedPassword: 'synthetic_encrypted-key=' } };
const config = { services: [{ id: 'torbox', credentials: { apiKey: 'synthetic-private-key' } }], untouched: { value: true } };

it.each([undefined, 'https://worker.invalid/'])('creates once through the selected transport: %s', async proxyUrl => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json(saved, { status: 201 }));
  expect(await createStreamingUser(`${instance}/`, config, ' synthetic-password ', { fetchImpl, proxyUrl }))
    .toEqual({ ...saved.data, manifestUrl: `${instance}/stremio/synthetic-id/synthetic_encrypted-key=/manifest.json` });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url).toBe(`${proxyUrl ? 'https://worker.invalid/' : ''}${instance}/api/v1/user`);
  expect(options).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error' });
  expect(JSON.parse(options.body)).toEqual({ config, password: 'synthetic-password' });
});

it.each([400, 401, 403, 404, 405, 422, 429, 500, 503])('does not retry HTTP %i through any other route', async status => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({ detail: 'synthetic-private-key' }, { status }));
  const result = createStreamingUser(instance, config, 'synthetic-password', { fetchImpl, proxyUrl: 'https://worker.invalid' });
  await expect(result).rejects.toMatchObject({ status, outcome: status >= 500 ? 'unknown' : 'failed' });
  await expect(result).rejects.not.toThrow('synthetic-private-key');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('does not retry an ambiguous network failure', async () => {
  const fetchImpl = vi.fn().mockRejectedValue(new Error('synthetic disconnect'));
  await expect(createStreamingUser(instance, config, 'synthetic-password', { fetchImpl })).rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it.each([{}, { success: true }, { success: true, data: { uuid: '../escape', encryptedPassword: 'key' } },
  { success: true, data: { uuid: 'id', encryptedPassword: 'key?query' } }])('does not confirm malformed credentials: %j', async body => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(body));
    await expect(createStreamingUser(instance, config, 'synthetic-password', { fetchImpl }))
      .rejects.toMatchObject({ code: 'INVALID_AIOSTREAMS_RESPONSE', outcome: 'unknown' });
  },
);

it('distinguishes an explicit application rejection from unknown creation', async () => {
  await expect(createStreamingUser(instance, config, 'synthetic-password', {
    fetchImpl: async () => Response.json({ success: false }),
  })).rejects.toMatchObject({ outcome: 'failed' });
});

it('handles invalid JSON as unknown creation', async () => {
  await expect(createStreamingUser(instance, config, 'synthetic-password', {
    fetchImpl: async () => new Response('invalid'),
  })).rejects.toMatchObject({ outcome: 'unknown' });
});

it.each(['', 'short', undefined])('never inserts a shared password for %s', async password => {
  const fetchImpl = vi.fn();
  await expect(createStreamingUser(instance, config, password, { fetchImpl })).rejects.toThrow(/contraseña/);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each(['http://streaming.invalid', 'https://user:password@streaming.invalid', 'https://streaming.invalid?query', 'https://streaming.invalid#fragment'])('rejects an unsafe instance %s', async url => {
  const fetchImpl = vi.fn();
  await expect(createStreamingUser(url, config, 'synthetic-password', { fetchImpl })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('does not send a cancelled creation', async () => {
  const fetchImpl = vi.fn();
  await expect(createStreamingUser(instance, config, 'synthetic-password', { fetchImpl, signal: AbortSignal.abort() })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('treats cancellation during a creation as unknown and never retries it', async () => {
  const controller = new AbortController();
  const fetchImpl = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const result = createStreamingUser(instance, config, 'synthetic-password', { fetchImpl, signal: controller.signal });
  controller.abort();
  await expect(result).rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
