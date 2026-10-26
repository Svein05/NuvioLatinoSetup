import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { registryFromPaths } from '../src/features/avatars/model/registry.js';

const root = new URL('../assets/profile_icons/', import.meta.url);

export function generateAvatarManifest(updatedAt) {
  const paths = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => `assets/profile_icons/${resolve(entry.parentPath, entry.name)
      .slice(fileURLToPath(root).length).replaceAll('\\', '/')}`)
    .sort();
  const styles = new Map();
  for (const { style, franchise, files, isDirect } of registryFromPaths(paths)) {
    if (isDirect) throw new Error(`Bundled catalog requires a franchise directory: ${style}`);
    if (!styles.has(style)) styles.set(style, { style, franchises: [] });
    styles.get(style).franchises.push({ franchise, files });
  }
  return { updatedAt, styles: [...styles.values()] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { releaseDate } = JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8'));
  const manifest = generateAvatarManifest(releaseDate);
  writeFileSync(new URL('manifest.json', root), `${JSON.stringify(manifest, null, 2)}\n`);
}
