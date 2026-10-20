export { formatStyleName, formatFranchiseName, formatCharacterName } from './model/names.js';
export { compareAvatars } from './model/order.js';
export { compileRegistry } from './model/compile-registry.js';
export { getStylesSummary, getFranchisesSummary, filterAvatars } from './model/catalog-selectors.js';
export { registryFromPaths, isAvatarRegistry } from './model/registry.js';
export { createAvatarCatalogStore } from './state/catalog.js';
export { BASELINE_TOP_AVATARS } from './data/ranking-baseline.js';
export { normalizeAvatarStorageKey, completeAvatarRanking } from './model/ranking.js';
export { createAvatarRankingStore } from './application/ranking-store.js';
export { prepareAvatarSuggestion, validateSuggestionFile, suggestionImageUrl,
  formatSuggestionFileSize } from './model/suggestion.js';
export { createSuggestionCooldown } from './application/suggestion-cooldown.js';
export { mountAvatarSuggestions } from './ui/suggestion-controller.js';
