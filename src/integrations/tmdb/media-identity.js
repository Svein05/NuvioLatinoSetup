/** Map Nuvio's supported content identifiers to metadata provider identities. */
export function mediaIdentity(item) {
  const raw = String(item.content_id || item.video_id || item.item_id || item.media_id || '').trim();
  let imdbId = item.imdb_id || null;
  let tmdbId = item.tmdb_id || null;
  if (raw.startsWith('tt')) imdbId = raw.split(':')[0];
  else if (raw.startsWith('tmdb:')) tmdbId = raw.slice(5).split(':')[0];
  else if (/^\d+$/.test(raw)) tmdbId = raw;
  else if (raw.includes(':')) {
    const [provider, identifier] = raw.split(':');
    if (provider === 'imdb' && identifier?.startsWith('tt')) imdbId = identifier;
  }
  const mediaType = String(item.content_type || item.type || item.media_type || '').toLowerCase();
  const type = ['series', 'tv', 'show'].includes(mediaType) || item.season != null ? 'tv' : 'movie';
  return { imdbId, tmdbId, type };
}
