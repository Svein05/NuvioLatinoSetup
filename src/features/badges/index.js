export { BADGE_MODULE_DEFINITIONS, BADGE_MODULE_TRANSLATIONS } from './data/modules.js';
export { CANONICAL_FALLBACKS, CANONICAL_LATINO_PATTERN } from './data/patterns.js';
export { listBadgePacks, getBadgePackById, getBadgePackUrl, addCustomBadgePack } from './state/catalog.js';
export { normalizeBadgeColor } from './model/colors.js';
export { getBadgeModuleLabel, getCanonicalModuleId, isSectionActive } from './model/module-identity.js';
export { getPackSectionsOrdered } from './model/sections.js';
export { stripRegexFlags, toUniversalHybridFilter, decoupleLatinoFromSpainPattern } from './model/hybrid-patterns.js';
export { sanitizeLanguageAndBadges } from './model/language-filters.js';
export { compileBadgeRules } from './model/compile-rules.js';
