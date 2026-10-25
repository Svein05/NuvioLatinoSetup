import { expect, it, vi } from 'vitest';
import { prepareAvatarSuggestion, validateSuggestionFile, createSuggestionCooldown } from '../index.js';

const draft = { mode: 'url', url: 'https://example.invalid/avatar.png', characterName: ' Hero ', seriesName: ' Series ' };
it('normalizes a detached suggestion without altering its draft', () => {
  expect(prepareAvatarSuggestion(draft)).toEqual({ ...draft, characterName: 'Hero', seriesName: 'Series' });
  expect(draft.characterName).toBe(' Hero ');
});
it.each(['javascript:alert(1)', 'data:image/png;base64,abc', 'http://example.invalid/image.png', 'https://user:password@example.invalid/image.png'])('rejects an unsafe preview URL: %s', url => {
  expect(() => prepareAvatarSuggestion({ ...draft, url })).toThrow();
});
it.each([{ characterName: '' }, { seriesName: '' }, { characterName: 'x'.repeat(101) }, { mode: 'unknown' }])('rejects invalid form fields: %j', fields => {
  expect(() => prepareAvatarSuggestion({ ...draft, ...fields })).toThrow();
});
it.each(['image/png', 'image/webp', 'image/jpeg', 'image/gif'])('preserves file mode for %s', type => {
  const file = new File(['synthetic'], 'avatar', { type });
  expect(prepareAvatarSuggestion({ ...draft, mode: 'file', file }).file).toBe(file);
});
it.each([{ type: 'image/svg+xml', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 8388609 }])('rejects an unsupported, empty or oversized file: %j', file => {
  expect(() => validateSuggestionFile(file)).toThrow();
});
it('retains the existing 120-second success cooldown even with blocked storage', () => {
  let now = 100000;
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const cooldown = createSuggestionCooldown({ storage, now: () => now, reportWarning: vi.fn() });
  expect(cooldown.remaining()).toBe(0);
  cooldown.confirm();
  expect(cooldown.remaining()).toBe(120);
  now += 119000;
  expect(cooldown.remaining()).toBe(1);
  now += 1000;
  expect(cooldown.remaining()).toBe(0);
});
