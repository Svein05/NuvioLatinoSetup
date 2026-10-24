import { expect, it, vi } from 'vitest';
import { localizePosterSources } from '../src/integrations/tmdb-artwork.js';

const item = { id: 1, mediaType: 'movie', title: 'Película', poster_path: '/original.jpg' };
const poster = (language, path, rating = 5) => ({ iso_639_1: language, file_path: path,
  vote_average: rating, width: 500, aspect_ratio: 0.667 });

it('prefers Spanish artwork over higher-rated English and neutral images', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ posters: [poster('en', '/english.jpg', 10),
    poster(null, '/neutral.jpg', 9), poster('es', '/spanish.jpg')] }));
  const [[result]] = await localizePosterSources([[item, item]], 'synthetic', fetchImpl);
  expect(result.poster_path).toBe('/spanish.jpg');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl.mock.calls[0][0]).toContain('include_image_language=es%2Cnull');
});

it('uses neutral artwork when Spanish is absent and omits foreign-only artwork', async () => {
  const [[neutral]] = await localizePosterSources([[item]], 'synthetic', async () =>
    Response.json({ posters: [poster('en', '/english.jpg'), poster(null, '/neutral.jpg')] }));
  expect(neutral.poster_path).toBe('/neutral.jpg');
  const [[foreign]] = await localizePosterSources([[item]], 'synthetic', async () =>
    Response.json({ posters: [poster('en', '/english.jpg')] }));
  expect(foreign.poster_path).toBeUndefined();
});

it('bounds artwork lookups to forty unique candidates and four concurrent reads', async () => {
  let active = 0;
  let peak = 0;
  const fetchImpl = vi.fn(async () => {
    peak = Math.max(peak, ++active);
    await Promise.resolve();
    active--;
    return Response.json({ posters: [poster('es', '/spanish.jpg')] });
  });
  await localizePosterSources([Array.from({ length: 80 }, (_, id) => ({ ...item, id: id + 1 }))], 'synthetic', fetchImpl);
  expect(fetchImpl).toHaveBeenCalledTimes(40);
  expect(peak).toBeLessThanOrEqual(4);
});

it('rejects failed artwork reads rather than publishing a partial refresh', async () => {
  await expect(localizePosterSources([[item]], 'synthetic', async () =>
    Response.json({}, { status: 429 }))).rejects.toThrow('Poster artwork unavailable');
});
