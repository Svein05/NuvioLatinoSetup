import { createTransport, isSchemaMismatch } from './transport.js';
import { getSyncOwner, listAddons } from './addons-read.js';

export async function installAddon(context) {
  const { addonData } = context;
  const request = createTransport(context);
  const ownerId = await getSyncOwner(context);
  const payload = {
    user_id: ownerId, profile_id: addonData.profile_id,
    url: addonData.manifest_url || addonData.url, name: addonData.name || 'AIOMetadata',
    enabled: addonData.enabled !== false, sort_order: addonData.sort_order ?? 1,
  };
  let response;
  try {
    response = await request('addons', { headers: { Prefer: 'return=representation' }, body: [payload] });
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    response = await request('addons', { headers: { Prefer: 'return=representation' },
      body: { ...payload, manifest_url: payload.url, transport_url: payload.url } });
  }
  const addonId = Array.isArray(response) ? response[0]?.id : response?.id;
  if (!addonId) throw new Error('Nuvio no confirmó la instalación del addon. Recarga antes de reintentar.');
  return { success: true, addonId };
}

export async function deleteAddon(context) {
  const { addonId, profileId } = context;
  await createTransport(context)(`addons?id=eq.${encodeURIComponent(addonId)}&profile_id=eq.${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
  });
  return true;
}

export async function updateAddonOrder(context) {
  await createTransport(context)(`addons?id=eq.${encodeURIComponent(context.addonId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { sort_order: Number(context.sortOrder) },
  });
  return true;
}

export async function updateAddon(context) {
  const { addonId, name, manifestUrl, sortOrder, enabled } = context;
  const body = {};
  if (name !== undefined) body.name = name;
  if (manifestUrl !== undefined) Object.assign(body, { manifest_url: manifestUrl, url: manifestUrl, transport_url: manifestUrl });
  if (sortOrder !== undefined) body.sort_order = Number(sortOrder);
  if (enabled !== undefined) body.enabled = Boolean(enabled);
  const request = createTransport(context);
  try {
    await request(`addons?id=eq.${encodeURIComponent(addonId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body,
    });
  } catch (error) {
    if (!['PGRST204', '42703'].includes(error.code)) throw error;
    const compact = Object.fromEntries(Object.entries(body).filter(([key]) => !['manifest_url', 'transport_url'].includes(key)));
    await request(`addons?id=eq.${encodeURIComponent(addonId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: compact,
    });
  }
  return true;
}

export async function cleanProfileAddons(context) {
  const existing = await listAddons(context);
  for (const addon of existing) await deleteAddon({ ...context, addonId: addon.id });
  return { success: true };
}
