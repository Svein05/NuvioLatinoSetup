export function profileIndex(value) {
  const text = String(value ?? '');
  if (!/^[1-6]$/.test(text)) throw new Error('El identificador debe ser un índice de perfil entre 1 y 6.');
  return Number(text);
}

export function normalizeProfile(profile) {
  const index = profileIndex(profile.profile_index ?? profile.profile_id ?? profile.id);
  const name = String(profile.name || '').trim() || `Perfil ${index}`;
  return { id: index, profile_index: index, profile_id: index,
    uuid: typeof profile.id === 'string' && profile.id.includes('-') ? profile.id : (profile.uuid || null),
    name, avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    avatar_color_hex: profile.avatar_color_hex || '#6366F1', avatar_id: profile.avatar_id ?? null,
    uses_primary_addons: Boolean(profile.uses_primary_addons), uses_primary_plugins: Boolean(profile.uses_primary_plugins),
    ...(profile.profile_background_id !== undefined ? { profile_background_id: profile.profile_background_id } : {}),
    ...(profile.profile_background_url !== undefined ? { profile_background_url: profile.profile_background_url } : {}) };
}

export function profileDocument(profile) {
  return { profile_index: profileIndex(profile.profile_index ?? profile.id), name: profile.name,
    avatar_url: profile.avatar_url, avatar_color_hex: profile.avatar_color_hex || '#6366F1', avatar_id: profile.avatar_id ?? null,
    uses_primary_addons: Boolean(profile.uses_primary_addons), uses_primary_plugins: Boolean(profile.uses_primary_plugins),
    ...(profile.profile_background_id !== undefined ? { profile_background_id: profile.profile_background_id } : {}),
    ...(profile.profile_background_url !== undefined ? { profile_background_url: profile.profile_background_url } : {}) };
}
