function formatDiscoverTitle(catId, regex, emoji) {
  const raw = catId.replace(regex, '').replace(/-/g, ' ');
  const formatted = raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `${emoji} ${formatted}`;
}

function resolveCanonicalTitle(catId, type) {
  if (catId === 'tmdb.trending_movie' || (catId.startsWith('tmdb.trending') && type === 'movie')) {
    return 'Lo que todo el mundo está viendo - Día';
  }
  if (catId === 'tmdb.trending_series' || (catId.startsWith('tmdb.trending') && type === 'series')) {
    return 'Lo que todo el mundo está viendo - Día';
  }
  if (catId === 'tmdb.top_movie' || (catId.startsWith('tmdb.top') && type === 'movie')) {
    return 'Lo más popular de hoy';
  }
  if (catId === 'tmdb.top_series' || (catId.startsWith('tmdb.top') && type === 'series')) {
    return 'Lo más popular de hoy';
  }
  if (catId === 'trakt.recommendations.movies' || catId === 'trakt.recommendations.shows') {
    return 'Recomendaciones de Trakt';
  }
  if (catId.startsWith('tmdb.discover.movie.streaming.') || catId.startsWith('tmdb.discover.series.streaming.')) {
    return formatDiscoverTitle(catId, /tmdb\.discover\.(movie|series)\.streaming\./, '🎬');
  }
  if (catId.startsWith('tmdb.discover.movie.genres.') || catId.startsWith('tmdb.discover.series.genres.')) {
    return formatDiscoverTitle(catId, /tmdb\.discover\.(movie|series)\.genres\./, '🎭');
  }
  return null;
}

export function resolveCatalogTitle(source, catalogMap = null) {
  if (source?.title?.trim()) {
    return source.title.trim();
  }
  const catId = source?.catalogId || source?.id || '';
  const type = source?.type || '';
  const meta = catalogMap ? catalogMap.get(catId) : null;

  if (meta?.name && !meta.name.toLowerCase().startsWith('tmdb.') && !meta.name.toLowerCase().startsWith('mdblist.')) {
    return meta.name;
  }

  const canonical = resolveCanonicalTitle(catId, type);
  if (canonical) return canonical;

  if (meta?.name) return meta.name;
  return catId;
}
