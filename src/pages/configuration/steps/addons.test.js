import { describe, it, expect, vi } from 'vitest';
import { cleanManifestUrl } from './addons-manifest.js';
import { getAddonFallbackLogo } from './addons-view.js';
import { updateInstallButtonState, commitAioStreamsInstall } from './aiostreams-modal.js';
import { mountAddonsStep } from './addons.js';

describe('Addons Step & AIOStreams Modal', () => {
  it('cleanManifestUrl normalizes protocols and paths', () => {
    expect(cleanManifestUrl('stremio://example.com/manifest.json')).toBe('https://example.com/manifest.json');
    expect(cleanManifestUrl('http://example.com/addon')).toBe('http://example.com/addon/manifest.json');
  });

  it('getAddonFallbackLogo returns logos for known addon names or urls', () => {
    expect(getAddonFallbackLogo('https://torrentio.strem.fun/manifest.json')).toContain('torrentio');
    expect(getAddonFallbackLogo('', 'AIOStreams Latino')).toContain('aiostreams');
    expect(getAddonFallbackLogo('https://unknown.com/manifest.json')).toBeNull();
  });

  it('updateInstallButtonState enables only when valid key exists and no unvalidated keys', () => {
    const btn = { disabled: true, className: '', title: '' };
    const root = {
      querySelector: vi.fn(sel => {
        if (sel === '#btnInstallAioStreams') return btn;
        if (sel === '#inputDebridTorbox') return { value: 'torbox-token' };
        return { value: '' };
      }),
    };

    const draftWithUnvalidated = { validatedKeys: { alldebrid: true } };
    updateInstallButtonState(root, draftWithUnvalidated, false);
    expect(btn.disabled).toBe(true);

    const draftValid = { validatedKeys: { torbox: true } };
    updateInstallButtonState(root, draftValid, false);
    expect(btn.disabled).toBe(false);
  });

  it('commitAioStreamsInstall configures state and invokes callback', () => {
    const state = {
      hasAioStreamsInstance: () => false,
      setAioStreamsConfig: vi.fn(),
    };
    const root = {
      querySelector: vi.fn(sel => {
        if (sel === '#inputDebridTorbox') return { value: 'torbox-token' };
        return { value: '' };
      }),
    };
    const draft = { validatedKeys: { torbox: true }, debrids: { torbox: 'torbox-token' } };
    const onClose = vi.fn();
    const notify = vi.fn();

    commitAioStreamsInstall({ root, draft, state, onClose, notify });
    expect(state.setAioStreamsConfig).toHaveBeenCalledWith({ torbox: 'torbox-token' }, { torbox: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('mountAddonsStep delegates reordering, removal and modal flows', () => {
    const state = {
      profileAddons: [{ name: 'Torrentio', manifest_url: 'https://torrentio.strem.fun/manifest.json' }],
      aiostreams: { debrids: {} },
      hasAioStreamsInstance: () => false,
      moveAddon: vi.fn(),
      removeAddon: vi.fn(),
      hasAddonManifest: () => false,
    };
    const root = {
      querySelector: vi.fn(() => ({
        classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        innerHTML: '',
        value: '',
      })),
      querySelectorAll: vi.fn(() => []),
    };

    const step = mountAddonsStep({
      state,
      actions: { validateDebridKey: vi.fn(), notify: vi.fn(), onUpdate: vi.fn() },
      root,
    });

    step.moveAddon(0, 1);
    expect(state.moveAddon).toHaveBeenCalledWith(0, 1);

    step.removeAddon(0);
    step.dispose();
  });
});
