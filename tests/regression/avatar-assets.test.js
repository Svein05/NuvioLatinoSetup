import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';

it('every avatar in the bundled landing catalog exists as a local image', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../assets/profile_icons/manifest.json', import.meta.url), 'utf8'));
  const missing = manifest.styles.flatMap(({ style, franchises }) =>
    franchises.flatMap(({ franchise, files }) => files.map(file =>
      `assets/profile_icons/${style}/${franchise}/${file}`)))
    .filter(path => !existsSync(new URL(`../../${path}`, import.meta.url)));
  expect(missing).toEqual([]);
});

it('the bundled catalog includes all supported images from the integrated asset tree', () => {
  const root = new URL('../../assets/profile_icons/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  const paths = manifest.styles.flatMap(({ style, franchises }) =>
    franchises.flatMap(({ franchise, files }) => files.map(file => `${style}/${franchise}/${file}`)));
  const images = readdirSync(root, { recursive: true }).map(path => path.replaceAll('\\', '/'))
    .filter(path => /^[^/]+\/[^/]+\/[^/.][^/]*\.(jpe?g|png|webp|svg)$/i.test(path));
  expect([...paths].sort()).toEqual(images.sort());
  expect(new Set(paths).size).toBe(paths.length);
});
