import { describe, it, expect, vi } from 'vitest';
import {
  isDuplicateManifestUrl,
  normalizeManifestUrl,
  moveAddon,
  renderAddonsSection,
} from './addons.js';

describe('addons section', () => {
  it('normalizes manifest URLs properly', () => {
    expect(normalizeManifestUrl('stremio://addon.com/manifest.json')).toBe('https://addon.com/manifest.json');
    expect(normalizeManifestUrl('http://addon.com/manifest.json')).toBe('http://addon.com/manifest.json');
    expect(normalizeManifestUrl('addon.com/manifest.json')).toBe('https://addon.com/manifest.json');
  });

  it('detects duplicate manifest URLs', () => {
    const installed = [
      { id: '1', manifest_url: 'https://addon.com/manifest.json' },
      { id: '2', manifest_url: 'https://other.com/manifest.json' },
    ];
    expect(isDuplicateManifestUrl(installed, 'stremio://addon.com/manifest.json')).toBe(true);
    expect(isDuplicateManifestUrl(installed, 'https://new.com/manifest.json')).toBe(false);
    expect(isDuplicateManifestUrl(installed, 'https://addon.com/manifest.json', 0)).toBe(false);
  });

  it('moves addon up and down and notifies callbacks', () => {
    const state = {
      installedAddons: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    };
    const pushHistory = vi.fn();
    const onDirty = vi.fn();
    const renderAddons = vi.fn();

    moveAddon({ state, index: 1, direction: -1, pushHistory, onDirty, renderAddons });
    expect(state.installedAddons.map(x => x.id)).toEqual(['b', 'a', 'c']);
    expect(pushHistory).toHaveBeenCalled();
    expect(onDirty).toHaveBeenCalledWith('addons', true);
    expect(renderAddons).toHaveBeenCalled();
  });

  it('renders addons list into container', () => {
    const container = { innerHTML: '', querySelectorAll: vi.fn(() => []) };
    const countBadge = { textContent: '' };
    const root = {
      getElementById: vi.fn(id => {
        if (id === 'accountAddonsListContainer') return container;
        if (id === 'accountAddonsCountLabel') return countBadge;
        return null;
      }),
    };
    const state = {
      installedAddons: [
        { name: 'Cinemeta', manifest_url: 'https://v3-cinemeta.strem.io/manifest.json', enabled: true },
      ],
    };

    renderAddonsSection(state, { root });
    expect(countBadge.textContent).toBe('1 addons instalados');
    expect(container.innerHTML).toContain('Cinemeta');
    expect(container.innerHTML).toContain('https://v3-cinemeta.strem.io/manifest.json');
  });
});
