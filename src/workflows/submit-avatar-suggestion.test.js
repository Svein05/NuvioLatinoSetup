import { expect, it, vi } from 'vitest';
import { createAvatarSuggestionSubmission } from './submit-avatar-suggestion.js';

const draft = { mode: 'url', url: 'https://example.invalid/avatar.png', characterName: 'Hero', seriesName: 'Series' };
function fixture() {
  const client = { send: vi.fn().mockResolvedValue({ status: 'sent' }) };
  const cooldown = { remaining: vi.fn(() => 0), confirm: vi.fn() };
  const createId = vi.fn(() => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  return { client, cooldown, createId, workflow: createAvatarSuggestionSubmission({ client, cooldown, createId }) };
}
it('coalesces double clicks and confirms only the acknowledged send', async () => {
  const f = fixture();
  const first = f.workflow.send(draft, { accessToken: 'synthetic-token' });
  expect(f.workflow.send(draft)).toBe(first);
  expect(await first).toEqual({ status: 'sent' });
  expect(f.client.send).toHaveBeenCalledTimes(1);
  expect(f.client.send).toHaveBeenCalledWith(draft, expect.objectContaining({ accessToken: 'synthetic-token', requestId: expect.any(String) }));
  expect(f.cooldown.confirm).toHaveBeenCalledTimes(1);
});
it('holds a stable snapshot while the caller continues editing', async () => {
  const f = fixture();
  const mutable = { ...draft };
  const pending = f.workflow.send(mutable);
  mutable.characterName = 'Edited later';
  await pending;
  expect(f.client.send.mock.calls[0][0].characterName).toBe('Hero');
});
it('never repeats an ambiguous delivery, even if the form is reopened', async () => {
  const f = fixture();
  f.client.send.mockRejectedValue(Object.assign(new Error('unconfirmed'), { outcome: 'unknown' }));
  await expect(f.workflow.send(draft)).rejects.toMatchObject({ outcome: 'unknown' });
  await expect(f.workflow.send({ ...draft })).rejects.toMatchObject({ outcome: 'unknown' });
  expect(f.client.send).toHaveBeenCalledTimes(1);
  expect(f.cooldown.confirm).not.toHaveBeenCalled();
});
it('uses the same request ID for an explicit retry after a definite rejection', async () => {
  const f = fixture();
  f.client.send.mockRejectedValueOnce(Object.assign(new Error('rejected'), { outcome: 'failed' }));
  await expect(f.workflow.send(draft)).rejects.toThrow();
  await f.workflow.send(draft);
  expect(f.createId).toHaveBeenCalledTimes(1);
  expect(f.client.send.mock.calls.map(([, options]) => options.requestId)).toEqual([f.createId.mock.results[0].value, f.createId.mock.results[0].value]);
});
it('blocks a local cooldown before network access', async () => {
  const f = fixture();
  f.cooldown.remaining.mockReturnValue(60);
  await expect(f.workflow.send(draft)).rejects.toThrow('60 segundos');
  expect(f.client.send).not.toHaveBeenCalled();
});
it('uses content fingerprints to avoid reuploading an unconfirmed file after reselection', async () => {
  const f = fixture();
  f.client.send.mockRejectedValue(Object.assign(new Error('unknown'), { outcome: 'unknown' }));
  for (let i = 0; i < 2; i++) {
    await expect(f.workflow.send({ ...draft, mode: 'file', file: new File(['same content'], `avatar${i}.png`, { type: 'image/png' }) })).rejects.toThrow();
  }
  expect(f.client.send).toHaveBeenCalledTimes(1);
});
