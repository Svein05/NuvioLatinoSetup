import { describe, it, expect, vi } from 'vitest';
import { extractProfileSettings, renderSettingsSection } from './settings.js';

describe('settings section', () => {
  it('extracts and prioritizes credentials and settings', () => {
    const creds = [{ provider: 'tmdb', credential_json: { api_key: 'cred-tmdb' } }];
    const blob = {
      features: {
        tmdb_settings: { tmdb_enabled: { value: true }, tmdb_api_key: { value: 'blob-tmdb' } },
        mdblist_settings: { mdblist_enabled: { value: false } },
        stream_badge_settings: { badge: 'hdr' },
      },
    };
    const fallbackKeys = { mdblist: 'fallback-mdb' };

    const result = extractProfileSettings({
      blob,
      credentials: creds,
      fallbackKeys,
    });

    expect(result.settings.tmdb_api_key).toBe('cred-tmdb');
    expect(result.settings.mdblist_api_key).toBe('fallback-mdb');
    expect(result.settings.enrichment_enabled).toBe(true);
    expect(result.settings.ratings_enabled).toBe(false);
    expect(result.streamBadges).toEqual({ badge: 'hdr' });
  });

  it('renders settings section and attaches change handlers', () => {
    const state = {
      settings: {
        enrichment_enabled: true,
        ratings_enabled: true,
        tmdb_api_key: 'my-tmdb',
        mdblist_api_key: 'my-mdb',
      },
      originalSettings: {
        enrichment_enabled: true,
        ratings_enabled: true,
        tmdb_api_key: 'my-tmdb',
        mdblist_api_key: 'my-mdb',
      },
    };

    const listeners = {};
    const mockElem = {
      checked: true,
      value: 'my-tmdb',
      addEventListener: (type, fn) => { listeners[type] = fn; },
    };

    const container = {
      innerHTML: '',
      querySelector: vi.fn(() => mockElem),
    };
    const root = { getElementById: vi.fn(() => container) };
    const onDirty = vi.fn();
    const setupPasswordToggles = vi.fn();

    renderSettingsSection(state, { root, onDirty, setupPasswordToggles });

    expect(container.innerHTML).toContain('TMDB API Key');
    expect(setupPasswordToggles).toHaveBeenCalled();

    // Trigger change
    mockElem.value = 'changed-key';
    listeners.input?.();
    expect(onDirty).toHaveBeenCalledWith(true);
  });
});
