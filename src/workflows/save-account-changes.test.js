import { describe, it, expect, vi } from 'vitest';
import { saveAccountChanges } from './save-account-changes.js';
import { saveAccountAvatar } from './save-account-avatar.js';
import { saveAccountSettings } from './save-account-settings.js';
import { saveAccountAioMetadata, applyAioPosterConfig } from './save-account-aiometadata.js';
import { saveAccountAddons } from './save-account-addons.js';

describe('saveAccountAvatar', () => {
  it('updates avatar and records usage', async () => {
    const state = {
      dirty: { avatar: true },
      selectedProfileId: 1,
      selectedAvatarUrl: 'avatars/profile1.png',
      originalAvatarUrl: null,
      profiles: [{ id: 1, avatar_url: 'old.png' }],
      session: { accessToken: 'token', userId: 'user1' },
    };
    const client = { updateProfileAvatar: vi.fn().mockResolvedValue({}) };
    const avatarService = {
      resolvePublicUrl: vi.fn(u => `https://cdn/${u}`),
      recordUsage: vi.fn(),
    };
    const ui = { updateAvatarUI: vi.fn() };

    await saveAccountAvatar({ state, config: {}, client, avatarService, ui });

    expect(client.updateProfileAvatar).toHaveBeenCalled();
    expect(avatarService.recordUsage).toHaveBeenCalledWith('avatars/profile1.png', { accessToken: 'token' });
    expect(state.profiles[0].avatar_url).toBe('https://cdn/avatars/profile1.png');
    expect(state.originalAvatarUrl).toBe('avatars/profile1.png');
    expect(state.dirty.avatar).toBe(false);
    expect(ui.updateAvatarUI).toHaveBeenCalledWith('https://cdn/avatars/profile1.png');
  });
});

describe('saveAccountSettings', () => {
  it('saves settings and provider credentials across platforms', async () => {
    const state = {
      dirty: { settings: true },
      selectedProfileId: 1,
      session: { accessToken: 'token' },
      settings: { enrichment_enabled: true, ratings_enabled: false, tmdb_api_key: 'tmdb-key', mdblist_api_key: 'mdb-key' },
      originalSettings: {},
      _rawStreamBadgeSettings: { badge: 'hdr' },
    };
    const client = {
      pushProfileSettings: vi.fn().mockResolvedValue({}),
      pushProviderCredentials: vi.fn().mockResolvedValue({}),
    };

    await saveAccountSettings({ state, config: {}, client });

    expect(client.pushProfileSettings).toHaveBeenCalledTimes(3);
    expect(client.pushProviderCredentials).toHaveBeenCalledWith(expect.objectContaining({
      credentials: [
        { provider: 'tmdb', credential_json: { api_key: 'tmdb-key' } },
        { provider: 'mdblist', credential_json: { api_key: 'mdb-key' } },
      ],
    }));
    expect(state.dirty.settings).toBe(false);
    expect(state.originalSettings).toEqual(state.settings);
  });
});

describe('saveAccountAioMetadata', () => {
  it('configures poster engines correctly', () => {
    const cfgBetter = {};
    applyAioPosterConfig(cfgBetter, { engine: 'betterposter' });
    expect(cfgBetter.posterRatingProvider).toBe('custom');
    expect(cfgBetter.customPosterUrlPattern).toContain('btttr.cc');

    const cfgPlus = {};
    applyAioPosterConfig(cfgPlus, { engine: 'postersplus', tmdbKey: 'k1', mdblistKey: 'k2' });
    expect(cfgPlus.posterRatingProvider).toBe('custom');
    expect(cfgPlus.customPosterUrlPattern).toContain('postersplus.stremio.ru');

    const cfgCustom = {};
    applyAioPosterConfig(cfgCustom, { engine: 'custom_external', customPosterUrl: 'https://custom.png' });
    expect(cfgCustom.customPosterUrlPattern).toBe('https://custom.png');

    const cfgDef = {};
    applyAioPosterConfig(cfgDef, { engine: 'default' });
    expect(cfgDef.posterRatingProvider).toBe('none');
  });

  it('updates metadata configuration on owner instance', async () => {
    const state = {
      dirty: { aiometadata: true },
      aioUuid: 'uuid-123',
      aioConfig: { config: {} },
      aioPassword: 'pass',
      aioAddon: { url: 'https://instance.com/manifest.json' },
      posterEngine: 'default',
      settings: {},
      originalSettings: {},
    };
    const updateMetadataConfiguration = vi.fn().mockResolvedValue({});
    const resolveOwnerInstanceUrl = vi.fn().mockReturnValue('https://instance.com');
    const ui = { renderAioSection: vi.fn() };

    await saveAccountAioMetadata({
      state,
      updateMetadataConfiguration,
      resolveOwnerInstanceUrl,
      ui,
    });

    expect(updateMetadataConfiguration).toHaveBeenCalledWith('https://instance.com', 'uuid-123', expect.any(Object));
    expect(state.dirty.aiometadata).toBe(false);
    expect(ui.renderAioSection).toHaveBeenCalled();
  });
});

describe('saveAccountAddons', () => {
  it('deletes removed addons, installs new ones and updates order', async () => {
    const state = {
      dirty: { addons: true },
      selectedProfileId: 1,
      session: { accessToken: 'token', userId: 'user1' },
      originalInstalledAddons: [{ id: 'old-1' }, { id: 'kept-1', name: 'Name 1' }],
      installedAddons: [
        { id: 'kept-1', name: 'Updated Name' },
        { name: 'New Addon', manifest_url: 'https://addon.com/manifest.json' },
      ],
      overviewData: { addonsCount: 0 },
    };
    const client = {
      deleteAddon: vi.fn().mockResolvedValue({}),
      updateAddon: vi.fn().mockResolvedValue({}),
      installAddon: vi.fn().mockResolvedValue({ addonId: 'new-id' }),
      syncAddonsOrder: vi.fn().mockResolvedValue({}),
      listAddons: vi.fn().mockResolvedValue([{ id: 'kept-1' }, { id: 'new-id' }]),
    };
    const ui = { renderAddonsSection: vi.fn() };

    await saveAccountAddons({ state, config: {}, client, ui });

    expect(client.deleteAddon).toHaveBeenCalledWith(expect.objectContaining({ addonId: 'old-1' }));
    expect(client.updateAddon).toHaveBeenCalledWith(expect.objectContaining({ addonId: 'kept-1', name: 'Updated Name' }));
    expect(client.installAddon).toHaveBeenCalled();
    expect(client.syncAddonsOrder).toHaveBeenCalled();
    expect(state.dirty.addons).toBe(false);
    expect(state.installedAddons.length).toBe(2);
    expect(ui.renderAddonsSection).toHaveBeenCalled();
  });
});

describe('saveAccountChanges coordinator', () => {
  it('notifies when no changes are pending', async () => {
    const state = { dirty: { avatar: false } };
    const ui = { notify: vi.fn() };

    await saveAccountChanges({ state, ui });
    expect(ui.notify).toHaveBeenCalledWith('No hay cambios pendientes por guardar.', 'info');
  });
});
