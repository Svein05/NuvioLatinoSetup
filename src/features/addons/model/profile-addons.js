import { isAioMetadataAddon, isAioStreamsAddon, isSameManifest } from './identity.js';

const AIOSTREAMS_LOGO = 'https://numb3rs.stream/assets/images/aiostreams.svg';
const AIOSTREAMS_DESC = 'Addon de streaming unificado con priorización full latino (Debrids configurados).';

export function hasAioStreamsInstance(addons = []) {
  return addons.some(a => Boolean(a.isAioStreams || a.isPreexistingAioStreams || isAioStreamsAddon(a)));
}

export function getAioStreamsIndex(addons = []) {
  return addons.findIndex(a => Boolean(a.isAioStreams || a.isPreexistingAioStreams || isAioStreamsAddon(a)));
}

export function hasAddonManifest(addons = [], manifestUrl = '') {
  return addons.some(addon => isSameManifest(addon.manifest_url || addon.url, manifestUrl));
}

function mapSecondaryAddon(addon, index) {
  return {
    id: addon.id || null,
    name: addon.name || `Addon ${index + 2}`,
    url: addon.url || addon.manifest_url || '',
    manifest_url: addon.manifest_url || addon.url || '',
    logo: addon.logo || addon.icon || (addon.raw && (addon.raw.logo || addon.raw.icon)) || null,
    enabled: addon.enabled !== false,
    sort_order: index + 2,
    isAioStreams: false,
    isPreexistingAioStreams: isAioStreamsAddon(addon),
    raw: addon,
  };
}

export function normalizeProfileAddons(addons = [], instances = []) {
  const rawList = Array.isArray(addons) ? [...addons] : [];
  const aioMatches = [];
  const secondaryRaw = [];
  for (const item of rawList) {
    if (isAioMetadataAddon(item, instances)) aioMatches.push(item);
    else secondaryRaw.push(item);
  }
  const duplicateAioIds = [];
  for (let i = 1; i < aioMatches.length; i++) {
    if (aioMatches[i]?.id) duplicateAioIds.push(aioMatches[i].id);
  }
  return {
    existingAioAddon: aioMatches[0] || null,
    duplicateAioIds,
    profileAddons: secondaryRaw.map(mapSecondaryAddon),
  };
}

export function moveProfileAddon(addons, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= addons.length) return null;
  const next = [...addons];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((addon, idx) => ({ ...addon, sort_order: idx + 2 }));
}

export function removeProfileAddon(addons, index) {
  if (index < 0 || index >= addons.length) return null;
  const next = [...addons];
  const [removed] = next.splice(index, 1);
  const reindexed = next.map((addon, idx) => ({ ...addon, sort_order: idx + 2 }));
  return { addons: reindexed, removed };
}

export function upsertAioStreamsAddon(addons, debridsMap = {}) {
  const next = [...addons];
  const existingIdx = next.findIndex(a => a.isAioStreams);
  if (existingIdx !== -1) {
    next[existingIdx] = { ...next[existingIdx], debrids: { ...debridsMap } };
    return next;
  }
  next.push({
    id: null,
    name: 'AIOStreams',
    url: null,
    manifest_url: null,
    logo: AIOSTREAMS_LOGO,
    enabled: true,
    sort_order: next.length + 2,
    isAioStreams: true,
    isPendingManifest: true,
    debrids: { ...debridsMap },
    description: AIOSTREAMS_DESC,
  });
  return next;
}

export function addCustomProfileAddon(addons, { manifestUrl, name = '', logo = '', instances = [] }) {
  const cleanUrl = String(manifestUrl || '').trim();
  if (!cleanUrl) return null;
  if (isAioMetadataAddon({ url: cleanUrl, name }, instances)) return null;
  if (hasAddonManifest(addons, cleanUrl)) return null;
  const next = [...addons];
  next.push({
    id: null,
    name: (name || '').trim() || 'Nuevo Addon',
    url: cleanUrl,
    manifest_url: cleanUrl,
    logo: (logo || '').trim() || null,
    enabled: true,
    sort_order: next.length + 2,
    isCustomAdded: true,
  });
  return next;
}
