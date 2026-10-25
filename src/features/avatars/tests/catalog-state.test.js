import { expect, it } from 'vitest';
import { createAvatarCatalogStore } from '../index.js';

const root = 'assets/profile_icons';
const registry = [{ style: 'NetflixStyle', franchise: 'Series A', files: ['Hero.webp', 'Hero2.webp'] },
  { style: 'NetflixStyle', franchise: 'Series B', files: ['Hero.webp'] }];

function fixture() {
  const store = createAvatarCatalogStore({ relativePrefix: '../' });
  store.accept(registry, 'a'.repeat(40));
  return store;
}

it('protects the owned registry and avatars from consumer mutation', () => {
  const store = fixture();
  store.avatars()[0].character = 'changed';
  store.registry()[0].files.push('extra.webp');
  expect(store.avatars()[0].character).not.toBe('changed');
  expect(store.registry()).toEqual(registry);
});

it('renames only the acknowledged full path, recomputes variations and applies its new preview', () => {
  const store = fixture();
  const result = store.patch({ renamedFiles: [{ oldPath: `${root}/NetflixStyle/Series B/Hero.webp`,
    newPath: `${root}/NetflixStyle/Series B/NewHero.webp`, newFilename: 'NewHero.webp', oldFilename: 'Hero.webp', newBase64: 'YWJj' }] });
  expect(result.find(item => item.franchise === 'Series A' && item.fileName === 'Hero.webp').isVariation).toBe(true);
  expect(result.find(item => item.franchise === 'Series B')).toMatchObject({ fileName: 'NewHero.webp', character: 'New Hero', path: 'data:image/webp;base64,YWJj' });
  expect(store.commitSha()).toBeNull();
});

it('deletes by full path and recalculates the remaining single variation', () => {
  const store = fixture();
  store.patch({ deletedFiles: [{ path: `${root}/NetflixStyle/Series A/Hero2.webp` }] });
  expect(store.avatars().find(item => item.franchise === 'Series A')).toMatchObject({ character: 'Hero', isVariation: false, variationNumber: null });
  expect(store.avatars().find(item => item.franchise === 'Series B').fileName).toBe('Hero.webp');
});

it('replaces the intended image and preserves previews across subsequent publications', () => {
  const store = fixture();
  store.patch({ replacedFiles: [{ path: `${root}/NetflixStyle/Series B/Hero.webp`, filename: 'Hero.webp', base64: 'YWJj' }] });
  store.patch({ addedFiles: [{ path: `${root}/IconsStyle/New.webp`, filename: 'New.webp', base64: 'ZGVm' }] });
  expect(store.avatars().find(item => item.franchise === 'Series B').path).toBe('data:image/webp;base64,YWJj');
  expect(store.avatars().find(item => item.style === 'IconsStyle').path).toBe('data:image/webp;base64,ZGVm');
  expect(store.avatars().find(item => item.franchise === 'Series A').path).toContain('../assets/');
});

it('does not apply a filename-only rename to a different franchise', () => {
  const store = fixture();
  store.patch({ renamedFiles: [{ oldPath: `${root}/Missing/Hero.webp`, newPath: `${root}/Missing/New.webp`, oldFilename: 'Hero.webp' }] });
  expect(store.avatars()).toHaveLength(3);
  expect(store.avatars().some(item => item.fileName === 'New.webp')).toBe(false);
});

it('rejects an invalid operation atomically without erasing the current catalog', () => {
  const store = fixture();
  const before = store.avatars();
  expect(() => store.patch({ deletedFiles: [`${root}/NetflixStyle/Series B/Hero.webp`], addedFiles: [{ path: '../outside.webp' }] })).toThrow();
  expect(store.avatars()).toEqual(before);
});

it('publishing advances the revision so a previous network load cannot overwrite it', () => {
  const store = fixture();
  const revision = store.begin();
  store.patch({ addedFiles: [{ path: `${root}/IconsStyle/New.webp` }] });
  expect(store.revision()).toBeGreaterThan(revision);
});
