import { addonUrl } from '../features/migration/index.js';
import { isAioMetadataAddon } from '../features/addons/index.js';

async function reconcileImportedAddons(state, client, context) {
  if (!state.migration?.selected.addons) return;
  const live = await client.listAddons(context);
  for (const addon of state.profileAddons.filter(item => item.migrationSource)) {
    const match = live.find(item => addonUrl(item.manifest_url || item.url) === addonUrl(addon.manifest_url));
    if (match) addon.id = match.id;
  }
  const present = new Set(state.profileAddons.map(item => addonUrl(item.manifest_url || item.url)));
  state.profileAddons.push(...live.filter(item => !present.has(addonUrl(item.manifest_url || item.url))
    && !isAioMetadataAddon(item) && !state.deletedAddonIds?.has(item.id)));
}

export async function prepareMigrationAddons(state, client, context) {
  if (!state.migration?.selected.addons) return;
  if (state.migration.targetProfile !== String(context.profileId)) {
    state.migration.results = {};
    state.migration.targetProfile = String(context.profileId);
  }
  state.migration.results.addons = { status: 'writing' };
  await reconcileImportedAddons(state, client, context);
}

export async function verifyMigrationAddons(state, client, context, addons) {
  if (!state.migration?.selected.addons) return;
  const verified = await client.listAddons(context);
  const urls = new Set(verified.map(item => addonUrl(item.manifest_url || item.url)));
  if (addons.some(item => item.migrationSource && !urls.has(addonUrl(item.manifest_url)))) {
    state.migration.results.addons = { status: 'uncertain' };
    throw new Error('No se pudo verificar la importación de addons. Reintenta para comprobar lo que ya se guardó.');
  }
  state.migration.results.addons = { status: 'confirmed' };
}
