import { expect, it, vi } from 'vitest';
import { fetchAddonManifestInfo, getAddonConfigureUrl } from './addons-manifest.js';
import { initImageFallbacks } from '../../../shared/ui/image-fallbacks.js';

it('keeps configured instance paths and query parameters when deriving configuration URLs', () => {
  expect(getAddonConfigureUrl({ name: 'AIOMetadata', manifest_url: 'https://addon.invalid/stremio/instance/manifest.json?key=synthetic' }))
    .toBe('https://addon.invalid/stremio/instance/configure?key=synthetic');
  expect(getAddonConfigureUrl({ name: 'Other', configurable: true, url: 'STREMIO://addon.invalid/a/manifest.json' }))
    .toBe('https://addon.invalid/a/configure');
  expect(getAddonConfigureUrl({ url: 'HTTPS://addon.invalid/a/manifest.json' }, { configurable: true }))
    .toBe('https://addon.invalid/a/configure');
});

it('does not offer configuration for unsupported addons or unsafe/non-manifest destinations', () => {
  for (const url of ['javascript:alert(1)', 'ftp://addon.invalid/manifest.json', 'https://addon.invalid/api', '']) {
    expect(getAddonConfigureUrl({ url, configurable: true })).toBeNull();
  }
  expect(getAddonConfigureUrl({ name: 'LAT-ADD', url: 'https://addon.invalid/manifest.json' })).toBeNull();
});

it('retains configurable hints independently of missing or malformed artwork', async () => {
  const request = vi.fn().mockResolvedValue({ name: 'Other', icon: '/icon.png', behaviorHints: { configurationRequired: true } });
  const info = await fetchAddonManifestInfo('https://addon.invalid/a/manifest.json', request);
  expect(info).toMatchObject({ logo: 'https://addon.invalid/icon.png', configurable: true });
  request.mockResolvedValue({ logo: 'https://%', behaviorHints: { configurable: true } });
  expect(await fetchAddonManifestInfo('https://addon.invalid/manifest.json', request))
    .toMatchObject({ logo: null, configurable: true });
});

it('falls back once in the view and removes its error listener', () => {
  const image = { dataset: { imageFallback: 'avatar' }, src: '/broken.webp', complete: true, naturalWidth: 0,
    getAttribute() { return this.src; } };
  const root = { querySelectorAll: () => [image], addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const dispose = initImageFallbacks(root);
  expect(image.src).toBe('/assets/icons/avatar-placeholder.svg');
  const handler = root.addEventListener.mock.calls[0][1];
  handler({ target: image });
  expect(image.src).toBe('/assets/icons/avatar-placeholder.svg');
  image.dataset.imageFallback = 'addon';
  handler({ target: image });
  expect(image.src).toBe('/assets/icons/addon-placeholder.svg');
  dispose();
  expect(root.removeEventListener).toHaveBeenCalledWith('error', handler, true);
});
