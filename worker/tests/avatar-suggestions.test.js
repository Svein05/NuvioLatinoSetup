import { expect, it, vi } from 'vitest';
import { createWorker } from '../src/index.js';
import { suggestionDiscordPayload } from '../src/services/avatar-suggestion.js';

const env = { NUVIO_PUBLIC_ANON_KEY: 'synthetic-public', AVATAR_REDIS_URL: 'https://synthetic.upstash.io',
  AVATAR_REDIS_TOKEN: 'synthetic-redis', AVATAR_SUGGESTION_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456789/synthetic-secret' };
function request({ file, mode = file ? 'file' : 'url', url = 'https://example.invalid/avatar.png', name = 'Hero', token = true } = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries({ requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', mode, characterName: name, seriesName: 'Series' })) body.set(key, value);
  if (mode === 'file') body.set('file', file);
  else body.set('url', url);
  return new Request('https://worker.invalid/api/avatars/suggestions', { method: 'POST', body, headers: token ? { Authorization: 'Bearer synthetic-user-token' } : {} });
}
function backend({ reserved = 'reserved', discordStatus = 200, authStatus = 200, disconnect = false, finalizeFails = false, message = { id: '1234567890' } } = {}) {
  const commands = [];
  return { commands, fetchImpl: vi.fn(async (url, init) => {
    if (url === 'https://api.nuvio.tv/auth/v1/user') return Response.json({ id: 'synthetic-user' }, { status: authStatus });
    if (url === 'https://synthetic.upstash.io/') {
      commands.push(JSON.parse(init.body));
      if (commands.length > 1 && finalizeFails) throw new Error('synthetic cache failure');
      return Response.json({ result: commands.length === 1 ? reserved : 'OK' });
    }
    if (url.startsWith('https://discord.com/')) {
      if (disconnect) throw new Error('synthetic disconnect');
      return Response.json(message, { status: discordStatus });
    }
    throw new Error('Unexpected network request');
  }) };
}
it('sends a URL embed only through the configured private webhook and disables mentions', async () => {
  const f = backend();
  const response = await createWorker(f).fetch(request(), env);
  expect(await response.json()).toEqual({ status: 'sent' });
  const [url, init] = f.fetchImpl.mock.calls.find(([url]) => url.startsWith('https://discord.com/'));
  expect(url).toBe(`${env.AVATAR_SUGGESTION_WEBHOOK_URL}?wait=true`);
  expect(init.redirect).toBe('error');
  const payload = JSON.parse(init.body);
  expect(payload.allowed_mentions).toEqual({ parse: [] });
  expect(payload.embeds[0].fields[0].value).toBe('Hero');
  expect(payload.embeds[0].image.url).toBe('https://example.invalid/avatar.png');
  expect(f.commands).toHaveLength(2);
  expect(f.commands[1].at(-2)).toBe('sent');
});
it('sends a checked image attachment with a generated filename', async () => {
  const f = backend();
  const file = new File([Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3,4])], 'avatar.png', { type: 'image/png' });
  const response = await createWorker(f).fetch(request({ file }), env);
  expect(response.status).toBe(200);
  const init = f.fetchImpl.mock.calls.find(([url]) => url.startsWith('https://discord.com/'))[1];
  expect(init.body.get('files[0]').size).toBe(file.size);
  const payload = JSON.parse(init.body.get('payload_json'));
  expect(payload.embeds[0].image.url).toMatch(/^attachment:\/\/avatar_suggestion_\d+\.png$/);
});
it.each(['pending', 'unknown', 'sent', 'limited'])('does not send another message for a %s reservation', async reserved => {
  const f = backend({ reserved });
  const response = await createWorker(f).fetch(request(), env);
  expect(response.status).toBe(reserved === 'sent' ? 200 : reserved === 'limited' ? 429 : 502);
  expect(f.fetchImpl.mock.calls.some(([url]) => url.startsWith('https://discord.com/'))).toBe(false);
});
it.each([400, 403, 429, 503])('does not retry Discord HTTP %i', async discordStatus => {
  const f = backend({ discordStatus });
  const response = await createWorker(f).fetch(request(), env);
  expect(await response.json()).toMatchObject({ outcome: discordStatus === 503 ? 'unknown' : 'failed' });
  expect(f.fetchImpl.mock.calls.filter(([url]) => url.startsWith('https://discord.com/'))).toHaveLength(1);
  expect(f.commands[1].at(-2)).toBe(discordStatus === 503 ? 'unknown' : 'failed');
});
it('never confirms or repeats a disconnected Discord request', async () => {
  const f = backend({ disconnect: true });
  const response = await createWorker(f).fetch(request(), env);
  expect(await response.json()).toMatchObject({ outcome: 'unknown' });
  expect(f.fetchImpl.mock.calls.filter(([url]) => url.startsWith('https://discord.com/'))).toHaveLength(1);
});
it('does not misreport a confirmed message as failed when deduplication finalization fails', async () => {
  const f = backend({ finalizeFails: true });
  const response = await createWorker(f).fetch(request(), env);
  expect(await response.json()).toEqual({ status: 'sent' });
});
it('does not confirm a successful HTTP response without a message acknowledgement', async () => {
  const f = backend({ message: {} });
  const response = await createWorker(f).fetch(request(), env);
  expect(await response.json()).toMatchObject({ outcome: 'unknown' });
});
it.each(['http://discord.com/api/webhooks/123/token', 'https://evil.invalid/api/webhooks/123/token',
  'https://user:password@discord.com/api/webhooks/123/token'])('does not relay to an invalid webhook: %s', async webhook => {
  const f = backend();
  expect((await createWorker(f).fetch(request(), { ...env, AVATAR_SUGGESTION_WEBHOOK_URL: webhook })).status).toBe(503);
  expect(f.commands).toHaveLength(0);
});
it('enforces the streamed body bound before parsing or reserving a delivery', async () => {
  const f = backend();
  const oversized = request();
  oversized.headers.set('content-length', '99999999');
  expect((await createWorker(f).fetch(oversized, env)).status).toBe(413);
  expect(f.commands).toHaveLength(0);
});
it.each([{ token: false }, { authStatus: 401 }])('blocks unauthenticated submissions: %j', async options => {
  const f = backend(options);
  expect((await createWorker(f).fetch(request(options), env)).status).toBe(401);
  expect(f.commands).toHaveLength(0);
});
it.each([{ name: '' }, { name: 'x'.repeat(101) }, { url: 'javascript:alert(1)' }, { mode: 'unknown' },
  { file: new File(['not a PNG'], 'avatar.png', { type: 'image/png' }) }])('validates the submission before reservation: %j', async options => {
    const f = backend();
    expect((await createWorker(f).fetch(request(options), env)).status).toBe(400);
    expect(f.commands).toHaveLength(0);
  },
);
it('preserves the old Discord embed shape apart from explicit mention restrictions', () => {
  const { payload } = suggestionDiscordPayload({ mode: 'url', characterName: 'Hero', seriesName: 'Series', url: 'https://example.invalid/avatar.png' }, 1000);
  expect(payload.embeds[0]).toMatchObject({ title: '🎨 Nueva Sugerencia de Avatar', color: 16766073,
    footer: { text: 'Nuvio Latino Setup • Aportes de la Comunidad' }, timestamp: '1970-01-01T00:00:01.000Z' });
});
