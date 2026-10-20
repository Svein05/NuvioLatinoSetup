async function deleteRemovedAddons({ client, baseParams, profId, currentAddons, origAddons }) {
  const currentIds = new Set(currentAddons.filter(a => a.id).map(a => String(a.id)));
  const toDelete = origAddons.filter(a => a.id && !currentIds.has(String(a.id)));
  for (const delAddon of toDelete) {
    await client.deleteAddon({
      ...baseParams,
      addonId: delAddon.id,
      profileId: profId,
    }).catch(err => console.warn('[AccountManager] Error borrando addon:', err));
  }
}

async function syncSingleAddon({ client, baseParams, profId, addon, origAddon, sortOrder, userId }) {
  const rawUrl = addon.manifest_url || addon.url;
  if (!addon.id) {
    const installed = await client.installAddon({
      ...baseParams,
      userId,
      addonData: {
        profile_id: profId,
        name: addon.name,
        manifest_url: rawUrl,
        url: rawUrl,
        enabled: addon.enabled !== false,
        sort_order: sortOrder,
      },
    }).catch(err => console.warn('[AccountManager] Error instalando addon:', err));
    if (installed?.addonId) addon.id = installed.addonId;
    return;
  }

  const enabledChanged = origAddon && (Boolean(origAddon.enabled !== false) !== Boolean(addon.enabled !== false));
  const nameChanged = origAddon && (origAddon.name !== addon.name);
  const urlChanged = origAddon && ((origAddon.manifest_url || origAddon.url) !== rawUrl);

  if (origAddon && (nameChanged || urlChanged || enabledChanged)) {
    await client.updateAddon({
      ...baseParams,
      addonId: addon.id,
      name: addon.name,
      manifestUrl: rawUrl,
      enabled: addon.enabled !== false,
      sortOrder,
    }).catch(err => console.warn('[AccountManager] Error actualizando addon:', err));
  }
}

export async function saveAccountAddons({ state, config, client, ui = {} }) {
  if (!state.dirty?.addons) return;

  const profId = state.selectedProfileId;
  const currentAddons = state.installedAddons || [];
  const origAddons = state.originalInstalledAddons || [];
  const baseParams = {
    apiUrl: config?.NUVIO_API_URL,
    apikey: config?.NUVIO_PUBLIC_ANON_KEY,
    accessToken: state.session?.accessToken,
  };

  await deleteRemovedAddons({ client, baseParams, profId, currentAddons, origAddons });

  for (let i = 0; i < currentAddons.length; i++) {
    const addon = currentAddons[i];
    const origAddon = origAddons.find(o => String(o.id) === String(addon.id));
    await syncSingleAddon({
      client, baseParams, profId, addon, origAddon, sortOrder: i + 1, userId: state.session?.userId,
    });
  }

  const orderedAddons = currentAddons.map((a, idx) => ({ ...a, enabled: a.enabled !== false, sort_order: idx + 1 }));
  await client.syncAddonsOrder({
    ...baseParams,
    userId: state.session?.userId,
    profileId: profId,
    addons: orderedAddons,
  }).catch(err => console.warn('[AccountManager] Error sincronizando orden de addons:', err));

  const freshAddons = await client.listAddons({
    ...baseParams,
    userId: state.session?.userId,
    profileId: profId,
  }).catch(() => currentAddons);

  state.installedAddons = JSON.parse(JSON.stringify(freshAddons));
  state.originalInstalledAddons = JSON.parse(JSON.stringify(freshAddons));
  state.dirty.addons = false;
  state.addonHistory = [];
  if (state.overviewData) state.overviewData.addonsCount = freshAddons.length;
  ui.renderAddonsSection?.(freshAddons);
}
