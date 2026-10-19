// Temporary network compatibility bridge; badge data and rules are owned by the feature.
export { listBadgePacks, getBadgePackById, getBadgePackUrl, addCustomBadgePack,
  BADGE_MODULE_DEFINITIONS, BADGE_MODULE_TRANSLATIONS, normalizeBadgeColor, getBadgeModuleLabel,
  getCanonicalModuleId, isSectionActive, getPackSectionsOrdered, CANONICAL_FALLBACKS,
  CANONICAL_LATINO_PATTERN, stripRegexFlags, toUniversalHybridFilter,
  decoupleLatinoFromSpainPattern, sanitizeLanguageAndBadges } from '../src/features/badges/index.js';

export { compileUniversalBadgeRules } from '../src/app/badge-compilation.js';
