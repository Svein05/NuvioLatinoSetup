import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchPosterSources } from '../worker/src/integrations/tmdb.js';
import { localizePosterSources } from '../worker/src/integrations/tmdb-artwork.js';
import { normalizePosterSources } from '../worker/src/services/poster-feed.js';

// Operator-only: this command calls TMDB; the public feed route never does.
const target = path.resolve('.local/poster-feed.json');
const sources = await fetchPosterSources(process.env.TMDB_READ_ACCESS_TOKEN);
const localized = await localizePosterSources(sources, process.env.TMDB_READ_ACCESS_TOKEN);
const feed = normalizePosterSources(localized);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(feed, null, 2) + '\n', { flag: 'wx' });
console.log('Poster snapshot generated: ' + feed.items.length + ' titles. Existing files are never overwritten.');
