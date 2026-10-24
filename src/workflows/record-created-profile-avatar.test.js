import { expect, it, vi } from 'vitest';
import { recordCreatedProfileAvatar } from './record-created-profile-avatar.js';
const key = 'NetflixStyle/Naruto/Naruto.webp';
const url = 'https://assets.invalid/assets/profile_icons/' + key;
const flush = async () => { await new Promise(resolve => setTimeout(resolve, 0)); };
function fixture(overrides = {}) {
  const recordUsage = vi.fn().mockResolvedValue({ status: 'recorded' });
  const onRecorded = vi.fn();
  const args = { profile: { avatar_url: url }, avatarUrl: url, accessToken: 'synthetic', recordUsage, onRecorded, ...overrides };
  recordCreatedProfileAvatar(args);
  return args;
}
it('records the persisted catalog avatar and refreshes only after confirmation', async () => {
  const f = fixture();
  expect(f.recordUsage).not.toHaveBeenCalled();
  await flush();
  expect(f.recordUsage).toHaveBeenCalledExactlyOnceWith(key, { accessToken: 'synthetic' });
  expect(f.onRecorded).toHaveBeenCalledOnce();
});
it.each([{ profile: null }, { profile: { avatar_url: 'native:robot' } }, { avatarUrl: 'native:robot' },
  { avatarUrl: 'https://custom.invalid/avatar.png' }, { accessToken: '' }])('skips unconfirmed, mismatched and noncatalog avatars: %j', async overrides => {
  const f = fixture(overrides);
  await flush();
  expect(f.recordUsage).not.toHaveBeenCalled();
});
it('does not refresh for a duplicate or fail creation when analytics rejects', async () => {
  const recordUsage = vi.fn().mockResolvedValueOnce({ status: 'duplicate' }).mockRejectedValueOnce(new Error('offline'));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const first = fixture({ recordUsage });
  await flush();
  const second = fixture({ recordUsage });
  await flush();
  expect(first.onRecorded).not.toHaveBeenCalled();
  expect(second.onRecorded).not.toHaveBeenCalled();
  expect(warning).toHaveBeenCalledOnce();
  warning.mockRestore();
});
