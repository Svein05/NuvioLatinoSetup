import { describe, it, expect, vi } from 'vitest';
import {
  createInitialAccountState,
  loadSession,
  saveSession,
  clearSession,
  updateSaveButtonUI,
  markStateDirty,
} from './account-state.js';

describe('account-state', () => {
  it('initializes clean default state', () => {
    const state = createInitialAccountState();
    expect(state.session).toBeNull();
    expect(state.profiles).toEqual([]);
    expect(state.dirty.settings).toBe(false);
    expect(state.isSaving).toBe(false);
  });

  it('loads, saves and clears session with sessionStore', () => {
    const state = createInitialAccountState();
    const store = {
      read: vi.fn().mockReturnValue({ accessToken: 'token123' }),
      write: vi.fn(),
      clear: vi.fn(),
    };

    const session = loadSession(state, store);
    expect(session.accessToken).toBe('token123');
    expect(state.session.accessToken).toBe('token123');

    saveSession({ accessToken: 'token456' }, state, store);
    expect(store.write).toHaveBeenCalledWith({ accessToken: 'token456' });

    clearSession(state, store);
    expect(state.session).toBeNull();
    expect(store.clear).toHaveBeenCalled();
  });

  it('updates save button UI based on dirty state', () => {
    const btn = { classList: { add: vi.fn(), remove: vi.fn() }, disabled: false };
    const badge = { textContent: '', classList: { add: vi.fn(), remove: vi.fn() } };
    const root = {
      querySelector: vi.fn(sel => {
        if (sel === '#btnAccountSave') return btn;
        if (sel === '#accountSaveCountBadge') return badge;
        return null;
      }),
    };
    const state = createInitialAccountState();

    updateSaveButtonUI(root, state);
    expect(btn.classList.remove).toHaveBeenCalledWith('has-changes');
    expect(badge.classList.add).toHaveBeenCalledWith('hidden');

    state.dirty.settings = true;
    updateSaveButtonUI(root, state);
    expect(btn.classList.add).toHaveBeenCalledWith('has-changes');
    expect(badge.textContent).toBe('1');
    expect(badge.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('marks state dirty and notifies callback', () => {
    const state = createInitialAccountState();
    const callback = vi.fn();

    markStateDirty('avatar', true, state, callback);
    expect(state.dirty.avatar).toBe(true);
    expect(callback).toHaveBeenCalled();
  });
});
