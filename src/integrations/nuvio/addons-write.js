import { createTransport } from './transport.js';
import { getSyncOwner, listAddons } from './addons-read.js';

export async function installAddon(context) {
  const { userId, addonData } = context;
  const request = createTransport(context);
  let ownerId = userId;
  try {
    ownerId = await getSyncOwner(context);
  } catch {
    // Usar userId predeterminado
  }

  const payload = [{
    user_id: ownerId,
    profile_id: addonData.profile_id,
    url: addonData.manifest_url || addonData.url,
    name: addonData.name || 'AIOMetadata',
    enabled: addonData.enabled !== undefined ? Boolean(addonData.enabled) : true,
    sort_order: addonData.sort_order ?? 1,
  }];

  try {
    const res = await request('addons', {
      headers: { Prefer: 'return=representation' },
      body: payload,
    });
    const addonId = (Array.isArray(res) ? res[0]?.id : res?.id) || null;
    return { success: true, addonId };
  } catch {
    const singlePayload = { ...payload[0], manifest_url: addonData.manifest_url, transport_url: addonData.manifest_url };
    const res = await request('addons', {
      headers: { Prefer: 'return=representation' },
      body: singlePayload,
    });
    const addonId = (Array.isArray(res) ? res[0]?.id : res?.id) || null;
    return { success: true, addonId };
  }
}

export async function deleteAddon(context) {
  const { addonId, profileId } = context;
  const request = createTransport(context);
  const profId = Number(profileId) || profileId;

  try {
    await request(`addons?id=eq.${encodeURIComponent(addonId)}&profile_id=eq.${encodeURIComponent(profId)}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateAddonOrder(context) {
  const { addonId, sortOrder } = context;
  const request = createTransport(context);

  try {
    await request(`addons?id=eq.${encodeURIComponent(addonId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { sort_order: Number(sortOrder) },
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateAddon(context) {
  const { addonId, name, manifestUrl, sortOrder, enabled } = context;
  const request = createTransport(context);
  const body = {};
  if (name !== undefined) body.name = name;
  if (manifestUrl !== undefined) {
    body.manifest_url = manifestUrl;
    body.url = manifestUrl;
    body.transport_url = manifestUrl;
  }
  if (sortOrder !== undefined) body.sort_order = Number(sortOrder);
  if (enabled !== undefined) body.enabled = Boolean(enabled);

  try {
    await request(`addons?id=eq.${encodeURIComponent(addonId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body,
    });
    return true;
  } catch {
    return false;
  }
}

export async function cleanProfileAddons(context) {
  const { profileId } = context;
  const request = createTransport(context);
  const profId = Number(profileId) || profileId;

  try {
    const existing = await listAddons(context);
    await Promise.all(existing.map(addon => deleteAddon({ ...context, addonId: addon.id })));
  } catch {
    // Continuar a delete masivo
  }

  try {
    await request(`addons?profile_id=eq.${encodeURIComponent(profId)}`, { method: 'DELETE' });
  } catch {
    // Continuar a RPC
  }

  try {
    await request('rpc/sync_push_addons', { body: { p_profile_id: profId, p_addons: [] } });
  } catch {
    // Limpieza completada
  }

  return { success: true };
}
