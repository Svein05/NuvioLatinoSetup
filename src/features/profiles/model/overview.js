function belongsToProfile(item, profileId) {
  return item && (item.profile_id === undefined || Number(item.profile_id) === Number(profileId));
}

function uniqueWatched(items, profileId) {
  const seen = new Set();
  return items.filter(item => {
    if (!belongsToProfile(item, profileId)) return false;
    const key = `${item.content_id || ''}_${item.season ?? ''}_${item.episode ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchesWatchedEpisode(item, watched) {
  if (!watched.content_id || watched.content_id !== item.content_id) return false;
  if (item.season !== undefined && item.season !== null && watched.season !== undefined && watched.season !== null) {
    return Number(item.season) === Number(watched.season) && Number(item.episode) === Number(watched.episode);
  }
  return true;
}

function activeProgress(items, watched, profileId) {
  return items.filter(item => {
    if (!belongsToProfile(item, profileId)) return false;
    const position = Number(item.position || 0);
    const duration = Number(item.duration || 0);
    if (position <= 0 || (duration > 0 && position / duration >= 0.9)) return false;
    return !watched.some(completed => matchesWatchedEpisode(item, completed));
  });
}

function latestShows(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.content_id || item.video_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

/** Calculate profile metrics without mutating source arrays or their count metadata. */
export function buildProfileOverview({ profileId, plugins, progressItems, libraryItems, watchedItems, loadErrors, addonsCount }) {
  const watched = uniqueWatched(watchedItems, profileId);
  const progress = activeProgress(progressItems, watched, profileId);
  return {
    pluginsCount: plugins.totalCount ?? plugins.length,
    addonsCount,
    progressCount: progress.length || (progressItems.length ? progressItems.totalCount ?? progressItems.length : 0),
    libraryCount: libraryItems.totalCount ?? libraryItems.length,
    watchedCount: watched.length,
    currentlyWatching: latestShows(progress),
    recentlyWatched: watched.slice(0, 6),
    loadErrors,
  };
}
