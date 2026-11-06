import { deflateSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { watchedEpisodes } from './watched.js';

it('decodes watched bits in season/episode order including season zero', async () => {
  const watched = `tt123:1:2:3:${deflateSync(Buffer.from([5])).toString('base64')}`;
  const videos = [{ id: 'tt123:1:2', season: 1, episode: 2 },
    { id: 'tt123:0:1', season: 0, episode: 1 }, { id: 'tt123:1:1', season: 1, episode: 1 }];
  const result = await watchedEpisodes({ _id: 'tt123', state: { watched } }, {
    fetchImpl: async () => Response.json({ meta: { videos } }),
  });
  expect(result).toEqual(['tt123:0:1', 'tt123:1:2']);
});

it('refuses an unknown watched anchor rather than inventing episodes', async () => {
  const watched = `tt123:1:1:1:${deflateSync(Buffer.from([1])).toString('base64')}`;
  await expect(watchedEpisodes({ _id: 'tt123', state: { watched } }, {
    fetchImpl: async () => Response.json({ meta: { videos: [] } }),
  })).rejects.toThrow('anchor');
});
