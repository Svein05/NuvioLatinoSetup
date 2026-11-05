/** Resolve the same effective provider state for preferences, summary and provisioning. */
export function getEnrichmentState(preferences = {}, apiKeys = {}) {
  const requested = Boolean(preferences.mdblistRatings);
  const hasKey = Boolean(apiKeys.mdblist?.trim());
  return { tmdb: Boolean(preferences.tmdbEnrichment), mdblist: requested && hasKey,
    mdblistMissingKey: requested && !hasKey };
}
