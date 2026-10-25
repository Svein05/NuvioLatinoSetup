import { describe, it, expect, vi } from 'vitest';
import { setupScrollableTabs, switchSection } from './tabs-navigation.js';

describe('tabs-navigation', () => {
  it('attaches wheel and mouse listeners to scrollable tabs container', () => {
    const listeners = {};
    const container = {
      dataset: {},
      scrollLeft: 10,
      offsetLeft: 0,
      addEventListener: vi.fn((type, fn) => { listeners[type] = fn; }),
      querySelectorAll: vi.fn(() => []),
    };
    const root = { querySelector: vi.fn(() => container) };

    setupScrollableTabs(root);
    expect(container.dataset.scrollBound).toBe('true');
    expect(container.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });

    // Wheel event
    const preventDefault = vi.fn();
    listeners.wheel({ deltaY: 25, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(container.scrollLeft).toBe(35);
  });

  it('switches section pane and active nav button class', () => {
    const btnOverview = { dataset: { section: 'overview' }, classList: { toggle: vi.fn() }, scrollIntoView: vi.fn() };
    const btnAvatars = { dataset: { section: 'avatars' }, classList: { toggle: vi.fn() }, scrollIntoView: vi.fn() };
    const paneOverview = { id: 'sectionPane-overview', classList: { toggle: vi.fn() } };
    const paneAvatars = { id: 'sectionPane-avatars', classList: { toggle: vi.fn() } };

    const root = {
      querySelectorAll: vi.fn(selector => {
        if (selector === '.account-nav-btn') return [btnOverview, btnAvatars];
        if (selector === '.account-section-pane') return [paneOverview, paneAvatars];
        return [];
      }),
    };

    const state = { activeSection: 'overview' };
    const onSectionActivated = vi.fn();
    const updateUndoButton = vi.fn();

    switchSection('avatars', { root, state, onSectionActivated, updateUndoButton });

    expect(state.activeSection).toBe('avatars');
    expect(btnAvatars.classList.toggle).toHaveBeenCalledWith('is-active', true);
    expect(btnOverview.classList.toggle).toHaveBeenCalledWith('is-active', false);
    expect(paneAvatars.classList.toggle).toHaveBeenCalledWith('is-active', true);
    expect(paneOverview.classList.toggle).toHaveBeenCalledWith('is-active', false);
    expect(onSectionActivated).toHaveBeenCalledWith('avatars');
    expect(updateUndoButton).toHaveBeenCalled();
  });
});
