import { expect, it, vi } from 'vitest';
import { createWorker } from '../src/index.js';
import { refreshPosterFeed, normalizePosterSources } from '../src/services/poster-feed.js';

const source = Array.from({ length: 16 }, (_, index) => ({ id: index + 1, title: 'Movie ' + index,
  name: 'Show ' + index, poster_path: '/poster_' + index + '.jpg' }));
const snapshot = () => normalizePosterSources([source.map(item => ({ ...item, mediaType: 'movie' }))]);
const backend = () => ({ POSTER_FEED_KV: { get: vi.fn().mockResolvedValue(snapshot()), put: vi.fn() }, TMDB_READ_ACCESS_TOKEN: 'synthetic-token' });

it('weekly refresh uses ranked movie and TV trends only and stores one localized snapshot', async () => {
  const env = backend();
  const fetchImpl = vi.fn().mockImplementation(async url => {
    if (!url.includes('/images?')) return Response.json({ results: source });
    const id = new URL(url).pathname.split('/')[3];
    const type = new URL(url).pathname.split('/')[2];
    return Response.json({ posters: [{ file_path: `/${type}_${id}.jpg`, iso_639_1: 'es',
      width: 500, aspect_ratio: 0.667 }] });
  });
  await refreshPosterFeed(env, { fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(34);
  expect(env.POSTER_FEED_KV.put).toHaveBeenCalledTimes(1);
  expect(JSON.parse(env.POSTER_FEED_KV.put.mock.calls[0][1]).items).toHaveLength(32);
  const titles = JSON.parse(env.POSTER_FEED_KV.put.mock.calls[0][1]).items;
  expect(titles.slice(0, 4).map(item => item.mediaType + ':' + item.id))
    .toEqual(['movie:1', 'tv:1', 'movie:2', 'tv:2']);
  expect(fetchImpl.mock.calls.slice(0, 2).map(([url]) => new URL(url).pathname))
    .toEqual(['/3/trending/movie/week', '/3/trending/tv/week']);
  for (const [url, options] of fetchImpl.mock.calls) {
    expect(url).toContain('api.themoviedb.org/3/');
    expect(url).toContain(url.includes('/images?') ? 'language=es' : 'language=es-MX');
    expect(url).not.toContain('synthetic-token');
    expect(options.headers.Authorization).toBe('Bearer synthetic-token');
    expect(options.redirect).toBe('manual');
  }
});

it.each([401, 429, 500])('keeps the previous snapshot when a source fails with %s', async status => {
  const env = backend();
  await expect(refreshPosterFeed(env, { fetchImpl: async () => Response.json({}, { status }) })).rejects.toThrow();
  expect(env.POSTER_FEED_KV.put).not.toHaveBeenCalled();
});

it('validates the complete batch before publishing and excludes unsafe or duplicate posters', async () => {
  const env = backend();
  await expect(refreshPosterFeed(env, { fetchImpl: async () => Response.json({ results: [] }) })).rejects.toThrow();
  expect(env.POSTER_FEED_KV.put).not.toHaveBeenCalled();
  const feed = normalizePosterSources([[...source, source[0], { ...source[1], adult: true },
    { id: 999, title: 'Unsafe', poster_path: 'https://unsafe.invalid/image.jpg' }].map(item => ({ ...item, mediaType: 'movie' }))]);
  expect(feed.items).toHaveLength(16);
});

it('many reads and arbitrary query strings never fetch TMDB, and support HEAD and ETag', async () => {
  const env = backend();
  const fetchImpl = vi.fn();
  const worker = createWorker({ fetchImpl });
  const responses = await Promise.all(Array.from({ length: 200 }, (_, index) => worker.fetch(new Request('https://worker.invalid/api/poster-feed?x=' + index), env)));
  expect(responses.every(response => response.status === 200)).toBe(true);
  expect(fetchImpl).not.toHaveBeenCalled();
  const etag = responses[0].headers.get('etag');
  expect(etag).toBeTruthy();
  expect((await worker.fetch(new Request('https://worker.invalid/api/poster-feed', { headers: { 'If-None-Match': 'W/' + etag } }), env)).status).toBe(304);
  expect((await worker.fetch(new Request('https://worker.invalid/api/poster-feed', { headers: { 'If-None-Match': etag } }), env)).status).toBe(304);
  expect(await (await worker.fetch(new Request('https://worker.invalid/api/poster-feed', { method: 'HEAD' }), env)).text()).toBe('');
  expect((await worker.fetch(new Request('https://worker.invalid/api/poster-feed', { method: 'POST' }), env)).status).toBe(405);
});

it('cold or corrupt storage returns a bounded failure without provider calls', async () => {
  const fetchImpl = vi.fn();
  const worker = createWorker({ fetchImpl });
  for (const env of [{}, { POSTER_FEED_KV: { get: async () => ({ items: [null] }) } },
    { POSTER_FEED_KV: { get: async () => { throw new Error('offline'); } } }]) {
    expect((await worker.fetch(new Request('https://worker.invalid/api/poster-feed'), env)).status).toBe(503);
  }
  expect(fetchImpl).not.toHaveBeenCalled();
});
