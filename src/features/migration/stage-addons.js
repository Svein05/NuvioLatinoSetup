import { addonUrl } from './identity.js';

/** Stage only in wizard memory. Profile persistence still belongs to the final pipeline. */
export function stageMigrationAddons(state) {
  const snapshot = state.migration;
  if (!snapshot?.selected.addons) return;
  const existing = new Set(state.profileAddons.map(addon => addonUrl(addon.manifest_url || addon.url)));
  const added = snapshot.addons.filter(addon => addon.selected && !existing.has(addon.url));
  state.profileAddons.push(...added.map((addon, index) => ({ ...addon, migrationSource: true,
    sort_order: state.profileAddons.length + index + 1 })));
}
