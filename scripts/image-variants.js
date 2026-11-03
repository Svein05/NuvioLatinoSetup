import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const raster = /\.(png|jpe?g|webp|avif)$/i;
const folders = ['profile_icons', 'collections', 'preview', 'logo'];

function configuration(source) {
  if (source.includes('/badges/')) return { heights: [16, 32, 48], lossless: true };
  if (source.includes('hero-posters-backdrop')) return { widths: [480, 960, 1440, 1920], quality: 72 };
  if (source.includes('/profile_icons/')) return { widths: [64, 128, 256, 512] };
  return { widths: [160, 320, 640, 960] };
}

async function variants(repository, directory, source) {
  const file = path.join(repository, source);
  const input = readFileSync(file);
  const options = configuration(source);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.pages > 1) return null;
  const rotated = metadata.orientation >= 5;
  const sourceWidth = rotated ? metadata.height : metadata.width;
  const sourceHeight = rotated ? metadata.width : metadata.height;
  const hash = createHash('sha256').update(input).update(JSON.stringify(options) + ':webp82-v1').digest('hex').slice(0, 20);
  const widths = options.widths || options.heights.map(height => Math.round(height * sourceWidth / sourceHeight));
  const sizes = [...new Set(widths.map(width => Math.min(width, sourceWidth)))];
  const outputs = [];
  for (const width of sizes) {
    const name = `${hash}-${width}.webp`;
    const target = path.join(directory, name);
    if (!existsSync(target)) {
      const temporary = path.join(directory, `${name}.${randomUUID()}.tmp`);
      try {
        await sharp(input).rotate().resize({ width, withoutEnlargement: true })
          .webp({ quality: options.quality ?? 82, lossless: options.lossless || false }).toFile(temporary);
        if (!existsSync(target)) renameSync(temporary, target);
      } finally { rmSync(temporary, { force: true }); }
    }
    outputs.push({ width, url: `/assets/optimized/${name}` });
  }
  const blob = createHash('sha1').update(`blob ${input.length}\0`).update(input).digest('hex');
  return { width: sourceWidth, height: sourceHeight, blob, variants: outputs };
}

/** Derived files never replace source artwork or canonical profile URLs. */
export async function generateImageVariants(repository) {
  const directory = path.join(repository, '.local/cache/optimized-images');
  mkdirSync(directory, { recursive: true });
  const files = folders.flatMap(folder => {
    const root = path.join(repository, 'assets', folder);
    return readdirSync(root, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile() && raster.test(entry.name))
      .map(entry => path.relative(repository, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'));
  }).sort();
  const images = {};
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < files.length) {
      const source = files[cursor++];
      try {
        const result = await variants(repository, directory, source);
        if (result) images['/' + source] = result;
      } catch (error) {
        console.warn(`Image variants unavailable for ${source}: ${error.message}`);
      }
    }
  }));
  return { directory, images };
}
