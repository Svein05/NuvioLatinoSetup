import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';

it('every avatar in the bundled landing catalog exists as a local image', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../assets/profile_icons/manifest.json', import.meta.url), 'utf8'));
  const missing = manifest.styles.flatMap(({ style, franchises }) =>
    franchises.flatMap(({ franchise, files }) => files.map(file =>
      `assets/profile_icons/${style}/${franchise}/${file}`)))
    .filter(path => !existsSync(new URL(`../../${path}`, import.meta.url)));
  expect(missing).toEqual([]);
});
