import { expect, it, vi } from 'vitest';
import { createMediaDetailsResolver } from './media-details.js';
import { mediaIdentity } from './media-identity.js';

it('maps supported identities while preserving external identifier case', () => {
  expect(mediaIdentity({ content_id: 'imdb:tt123:1:2', season: 1 })).toEqual({ imdbId: 'tt123', tmdbId: null, type: 'tv' });
  expect(mediaIdentity({ content_id: 'tmdb:456:1:2' })).toEqual({ imdbId: null, tmdbId: '456', type: 'movie' });
});

it('normalizes localized metadata and reuses an instance-owned cache', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ movie_results: [{ title: 'Título', poster_path: '/poster.jpg' }] }));
  const resolve = createMediaDetailsResolver({ fetchImpl });
  expect(await resolve({ content_id: 'tt123' }, 'synthetic')).toEqual({
    title: 'Título', poster_path: 'https://image.tmdb.org/t/p/w500/poster.jpg', backdrop_path: '',
  });
  await resolve({ content_id: 'tt123' }, 'synthetic');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('language')).toBe('es-MX');
});

it.each(['http', 'network', 'json'])('uses public metadata fallback on a %s read failure and reports the warning', async failure => {
  const fetchImpl = vi.fn().mockImplementationOnce(async () => {
    if (failure === 'network') throw new TypeError('offline');
    return failure === 'http' ? Response.json({}, { status: 503 }) : new Response('invalid');
  }).mockResolvedValueOnce(Response.json({ meta: { name: 'Fallback', poster: 'https://example.invalid/poster' } }));
  const reportWarning = vi.fn();
  const resolve = createMediaDetailsResolver({ fetchImpl, reportWarning });
  expect(await resolve({ content_id: 'tt123' }, 'synthetic')).toMatchObject({ title: 'Fallback' });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(reportWarning).toHaveBeenCalledWith(expect.not.stringContaining('synthetic'));
});

it('retains supplied titles with a deterministic poster if both providers are unavailable', async () => {
  const fetchImpl = vi.fn(async () => Response.json({}, { status: 503 }));
  const resolve = createMediaDetailsResolver({ fetchImpl, reportWarning: vi.fn() });
  expect(await resolve({ content_id: 'tt123', title: 'Original' }, 'synthetic')).toMatchObject({
    title: 'Original', poster_path: 'https://images.metahub.space/poster/medium/tt123/img',
  });
});
