import { describe, expect, it } from 'vitest';
import { isAioMetadataAddon, isAioStreamsAddon, isSameManifest } from '../index.js';

describe('manifest identity', () => {
  it('normalizes hostnames while preserving case-sensitive paths and tokens', () => {
    expect(isSameManifest('https://ADDON.test/AbCd/manifest.json', 'https://addon.test/AbCd/manifest.json')).toBe(true);
    expect(isSameManifest('https://addon.test/AbCd/manifest.json', 'https://addon.test/abcd/manifest.json')).toBe(false);
    expect(isSameManifest('https://addon.test/manifest.json?key=A', 'https://addon.test/manifest.json?key=a')).toBe(false);
  });

  it('does not identify empty URLs as an installed manifest', () => {
    expect(isSameManifest('', '')).toBe(false);
  });
});

describe('addon classification', () => {
  const instances = ['https://metadata.test'];

  it('recognizes metadata by its known host or explicit name', () => {
    expect(isAioMetadataAddon({ url: 'https://metadata.test/stremio/id/manifest.json' }, instances)).toBe(true);
    expect(isAioMetadataAddon({ name: 'AIOMetadata Latino' }, instances)).toBe(true);
  });

  it('does not trust a host found in another URL query or hostname suffix', () => {
    expect(isAioMetadataAddon({ url: 'https://other.test/?target=metadata.test' }, instances)).toBe(false);
    expect(isAioMetadataAddon({ url: 'https://metadata.test.other.test/manifest.json' }, instances)).toBe(false);
  });

  it('keeps streaming addons out of metadata classification', () => {
    const addon = { name: 'AIOStreams', url: 'https://metadata.test/manifest.json' };
    expect(isAioStreamsAddon(addon)).toBe(true);
    expect(isAioMetadataAddon(addon, instances)).toBe(false);
  });
});
