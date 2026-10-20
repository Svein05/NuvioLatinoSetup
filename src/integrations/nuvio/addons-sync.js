import { createTransport, isSchemaMismatch } from './transport.js';
import { getSyncOwner, listAddons } from './addons-read.js';
import { deleteAddon, installAddon, updateAddon, updateAddonOrder } from './addons-write.js';

function isAioMetadataMatch(addon, instances = []) {
  const name = String(addon?.name || '').toLowerCase();
  const url = String(addon?.manifest_url || addon?.url || '').toLowerCase();
  if (name.includes('aiostreams') || url.includes('aiostreams')) return false;
  if (name.includes('aiometadata') || name === 'aiometa' || url.includes('aiometadata')) return true;
  return instances.some(instance => {
    try { return new URL(url).host === new URL(instance).host; } catch { return false; }
  });
}

export async function installOrUpdateAioAddon(context) {
  const { profileId, manifestUrl, existingAioId, instances = [] } = context;
  const live = await listAddons(context);
  const matches = live.filter(addon => isAioMetadataMatch(addon, instances));
  const targetId = existingAioId || matches[0]?.id;
  let result;
  if (targetId) {
    await updateAddon({ ...context, addonId: targetId, name: 'AIOMetadata', manifestUrl, sortOrder: 1, enabled: true });
    result = { success: true, updated: true, addonId: targetId };
  } else {
    const installed = await installAddon({ ...context,
      addonData: { profile_id: profileId, manifest_url: manifestUrl, name: 'AIOMetadata', sort_order: 1 } });
    result = { success: true, installed: true, addonId: installed.addonId };
  }
  // Never delete the old configuration before confirming its replacement.
  for (const addon of matches) {
    if (String(addon.id) !== String(result.addonId)) await deleteAddon({ ...context, addonId: addon.id });
  }
  return result;
}

export async function syncAddonsOrder(context) {
  const { profileId, addons = [] } = context;
  const ownerId = await getSyncOwner(context);
  for (const addon of addons.filter(item => item.id)) {
    await updateAddonOrder({ ...context, addonId: addon.id, sortOrder: addon.sort_order });
  }
  const payload = addons.map(addon => ({
    id: addon.id, user_id: ownerId, profile_id: profileId, name: addon.name,
    url: addon.manifest_url || addon.url, manifest_url: addon.manifest_url || addon.url,
    sort_order: addon.sort_order, enabled: addon.enabled !== false,
  }));
  try {
    await createTransport(context)('rpc/sync_push_addons', { body: { p_profile_id: Number(profileId), p_addons: payload } });
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    if (addons.some(addon => !addon.id)) throw error;
  }
  return { success: true };
}
