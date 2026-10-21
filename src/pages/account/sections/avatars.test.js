import { describe, it, expect, vi } from 'vitest';
import {
  areAvatarUrlsEqual,
  updateAvatarComparisonUI,
  setNewSelectedAvatar,
  formatUserCount,
  renderModalFranchisesList,
  renderAvatarStylePills,
  renderAvatarsCatalog,
} from './avatars.js';

describe('avatars section', () => {
  it('correctly compares avatar URLs ignoring query params', () => {
    expect(areAvatarUrlsEqual('avatar.png?v=1', 'avatar.png?v=2')).toBe(true);
    expect(areAvatarUrlsEqual('avatar1.png', 'avatar2.png')).toBe(false);
    expect(areAvatarUrlsEqual(null, null)).toBe(true);
    expect(areAvatarUrlsEqual(null, 'avatar.png')).toBe(false);
  });

  it('updates avatar comparison UI when changed', () => {
    const origPreview = { src: '' };
    const currentPreview = { src: '' };
    const arrow = { classList: { add: vi.fn(), remove: vi.fn() } };
    const newWrap = { classList: { add: vi.fn(), remove: vi.fn() } };
    const root = {
      getElementById: vi.fn(id => {
        if (id === 'avatarOriginalPreview') return origPreview;
        if (id === 'avatarCurrentPreview') return currentPreview;
        if (id === 'avatarTransitionArrow') return arrow;
        if (id === 'avatarNewWrap') return newWrap;
        return null;
      }),
    };
    const state = {
      originalAvatarUrl: 'orig.png',
      selectedAvatarUrl: 'new.png',
    };

    updateAvatarComparisonUI(root, state);
    expect(origPreview.src).toBe('orig.png');
    expect(currentPreview.src).toBe('new.png');
    expect(arrow.classList.remove).toHaveBeenCalledWith('hidden');
    expect(arrow.classList.add).toHaveBeenCalledWith('flex');
  });

  it('sets new selected avatar and updates dirty state', () => {
    const root = { querySelectorAll: vi.fn(() => []), getElementById: vi.fn() };
    const state = { originalAvatarUrl: 'orig.png', selectedAvatarUrl: null, dirty: {} };
    const onDirty = vi.fn();
    const updateUI = vi.fn();

    setNewSelectedAvatar('changed.png', { root, state, onDirty, updateUI });
    expect(state.selectedAvatarUrl).toBe('changed.png');
    expect(onDirty).toHaveBeenCalledWith('avatar', true);
  });

  it('formats user counts compactly', () => {
    expect(formatUserCount(500)).toBe('500');
    expect(formatUserCount(1500)).toBe('1.5k');
    expect(formatUserCount(20000)).toBe('20k');
    expect(formatUserCount(2500000)).toBe('2.5m');
  });

  it('renders modal franchises list and style filter pills', () => {
    const gridEl = { innerHTML: '', querySelectorAll: vi.fn(() => []) };
    const containerPills = { innerHTML: '', querySelectorAll: vi.fn(() => []) };
    const root = {
      getElementById: vi.fn(id => {
        if (id === 'modalFranchisesListGrid') return gridEl;
        if (id === 'avatarStyleFilterPills') return containerPills;
        return null;
      }),
    };
    const state = { avatarFilters: { style: 'all', franchise: 'all' } };
    const getFranchisesSummary = vi.fn(() => [{ id: 'f1', name: 'Anime', count: 10 }]);
    const getStylesSummary = vi.fn(() => [{ id: 's1', name: '3D', count: 5 }]);

    renderModalFranchisesList({ root, state, getFranchisesSummary });
    expect(gridEl.innerHTML).toContain('Anime');

    renderAvatarStylePills({ root, state, getStylesSummary });
    expect(containerPills.innerHTML).toContain('3D');
  });

  it('renders avatar catalog cards', () => {
    const container = { innerHTML: '', querySelectorAll: vi.fn(() => []) };
    const root = { getElementById: vi.fn(() => container) };
    const state = { avatarFilters: {}, selectedAvatarUrl: 'p1.png' };
    const filterAvatars = vi.fn(() => [{ path: 'p1.png', character: 'Goku' }]);

    renderAvatarsCatalog({ root, state, filterAvatars });
    expect(container.innerHTML).toContain('Goku');
  });
});
