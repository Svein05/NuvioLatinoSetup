import { expect, it, vi } from 'vitest';
import { createAvatarSuggestionsClient } from './avatar-suggestions.js';
const draft = { mode: 'url', url: 'https://example.invalid/avatar.png', characterName: 'Hero', seriesName: 'Series' };
const options = { accessToken: 'synthetic-token', requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
it.each(['url', 'file'])('sends only the bounded %s form to the Worker', async mode => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({ status: 'sent' }));
  const file = new File(['synthetic'], 'avatar.png', { type: 'image/png' });
  const client = createAvatarSuggestionsClient('https://worker.invalid', { fetchImpl });
  expect(await client.send({ ...draft, mode, file }, options)).toEqual({ status: 'sent' });
  const [url, init] = fetchImpl.mock.calls[0];
  expect(url).toBe('https://worker.invalid/api/avatars/suggestions');
  expect(init.headers).toEqual({ Authorization: 'Bearer synthetic-token' });
  expect(init.body.get('requestId')).toBe(options.requestId);
  expect(init.body.get(mode === 'file' ? 'file' : 'url')).toEqual(mode === 'file' ? file : draft.url);
  expect(init.body.has('payload_json')).toBe(false);
  expect(init.body.has('webhookUrl')).toBe(false);
});
it.each([401, 422, 429, 503])('does not retry or confirm HTTP %i', async status => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status }));
  const client = createAvatarSuggestionsClient('https://worker.invalid', { fetchImpl });
  await expect(client.send(draft, options)).rejects.toMatchObject({ status, outcome: status === 503 ? 'unknown' : 'failed' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it('does not turn an invalid acknowledgement into success', async () => {
  const client = createAvatarSuggestionsClient('https://worker.invalid', { fetchImpl: async () => Response.json({ success: true }) });
  await expect(client.send(draft, options)).rejects.toMatchObject({ outcome: 'unknown' });
});
it('requires a session and honors cancellation before sending', async () => {
  const fetchImpl = vi.fn();
  const client = createAvatarSuggestionsClient('https://worker.invalid', { fetchImpl });
  await expect(client.send(draft)).rejects.toMatchObject({ status: 401 });
  await expect(client.send(draft, { ...options, signal: AbortSignal.abort() })).rejects.toBeDefined();
  expect(fetchImpl).not.toHaveBeenCalled();
});
