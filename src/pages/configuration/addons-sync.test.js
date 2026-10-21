import { describe, it, expect, vi } from 'vitest';
import { syncProfileAddonsIfNeeded } from './addons-sync.js';

describe('addons-sync', () => {
  it('loads addons and updates state if not in manual mode and not yet loaded', async () => {
    const state = {
      isManualMode: false,
      selectedProfileId: 'p1',
      hasLoadedAddonsForProfile: null,
      nuvioAuth: { apikey: 'k', accessToken: 't', userId: 'u' },
      setProfileAddons: vi.fn(),
    };
    const client = {
      listAddons: vi.fn().mockResolvedValue([{ name: 'addon1' }]),
    };
    const container = { innerHTML: '' };

    await syncProfileAddonsIfNeeded({
      state,
      client,
      config: { apiUrl: 'https://api.test', anonKey: 'anon' },
      container,
    });

    expect(client.listAddons).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p1' }));
    expect(state.setProfileAddons).toHaveBeenCalledWith([{ name: 'addon1' }], 'p1');
    expect(container.innerHTML).toContain('fa-spinner');
  });

  it('skips fetching if manual mode or already loaded', async () => {
    const state = {
      isManualMode: true,
      selectedProfileId: 'p1',
      hasLoadedAddonsForProfile: 'p1',
      setProfileAddons: vi.fn(),
    };
    const client = { listAddons: vi.fn() };

    await syncProfileAddonsIfNeeded({ state, client, config: {}, container: null });
    expect(client.listAddons).not.toHaveBeenCalled();
  });
});
