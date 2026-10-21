import { describe, it, expect, vi } from 'vitest';
import { createAccountController } from './account-controller.js';
import { createInitialAccountState } from './account-state.js';

describe('account-controller', () => {
  it('creates controller instance with public methods', () => {
    const controller = createAccountController({ root: {} });
    expect(typeof controller.init).toBe('function');
    expect(typeof controller.selectProfile).toBe('function');
    expect(typeof controller.fetchProfiles).toBe('function');
    expect(typeof controller.handleSave).toBe('function');
    expect(typeof controller.handleUndo).toBe('function');
  });

  it('fetches profiles using client', async () => {
    const client = {
      getProfiles: vi.fn().mockResolvedValue([{ id: 1, name: 'Principal' }]),
    };
    const state = createInitialAccountState();
    state.session = { accessToken: 'token', userId: 'user1' };

    const controller = createAccountController({ root: {}, client, state });
    const profiles = await controller.fetchProfiles();

    expect(client.getProfiles).toHaveBeenCalled();
    expect(profiles.length).toBe(1);
    expect(state.selectedProfileId).toBe(1);
  });

  it('selects profile and resets dirty flags', async () => {
    const root = {
      getElementById: vi.fn(() => ({
        src: '',
        textContent: '',
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        querySelectorAll: vi.fn(() => []),
      })),
      querySelectorAll: vi.fn(() => []),
    };
    const state = createInitialAccountState();
    state.profiles = [{ id: 1, name: 'Principal', avatar_url: 'av1.png' }];
    state.dirty.settings = true;

    const controller = createAccountController({ root, state });
    await controller.selectProfile(1);

    expect(state.selectedProfileId).toBe(1);
    expect(state.selectedAvatarUrl).toBe('av1.png');
    expect(state.dirty.settings).toBe(false);
  });
});
