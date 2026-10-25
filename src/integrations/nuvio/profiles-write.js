import { HttpError } from '../../shared/http/request-json.js';
import { createTransport, isSchemaMismatch } from './transport.js';
import { profileDocument, profileIndex } from './profile-mapping.js';
import { readProfiles } from './profiles-read.js';

async function profileRpc(context, operation, body) {
  const request = createTransport(context);
  try { return await request(`rpc/${operation}`, { body: { ...body, p_origin_client_id: 'nuvio-setup-web' } }); }
  catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    return request(`rpc/${operation}`, { body });
  }
}

async function pushProfiles(context, profiles) {
  return profileRpc(context, 'sync_push_profiles', { p_profiles: profiles.map(profileDocument), p_client_max_profiles: 6 });
}

function scopedFilter(profile, context) {
  if (profile.uuid) return new URLSearchParams({ id: `eq.${profile.uuid}` });
  if (!context.userId) throw new Error('Falta la cuenta del perfil.');
  return new URLSearchParams({ user_id: `eq.${context.userId}`, profile_index: `eq.${profile.profile_index}` });
}

async function confirmedProfiles(context, predicate, message) {
  let profiles;
  try { profiles = await readProfiles(context); }
  catch (cause) { throw new HttpError('No se pudo verificar el resultado del cambio de perfil. Recarga antes de reintentar.', { cause, outcome: 'unknown' }); }
  if (!predicate(profiles)) throw new HttpError(message, { outcome: 'unknown' });
  return profiles;
}

function cleanName(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('El nombre del perfil no puede estar vacío.');
  return value.trim();
}

/** Read failures never become empty replacement snapshots; ambiguous writes never fall through to REST. */
export async function createProfile(context) {
  const existing = await readProfiles(context);
  const used = new Set(existing.map(profile => profile.profile_index));
  const index = [1, 2, 3, 4, 5, 6].find(value => !used.has(value));
  if (!index) throw new Error('Has alcanzado el límite máximo de 6 perfiles en Nuvio.');
  const name = cleanName(context.name);
  const created = { profile_index: index, name, avatar_color_hex: '#6366F1',
    avatar_url: context.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    avatar_id: null, uses_primary_addons: false, uses_primary_plugins: false };
  try { await pushProfiles(context, [created]); }
  catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    await createTransport(context)('profiles', { body: { user_id: context.userId, ...profileDocument(created), profile_id: index },
      headers: { Prefer: 'return=representation' } });
  }
  const confirmed = await confirmedProfiles(context, profiles => profiles.some(profile => profile.profile_index === index && profile.name === name),
    'Nuvio no confirmó el perfil creado. Recarga antes de reintentar.');
  return confirmed.find(profile => profile.profile_index === index);
}

async function updateFields(context, fields) {
  const index = profileIndex(context.profileId);
  const existing = await readProfiles(context);
  const target = existing.find(profile => profile.profile_index === index);
  if (!target) throw new Error('El perfil de destino ya no existe.');
  // sync_push_profiles upserts only the supplied indexes; unrelated profiles remain untouched.
  const updated = [{ ...target, ...fields }];
  try { await pushProfiles(context, updated); }
  catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    await createTransport(context)(`profiles?${scopedFilter(target, context)}`, {
      method: 'PATCH', body: fields, headers: { Prefer: 'return=representation' },
    });
  }
  await confirmedProfiles(context, profiles => profiles.some(profile => profile.profile_index === index
    && Object.entries(fields).every(([key, value]) => profile[key] === value)), 'Nuvio no confirmó los cambios del perfil.');
  return { success: true, ...fields };
}

export function updateProfile(context) { return updateFields(context, { name: cleanName(context.name) }); }

export function updateProfileAvatar(context) {
  const url = new URL(context.avatarUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('La URL del avatar debe usar HTTP o HTTPS.');
  return updateFields(context, { avatar_url: context.avatarUrl.trim() });
}

export async function deleteProfile(context) {
  const index = profileIndex(context.profileId);
  const existing = await readProfiles(context);
  const target = existing.find(profile => profile.profile_index === index);
  if (!target) return { success: true, remainingProfiles: existing };
  const request = createTransport(context);
  try {
    await profileRpc(context, 'sync_delete_profile_data', { p_profile_id: index });
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    await request(`profiles?${scopedFilter(target, context)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
  }
  // Official sync_push_profiles is an upsert, not a deletion API.
  // Never use an array with the target omitted as proof of deletion.
  const remaining = await confirmedProfiles(context, profiles => !profiles.some(profile => profile.profile_index === index),
    'El perfil todavía figura en Nuvio. No se confirmó su eliminación.');
  return { success: true, remainingProfiles: remaining };
}
