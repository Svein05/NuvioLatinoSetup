// Temporary network compatibility bridge; badge data and rules are owned by the feature.
import { getBadgePackById, compileBadgeRules } from '../src/features/badges/index.js';
export { listBadgePacks, getBadgePackById, getBadgePackUrl, addCustomBadgePack,
  BADGE_MODULE_DEFINITIONS, BADGE_MODULE_TRANSLATIONS, normalizeBadgeColor, getBadgeModuleLabel,
  getCanonicalModuleId, isSectionActive, getPackSectionsOrdered, CANONICAL_FALLBACKS,
  CANONICAL_LATINO_PATTERN, stripRegexFlags, toUniversalHybridFilter,
  decoupleLatinoFromSpainPattern, sanitizeLanguageAndBadges } from '../src/features/badges/index.js';

export async function compileUniversalBadgeRules(pack, activeIds = [], orderIds = []) {
  const packObj = typeof pack === 'string' ? getBadgePackById(pack) : pack;
  if (!packObj) return { groups: [], filters: [] };


  let rawGroups = [];
  let rawFilters = [];

  if (packObj.isCustom && packObj.customJson) {
    const cJson = packObj.customJson;
    rawGroups = Array.isArray(cJson.groups) ? [...cJson.groups] : [];
    rawFilters = Array.isArray(cJson.filters) ? [...cJson.filters] : (Array.isArray(cJson) ? [...cJson] : []);
  } else {
    const packUrl = packObj.rawV2 || packObj.rawV1 || '';
    if (packUrl) {
      try {
        const resp = await fetch(packUrl);
        if (resp.ok) {
          const data = await resp.json();
          rawGroups = Array.isArray(data.groups) ? [...data.groups] : [];
          rawFilters = Array.isArray(data.filters) ? [...data.filters] : (Array.isArray(data) ? [...data] : []);
        } else {
          throw new Error(`HTTP ${resp.status}`);
        }
      } catch (err) {
        console.warn('[compileUniversalBadgeRules] Fetch directo falló, intentando con proxy CORS:', err.message);
        try {
          const proxyResp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(packUrl)}`);
          if (proxyResp.ok) {
            const data = await proxyResp.json();
            rawGroups = Array.isArray(data.groups) ? [...data.groups] : [];
            rawFilters = Array.isArray(data.filters) ? [...data.filters] : (Array.isArray(data) ? [...data] : []);
          }
        } catch (proxyErr) {
          console.error('[compileUniversalBadgeRules] Error descargando pack:', proxyErr);
        }
      }
    }
  }

  return compileBadgeRules({ groups: rawGroups, filters: rawFilters }, activeIds, orderIds);
}
