import { isPosterItem } from '../../../src/shared/media/poster-feed.js';

function selectPoster(posters) {
  return posters.filter(image => image && ['es', null].includes(image.iso_639_1)
    && image.width >= 342 && image.aspect_ratio > 0.6 && image.aspect_ratio < 0.75)
    .sort((a, b) => Number(b.iso_639_1 === 'es') - Number(a.iso_639_1 === 'es')
      || (b.vote_average || 0) - (a.vote_average || 0)
      || (b.vote_count || 0) - (a.vote_count || 0))[0]?.file_path;
}

async function localizedPoster(item, token, fetchImpl) {
  const url = new URL(`https://api.themoviedb.org/3/${item.mediaType}/${item.id}/images`);
  url.searchParams.set('language', 'es');
  url.searchParams.set('include_image_language', 'es,null');
  const response = await fetchImpl(url.href, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000), redirect: 'manual',
  });
  if (!response.ok) throw new Error('Poster artwork unavailable (HTTP ' + response.status + ')');
  const data = await response.json();
  if (!Array.isArray(data?.posters)) throw new Error('Invalid poster artwork');
  return { ...item, poster_path: selectPoster(data.posters) };
}

export async function localizePosterSources(sources, token, fetchImpl = fetch) {
  const unique = new Map();
  for (const item of sources.flat()) {
    const value = { id: item?.id, mediaType: item?.mediaType,
      title: item?.title || item?.name, posterPath: item?.poster_path };
    if (item?.adult !== true && isPosterItem(value)) unique.set(value.mediaType + ':' + value.id, item);
  }
  // Bound the refresh to 44 provider requests, with at most four image reads in flight.
  const candidates = [...unique.values()].slice(0, 40);
  const localized = [];
  for (let offset = 0; offset < candidates.length; offset += 4) {
    localized.push(...await Promise.all(candidates.slice(offset, offset + 4)
      .map(item => localizedPoster(item, token, fetchImpl))));
  }
  return [localized];
}
