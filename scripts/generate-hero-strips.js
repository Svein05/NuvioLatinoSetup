import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { usablePosterFeed } from '../src/shared/media/poster-feed.js';

const endpoint = 'https://nuvio-proxy.elias-manriquez-2005.workers.dev/api/poster-feed';
const output = new URL('../public/hero-strips/', import.meta.url);
const inputFile = process.argv[2];
const feed = inputFile ? JSON.parse(await readFile(inputFile, 'utf8')) : await readJson(endpoint);
if (!usablePosterFeed(feed) || feed.items.length < 16) throw new Error('A fresh feed with at least 16 unique posters is required.');

async function readJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
  return response.json();
}

async function download(item) {
  const response = await fetch('https://image.tmdb.org/t/p/w500' + item.posterPath, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Poster request failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function compose(posters, width) {
  const height = Math.round(width * 1.5);
  const tiles = await Promise.all(posters.map(async (poster, index) => ({
    input: await sharp(poster).resize(width, height, { fit: 'cover' }).webp().toBuffer(),
    left: index * width,
    top: 0,
  })));
  return sharp({ create: { width: width * posters.length, height, channels: 3, background: '#08090c' } })
    .composite(tiles).webp({ quality: 76 }).toBuffer();
}

const artwork = await Promise.all(feed.items.slice(0, 16).map(download));
const strips = await Promise.all([0, 1].flatMap(row => {
  const posters = artwork.slice(row * 8, row * 8 + 8);
  return [
    ['mobile', compose(posters.slice(0, 4), 342)],
    ['desktop', compose(posters, 500)],
  ].map(async ([size, pending]) => [`row-${row + 1}-${size}.webp`, await pending]);
}));
await mkdir(output, { recursive: true });
for (const [name, bytes] of strips) {
  await writeFile(new URL(name, output), bytes);
  console.log(name, Math.round(bytes.length / 1024) + ' KiB');
}
console.log('Feed:', feed.generatedAt, 'Output:', fileURLToPath(output));
