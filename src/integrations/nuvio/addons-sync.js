import { createTransport } from './transport.js';
import { getSyncOwner, listAddons } from './addons-read.js';
import { deleteAddon, installAddon, updateAddonOrder } from './addons-write.js';

function isAioMetadataMatch(addon, instances = []) {
  const name = String(addon?.name || '').toLowerCase().trim();
  const url = String(addon?.url || addon?.manifest_url || '').toLowerCase().trim();
  if (name.includes('aiostreams') || url.includes('aiostreams')) return false;
  if (name.includes('aiometadata') || name === 'aiometa' || url.includes('aiometadata')) return true;
  return instances.some(inst => {
    const host = inst.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
    return host && url.includes(host);
  });
}

async function removeDuplicateAioAddons(context, matches, targetId, profId) {
  for (const match of matches) {
    if (match.id && String(match.id) !== String(targetId)) {
      try {
        await deleteAddon({ ...context, addonId: match.id, profileId: profId });
      } catch {
        // Ignorar fallo al eliminar duplicado
      }
    }
  }
}

async function patchExistingAioAddon(context, targetAioId, manifestUrl, profId) {
  const request = createTransport(context);
  try {
    await request(`addons?id=eq.${encodeURIComponent(targetAioId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { url: manifestUrl, manifest_url: manifestUrl, transport_url: manifestUrl, name: 'AIOMetadata', sort_order: 1, enabled: true },
    });
    return { success: true, updated: true, addonId: targetAioId };
  } catch {
    try {
      await deleteAddon({ ...context, addonId: targetAioId, profileId: profId });
    } catch {
      // Ignorar fallo de borrado tras patch fallido
    }
    return null;
  }
}

export async function installOrUpdateAioAddon(context) {
  const { profileId, manifestUrl, existingAioId, instances = [] } = context;
  const profId = Number(profileId) || profileId;

  let liveAddons = [];
  try {
    liveAddons = await listAddons({ ...context, profileId: profId });
  } catch {
    // Continuar si falla listado
  }

  const matches = liveAddons.filter(a => isAioMetadataMatch(a, instances));
  const targetId = existingAioId || matches[0]?.id || null;
  await removeDuplicateAioAddons(context, matches, targetId, profId);

  if (targetId) {
    const patched = await patchExistingAioAddon(context, targetId, manifestUrl, profId);
    if (patched) return patched;
  }

  const installed = await installAddon({
    ...context,
    addonData: { profile_id: profId, manifest_url: manifestUrl, url: manifestUrl, name: 'AIOMetadata', sort_order: 1 },
  });
  return { success: true, installed: true, addonId: installed?.addonId || null };
}

export async function syncAddonsOrder(context) {
  const { profileId, addons = [], userId } = context;
  const profId = Number(profileId) || profileId;
  const request = createTransport(context);

  let ownerId = userId;
  try {
    ownerId = await getSyncOwner(context);
  } catch {
    // Usar userId predeterminado
  }

  await Promise.all(addons.filter(a => a.id).map(a => updateAddonOrder({ ...context, addonId: a.id, sortOrder: a.sort_order })));

  try {
    const syncPayload = addons.map(a => ({
      id: a.id || undefined,
      user_id: ownerId,
      profile_id: profId,
      name: a.name,
      url: a.manifest_url || a.url,
      manifest_url: a.manifest_url || a.url,
      sort_order: a.sort_order,
      enabled: a.enabled !== false,
    }));
    await request('rpc/sync_push_addons', { body: { p_profile_id: profId, p_addons: syncPayload } });
  } catch {
    // Sincronización RPC no fatal
  }
  return { success: true };
}
