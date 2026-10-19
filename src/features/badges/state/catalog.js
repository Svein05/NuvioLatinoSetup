import bundledPacks from '../data/packs.json' with { type: 'json' };
const packs = [...bundledPacks];
/** Return a read-only snapshot of available packs; custom additions use the action below. */
export function listBadgePacks() { return [...packs]; }
export function getBadgePackById(id) { return packs.find(pack => pack.id === id) || packs[0]; }
export function getBadgePackUrl(id) { const pack = getBadgePackById(id); return pack.rawV2 || pack.rawV1 || ''; }
export function addCustomBadgePack(pack) { packs.unshift(pack); return pack; }
