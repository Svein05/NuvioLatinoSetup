import { describe, it, expect, vi } from 'vitest';
import { createInitialAccountState } from './account-state.js';
import {
  pushAddonsHistory,
  canAccountUndo,
  updateUndoButtonUI,
  undoAddonsChange,
  performAccountUndo,
} from './account-undo.js';

describe('account-undo', () => {
  it('manages addons history stack correctly', () => {
    const state = createInitialAccountState();
    state.installedAddons = [{ id: 'addon1' }];

    pushAddonsHistory(state);
    expect(state.addonHistory.length).toBe(1);
    expect(state.addonHistory[0]).toEqual([{ id: 'addon1' }]);

    for (let i = 0; i < 35; i++) {
      state.installedAddons = [{ id: `addon-${i}` }];
      pushAddonsHistory(state);
    }
    expect(state.addonHistory.length).toBe(30);
  });

  it('determines if undo is possible for active sections', () => {
    const state = createInitialAccountState();

    state.activeSection = 'avatars';
    expect(canAccountUndo(state)).toBe(false);
    state.dirty.avatar = true;
    expect(canAccountUndo(state)).toBe(true);

    state.activeSection = 'settings';
    expect(canAccountUndo(state)).toBe(false);
    state.dirty.settings = true;
    expect(canAccountUndo(state)).toBe(true);

    state.activeSection = 'addons';
    expect(canAccountUndo(state)).toBe(false);
    state.addonHistory = [[{ id: '1' }]];
    expect(canAccountUndo(state)).toBe(true);

    state.activeSection = 'aiometadata';
    expect(canAccountUndo(state)).toBe(false);
    state.dirty.aiometadata = true;
    expect(canAccountUndo(state)).toBe(true);
  });

  it('updates undo button UI state', () => {
    const btn = { classList: { add: vi.fn(), remove: vi.fn() }, disabled: true };
    const root = { querySelector: vi.fn().mockReturnValue(btn) };
    const state = createInitialAccountState();

    updateUndoButtonUI(root, state);
    expect(btn.disabled).toBe(true);
    expect(btn.classList.add).toHaveBeenCalledWith('opacity-40', 'cursor-not-allowed', 'pointer-events-none');

    state.dirty.avatar = true;
    updateUndoButtonUI(root, state);
    expect(btn.disabled).toBe(false);
    expect(btn.classList.remove).toHaveBeenCalledWith('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
    expect(btn.classList.add).toHaveBeenCalledWith('opacity-100', 'cursor-pointer');
  });

  it('undoes addons change from history stack', () => {
    const state = createInitialAccountState();
    state.originalInstalledAddons = [{ id: 'orig' }];
    state.installedAddons = [{ id: 'changed' }];
    state.addonHistory = [[{ id: 'orig' }]];

    const renderAddons = vi.fn();
    const updateUI = vi.fn();
    const notify = vi.fn();

    undoAddonsChange(state, { renderAddons, updateUI, notify });
    expect(state.installedAddons).toEqual([{ id: 'orig' }]);
    expect(state.dirty.addons).toBe(false);
    expect(renderAddons).toHaveBeenCalled();
    expect(updateUI).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Cambio deshecho.', 'info');
  });

  it('performs undo for avatar section', () => {
    const state = createInitialAccountState();
    state.activeSection = 'avatars';
    state.originalAvatarUrl = 'https://img.com/orig.png';
    state.selectedAvatarUrl = 'https://img.com/new.png';
    state.dirty.avatar = true;

    const updateAvatarUI = vi.fn();
    const updateUI = vi.fn();
    const notify = vi.fn();

    performAccountUndo(state, { updateAvatarUI, updateUI, notify });
    expect(state.selectedAvatarUrl).toBe('https://img.com/orig.png');
    expect(state.dirty.avatar).toBe(false);
    expect(updateAvatarUI).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Avatar revertido al original.', 'info');
  });

  it('performs undo for settings section', () => {
    const state = createInitialAccountState();
    state.activeSection = 'settings';
    state.originalSettings = { enrichment_enabled: false };
    state.settings = { enrichment_enabled: true };
    state.dirty.settings = true;

    const renderSettings = vi.fn();
    const updateUI = vi.fn();
    const notify = vi.fn();

    performAccountUndo(state, { renderSettings, updateUI, notify });
    expect(state.settings).toEqual({ enrichment_enabled: false });
    expect(state.dirty.settings).toBe(false);
    expect(renderSettings).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Ajustes revertidos a los valores por defecto.', 'info');
  });

  it('performs undo for aiometadata section', () => {
    const state = createInitialAccountState();
    state.activeSection = 'aiometadata';
    state.originalAioConfig = { key: 'val' };
    state.originalPosterEngine = 'custom';
    state.originalCustomPosterUrl = 'https://poster.com';
    state.aioConfig = { key: 'new' };
    state.posterEngine = 'default';
    state.customPosterUrl = '';
    state.dirty.aiometadata = true;

    const renderAio = vi.fn();
    const updateUI = vi.fn();
    const notify = vi.fn();

    performAccountUndo(state, { renderAio, updateUI, notify });
    expect(state.aioConfig).toEqual({ key: 'val' });
    expect(state.posterEngine).toBe('custom');
    expect(state.customPosterUrl).toBe('https://poster.com');
    expect(state.dirty.aiometadata).toBe(false);
    expect(renderAio).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Configuración de AIOMetadata restaurada.', 'info');
  });
});
