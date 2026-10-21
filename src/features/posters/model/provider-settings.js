function postersPlusPattern({ tmdb, mdblist }) {
  const tmdbEncoded = encodeURIComponent((tmdb || '').trim());
  const mdblistEncoded = encodeURIComponent((mdblist || '').trim());
  return `https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&primary_client=stremio_tv_nuvio&tmdb_key=${tmdbEncoded}&mdblist_key=${mdblistEncoded}&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0`;
}

export function posterProviderSettings({ engine = 'default', customPosterUrl = '', tmdb, mdblist }) {
  if (engine === 'default') return { posterRatingProvider: 'none', customPosterUrlPattern: '',
    enableRatingPostersForLibrary: false, usePosterProxy: false };
  if (!['betterposter', 'postersplus'].includes(engine)) return null;
  const pattern = engine === 'betterposter'
    ? 'https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM'
    : postersPlusPattern({ tmdb, mdblist });
  return { posterRatingProvider: 'custom', customPosterUrlPattern: customPosterUrl.trim() || pattern,
    enableRatingPostersForLibrary: true, usePosterProxy: true };
}
