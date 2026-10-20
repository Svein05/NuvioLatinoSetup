import { getBadgePackById } from '../../../features/badges/index.js';

function countActiveFolders(collections = []) {
  let count = 0;
  collections.forEach(sec => {
    if (sec.enabled !== false) {
      (sec.folders || []).forEach(f => {
        if (f.enabled !== false) count++;
      });
    }
  });
  return count;
}

function getPosterEngineLabel(engine) {
  if (engine === 'betterposter') return 'BetterPoster (es-MX)';
  if (engine === 'postersplus') return 'PostersPlus (Badges)';
  return 'Nativo / Limpio';
}

function getEnrichmentLabel(preferences, apiKeys = {}) {
  const enr = Boolean(preferences?.tmdbEnrichment);
  const rat = Boolean(preferences?.mdblistRatings && apiKeys.mdblist);
  if (enr && rat) return { text: 'TMDB + MDBList (Activos)', active: true };
  if (enr) return { text: 'Solo TMDB (Activo)', active: true };
  if (rat) return { text: 'Solo MDBList (Activo)', active: true };
  return { text: 'Desactivados', active: false };
}

function getAddonsStatusLabel(profileAddons = [], aiostreams = {}) {
  const extraCount = profileAddons.length;
  const hasAioStreams = Boolean(aiostreams?.installed || profileAddons.some(a => a.isAioStreams));
  if (hasAioStreams && extraCount === 1) return 'AIOMetadata (#1) + AIOStreams';
  if (hasAioStreams) return `AIOMetadata (#1) + AIOStreams + ${extraCount - 1} más`;
  if (extraCount > 0) return `AIOMetadata (#1) + ${extraCount} addons`;
  return 'AIOMetadata (#1 principal)';
}

export function refreshStep7Summary(root, state) {
  const targetEl = root.querySelector?.('#summaryProfileTarget');
  const countEl = root.querySelector?.('#summaryCollectionsCount');
  const catalogsEl = root.querySelector?.('#summaryCatalogsCount');
  const posterEngineEl = root.querySelector?.('#summaryPosterEngine');
  const enrichmentEl = root.querySelector?.('#summaryEnrichmentStatus');
  const badgesEl = root.querySelector?.('#summaryBadgesStatus');
  const addonsEl = root.querySelector?.('#summaryAddonsStatus');

  const activeFolders = countActiveFolders(state.collections || []);
  let catalogsCount = 0;
  try {
    const meta = state.getSynchronizedMetadataPayload?.() || {};
    catalogsCount = (meta.config?.catalogs || meta.catalogs || []).length;
  } catch {
    // Keep 0
  }

  if (targetEl) targetEl.innerText = state.isManualMode ? 'Manual (Sin cuenta)' : (state.selectedProfileName || 'Perfil Principal');
  if (countEl) countEl.innerText = `${activeFolders} carruseles seleccionados`;
  if (catalogsEl) catalogsEl.innerText = `${catalogsCount} catálogos sincronizados`;
  if (posterEngineEl) posterEngineEl.innerText = getPosterEngineLabel(state.preferences?.posterEngine);

  if (enrichmentEl) {
    const enr = getEnrichmentLabel(state.preferences, state.apiKeys);
    enrichmentEl.innerText = enr.text;
    enrichmentEl.className = `text-xs sm:text-sm ${enr.active ? 'text-white' : 'text-white/40'} font-medium block truncate`;
  }

  if (badgesEl) {
    const enabled = Boolean(state.preferences?.badgesEnabled);
    const pack = enabled ? getBadgePackById(state.preferences?.selectedBadgePack) : null;
    badgesEl.innerText = enabled ? (pack?.name || 'Badges') : 'Desactivado';
    badgesEl.className = `text-xs sm:text-sm ${enabled ? 'text-white' : 'text-white/40'} font-medium block truncate`;
  }

  if (addonsEl) addonsEl.innerText = getAddonsStatusLabel(state.profileAddons, state.aiostreams);
}
