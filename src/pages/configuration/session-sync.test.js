import { describe, it, expect, vi } from 'vitest';
import { saveWizardSession, restoreWizardSession, setAuthBadgeUI } from './session-sync.js';

describe('session-sync', () => {
  describe('saveWizardSession', () => {
    it('does not write to store if not authenticated', () => {
      const state = { nuvioAuth: { isAuthenticated: false } };
      const store = { write: vi.fn() };
      saveWizardSession(state, store);
      expect(store.write).not.toHaveBeenCalled();
    });

    it('writes wizard state to store when authenticated', () => {
      const state = {
        nuvioAuth: { isAuthenticated: true, accessToken: 'token123' },
        profiles: [{ id: 'p1', name: 'Profile 1' }],
        selectedProfileId: 'p1',
        selectedProfileName: 'Profile 1',
        newlyCreatedProfileIds: new Set(['p1']),
        currentStep: 3,
        maxUnlockedStep: 4,
      };
      const store = { write: vi.fn() };
      saveWizardSession(state, store);
      expect(store.write).toHaveBeenCalledWith(expect.objectContaining({
        selectedProfileId: 'p1',
        newlyCreatedProfileIds: ['p1'],
        currentStep: 3,
      }));
    });
  });

  describe('restoreWizardSession', () => {
    it('restores state from store and triggers callbacks', () => {
      const state = {
        nuvioAuth: {},
        profiles: [],
        selectedProfileId: null,
        selectedProfileName: '',
        newlyCreatedProfileIds: new Set(),
        maxUnlockedStep: 1,
        currentStep: 1,
        unlockStep: vi.fn(),
      };
      const store = {
        read: vi.fn().mockReturnValue({
          auth: { isAuthenticated: true, accessToken: 'tok' },
          profiles: [{ id: 'p1', name: 'Default' }],
          selectedProfileId: 'p1',
          selectedProfileName: 'Default',
          newlyCreatedProfileIds: ['p1'],
          maxUnlockedStep: 3,
          currentStep: 2,
        }),
      };
      const setAuthBadge = vi.fn();
      const updateProfileWarning = vi.fn();

      restoreWizardSession(state, store, { setAuthBadge, updateProfileWarning });

      expect(state.nuvioAuth.isAuthenticated).toBe(true);
      expect(state.selectedProfileId).toBe('p1');
      expect(state.currentStep).toBe(2);
      expect(setAuthBadge).toHaveBeenCalledWith(true);
      expect(updateProfileWarning).toHaveBeenCalledWith('p1', 'Default');
    });
  });

  describe('setAuthBadgeUI', () => {
    it('updates badge DOM elements for connected and disconnected states', () => {
      const badge = { className: '', innerHTML: '' };
      const root = { querySelector: vi.fn().mockReturnValue(badge) };

      setAuthBadgeUI(root, true);
      expect(badge.className).toContain('emerald');
      expect(badge.innerHTML).toContain('Conectado');

      setAuthBadgeUI(root, false);
      expect(badge.className).toContain('slate');
      expect(badge.innerHTML).toContain('No autenticado');
    });
  });
});
