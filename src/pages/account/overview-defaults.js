/** Fresh empty domain data, distinct from the pending visual state. */
export function createEmptyOverview() {
  return {
    pluginsCount: 0,
    addonsCount: 0,
    progressCount: 0,
    libraryCount: 0,
    watchedCount: 0,
    currentlyWatching: [],
    recentlyWatched: [],
  };
}
