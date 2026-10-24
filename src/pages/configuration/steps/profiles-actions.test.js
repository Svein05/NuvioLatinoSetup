import { describe, it, expect, vi } from 'vitest';
import { createProfilesStepActions } from './profiles-actions.js';

describe('profiles-actions', () => {
  it('handles createProfile and updates state and session', async () => {
    const state = {
      nuvioAuth: { apikey: 'key', accessToken: 'token', userId: 'u1' },
      newlyCreatedProfileIds: new Set(),
      profiles: [],
      selectedProfileId: null,
      selectedProfileName: '',
      unlockStep: vi.fn(),
    };
    const client = {
      createProfile: vi.fn().mockResolvedValue({ id: 'p2', name: 'Kid', avatar_url: 'NetflixStyle/Naruto/Naruto.webp' }),
    };
    const config = { apiUrl: 'https://api.test', anonKey: 'anon' };
    const saveSession = vi.fn();
    const updateUI = vi.fn();

    const recordAvatarUsage = vi.fn().mockResolvedValue({ status: 'recorded' });
    const actions = createProfilesStepActions({
      recordAvatarUsage,
      state,
      client,
      config,
      notify: vi.fn(),
      saveSession,
      updateUI,
      avatarCatalog: {},
    });

    const created = await actions.createProfile({ name: 'Kid', avatarUrl: 'NetflixStyle/Naruto/Naruto.webp' });
    expect(created.id).toBe('p2');
    await Promise.resolve();
    expect(recordAvatarUsage).toHaveBeenCalledExactlyOnceWith('NetflixStyle/Naruto/Naruto.webp', { accessToken: 'token' });
    expect(state.selectedProfileId).toBe('p2');
    expect(state.unlockStep).toHaveBeenCalledWith(3);
    expect(saveSession).toHaveBeenCalled();
    expect(updateUI).toHaveBeenCalled();
  });

  it('handles deleteProfile and selects remaining profile', async () => {
    const state = {
      nuvioAuth: { apikey: 'key', accessToken: 'token', userId: 'u1' },
      profiles: [{ id: 'p1', name: 'Main' }, { id: 'p2', name: 'Kid' }],
      selectedProfileId: 'p2',
      selectedProfileName: 'Kid',
      unlockStep: vi.fn(),
    };
    const client = {
      deleteProfile: vi.fn().mockResolvedValue({ success: true, remainingProfiles: [{ id: 'p1', name: 'Main' }] }),
    };
    const config = { apiUrl: 'https://api.test', anonKey: 'anon' };
    const saveSession = vi.fn();
    const updateUI = vi.fn();

    const actions = createProfilesStepActions({
      state,
      client,
      config,
      notify: vi.fn(),
      saveSession,
      updateUI,
      avatarCatalog: {},
    });

    await actions.deleteProfile('p2');
    expect(state.selectedProfileId).toBe('p1');
    expect(state.selectedProfileName).toBe('Main');
    expect(saveSession).toHaveBeenCalled();
    expect(updateUI).toHaveBeenCalled();
  });
});
