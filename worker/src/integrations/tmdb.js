const SOURCES = [
  ['trending/movie/week', 'movie'], ['trending/tv/week', 'tv'],
  ['movie/popular', 'movie'], ['tv/popular', 'tv'],
];

export async function fetchPosterSources(token, fetchImpl = fetch) {
  if (!token) throw new Error('Poster feed credentials unavailable');
  return Promise.all(SOURCES.map(async ([path, mediaType]) => {
    const url = new URL('https://api.themoviedb.org/3/' + path);
    url.searchParams.set('language', 'es-MX');
    if (path === 'movie/popular') url.searchParams.set('region', 'MX');
    const response = await fetchImpl(url.href, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Poster source unavailable');
    const data = await response.json();
    if (!Array.isArray(data?.results) || data.results.length > 20) throw new Error('Invalid poster source');
    return data.results.map(item => ({ ...item, mediaType }));
  }));
}
