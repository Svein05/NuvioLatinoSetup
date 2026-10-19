import { expect, it, vi } from 'vitest';
import { readProfiles } from '../profiles-read.js';
import { createProfile, updateProfile, updateProfileAvatar, deleteProfile } from '../profiles-write.js';

const context = { apiUrl: 'https://nuvio.invalid', apikey: 'public', accessToken: 'synthetic', userId: 'account', profileId: 2 };
const original = { profile_index: 2, id: 'synthetic-uuid-2', name: 'Original', avatar_url: 'https://example.invalid/Original.webp',
  avatar_color_hex: '#ABCDEF', avatar_id: 4, uses_primary_addons: true, uses_primary_plugins: true };

function backend({ profiles = [original], failure, dataOnly = false } = {}) {
  let rows = structuredClone(profiles);
  const fetchImpl = vi.fn(async (url, options) => {
    const operation = new URL(url).pathname.split('/').at(-1);
    const body = options.body ? JSON.parse(options.body) : null;
    const failed = failure?.(operation, options);
    if (failed) return failed;
    if (operation === 'sync_pull_profiles' || operation === 'profiles') return Response.json(rows);
    if (operation === 'sync_push_profiles') {
      rows = body.p_profiles.map(profile => ({ ...profile, id: `synthetic-uuid-${profile.profile_index}` }));
      return Response.json({ success: true });
    }
    if (operation === 'sync_delete_profile_data') {
      if (!dataOnly) rows = rows.filter(profile => profile.profile_index !== body.p_profile_id);
      return Response.json({ success: true });
    }
    throw new Error('Unexpected synthetic operation');
  });
  return { ...context, fetchImpl };
}

it('keeps numeric profile indexes separate from UUIDs and rejects guessing indexes from list position', async () => {
  const profile = (await readProfiles(backend()))[0];
  expect(profile).toMatchObject({ id: 2, profile_index: 2, uuid: original.id });
  const invalid = backend({ profiles: [{ id: 'uuid-without-index', name: 'Ambiguous' }] });
  await expect(readProfiles(invalid)).rejects.toThrow('índice');
});

it.each([401, 403, 400])('does not bypass a profile read rejected with HTTP %s', async status => {
  const data = backend({ failure: () => Response.json({}, { status }) });
  await expect(readProfiles(data)).rejects.toMatchObject({ status });
  expect(data.fetchImpl).toHaveBeenCalledTimes(1);
});

it('preserves existing avatar and inheritance settings when adding a profile', async () => {
  const data = backend();
  expect(await createProfile({ ...data, name: 'New' })).toMatchObject({ profile_index: 1, name: 'New' });
  const write = data.fetchImpl.mock.calls.find(([url]) => url.endsWith('/sync_push_profiles'));
  expect(JSON.parse(write[1].body).p_profiles[0]).toMatchObject({ avatar_color_hex: '#ABCDEF', avatar_id: 4,
    uses_primary_addons: true, uses_primary_plugins: true });
});

it('blocks profile creation when the initial read fails or all six slots are occupied', async () => {
  const unavailable = backend({ failure: () => Response.json({}, { status: 503 }) });
  await expect(createProfile({ ...unavailable, name: 'New' })).rejects.toMatchObject({ status: 503 });
  expect(unavailable.fetchImpl.mock.calls.every(([, options]) => options.method === 'GET' || options.body === '{}')).toBe(true);
  const full = backend({ profiles: Array.from({ length: 6 }, (_, index) => ({ ...original, profile_index: index + 1 })) });
  await expect(createProfile({ ...full, name: 'New' })).rejects.toThrow('6 perfiles');
  expect(full.fetchImpl).toHaveBeenCalledTimes(1);
});

it('does not retry a profile creation after an ambiguous write', async () => {
  const data = backend({ failure: operation => {
    if (operation === 'sync_push_profiles') throw new TypeError('offline after write');
  } });
  await expect(createProfile({ ...data, name: 'New' })).rejects.toMatchObject({ outcome: 'unknown' });
  expect(data.fetchImpl.mock.calls.filter(([, options]) => options.body && options.body !== '{}')).toHaveLength(1);
});

it('updates only the requested field and verifies the new avatar or name before declaring success', async () => {
  const data = backend();
  expect(await updateProfile({ ...data, name: 'Renamed' })).toEqual({ success: true, name: 'Renamed' });
  expect(await updateProfileAvatar({ ...data, avatarUrl: 'https://example.invalid/CaseSensitive.webp' }))
    .toEqual({ success: true, avatar_url: 'https://example.invalid/CaseSensitive.webp' });
  const row = (await readProfiles(data))[0];
  expect(row).toMatchObject({ name: 'Renamed', uses_primary_addons: true, avatar_id: 4 });
});

it('stops destructive alternatives as soon as profile absence is confirmed', async () => {
  const data = backend();
  expect(await deleteProfile(data)).toEqual({ success: true, remainingProfiles: [] });
  expect(data.fetchImpl.mock.calls.filter(([url]) => url.endsWith('/sync_delete_profile_data'))).toHaveLength(1);
  expect(data.fetchImpl.mock.calls.some(([url]) => url.endsWith('/sync_push_profiles'))).toBe(false);
});

it('does not use a profile upsert as a deletion fallback when the target remains present', async () => {
  const other = { ...original, profile_index: 3, name: 'Other' };
  const data = backend({ profiles: [original, other], dataOnly: true });
  await expect(deleteProfile(data)).rejects.toMatchObject({ outcome: 'unknown' });
  expect(data.fetchImpl.mock.calls.some(([url]) => url.endsWith('/sync_push_profiles'))).toBe(false);
});

it('does not claim a verified deletion when the verification read fails', async () => {
  let deleted = false;
  const data = backend({ failure: operation => {
    if (operation === 'sync_delete_profile_data') deleted = true;
    if (deleted && ['sync_pull_profiles', 'profiles'].includes(operation)) return Response.json({}, { status: 503 });
  } });
  await expect(deleteProfile(data)).rejects.toMatchObject({ outcome: 'unknown' });
  expect(data.fetchImpl.mock.calls.some(([url]) => url.endsWith('/sync_push_profiles'))).toBe(false);
});
