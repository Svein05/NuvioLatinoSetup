import { normalizeAvatarStorageKey } from '../features/avatars/index.js';

/** Optional analytics never turn a confirmed profile creation into a failed operation. */
export function recordCreatedProfileAvatar({ profile, avatarUrl, accessToken, recordUsage, onRecorded }) {
  const key = normalizeAvatarStorageKey(avatarUrl);
  if (!key || !accessToken || !recordUsage || normalizeAvatarStorageKey(profile?.avatar_url) !== key) return;
  void Promise.resolve().then(() => recordUsage(key, { accessToken })).then(result => {
    if (result?.status === 'recorded') return onRecorded?.();
  }).catch(() => { console.warn('No se pudo actualizar el ranking del avatar del perfil creado.'); });
}
