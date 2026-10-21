import { describe, it, expect, vi } from 'vitest';
import { createAuthStepMountOptions } from './auth-actions.js';

describe('auth-actions', () => {
  it('creates options that update state on authentication', () => {
    const state = {
      nuvioAuth: {},
      profiles: [],
      selectedProfileId: null,
      selectedProfileName: '',
      unlockStep: vi.fn(),
    };
    const setAuthBadge = vi.fn();
    const saveSession = vi.fn();

    const options = createAuthStepMountOptions({
      state,
      client: {},
      config: { anonKey: 'anon123' },
      authenticateWizard: vi.fn(),
      notify: vi.fn(),
      saveSession,
      setAuthBadge,
      renderProfiles: vi.fn(),
      updateUI: vi.fn(),
      updateNavigationButtons: vi.fn(),
    });

    options.onAuthenticated({
      auth: { accessToken: 'token', userId: 'user1', expiresAt: 123456 },
      profiles: [{ id: 'p1', name: 'Main' }],
      email: 'user@test.com',
    });

    expect(state.nuvioAuth.accessToken).toBe('token');
    expect(state.nuvioAuth.isAuthenticated).toBe(true);
    expect(state.selectedProfileId).toBe('p1');
    expect(state.selectedProfileName).toBe('Main');
    expect(state.unlockStep).toHaveBeenCalledWith(3);
    expect(state.unlockStep).toHaveBeenCalledWith(2);
    expect(setAuthBadge).toHaveBeenCalledWith(true);
    expect(saveSession).toHaveBeenCalled();
  });
});
