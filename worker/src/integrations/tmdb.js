const SOURCES = [
  ['trending/movie/week', 'movie'], ['trending/tv/week', 'tv'],
];

export async function fetchPosterSources(token, fetchImpl = fetch) {
  if (!token) throw new Error('Poster feed credentials unavailable');
  const sources = await Promise.all(SOURCES.map(async ([path, mediaType]) => {
    const url = new URL('https://api.themoviedb.org/3/' + path);
    url.searchParams.set('language', 'es-MX');
    const response = await fetchImpl(url.href, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000), redirect: 'manual',
    });
    if (!response.ok) throw new Error('Poster source unavailable (HTTP ' + response.status + ')');
    const data = await response.json();
    if (!Array.isArray(data?.results) || data.results.length > 20) throw new Error('Invalid poster source');
    return data.results.map(item => ({ ...item, mediaType }));
  }));
  // Alternate equal ranks so both movies and series appear near the front.
  return [Array.from({ length: Math.max(...sources.map(items => items.length)) }, (_, rank) =>
    sources.flatMap(items => items[rank] ? [items[rank]] : [])).flat()];
}
