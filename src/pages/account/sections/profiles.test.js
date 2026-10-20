import { describe, it, expect, vi } from 'vitest';
import {
  renderProfilePopover,
  showSelectProfilePrompt,
  closeSelectProfilePrompt,
  openEditProfileModal,
  closeEditProfileModal,
  openCreateProfileModal,
  closeCreateProfileModal,
} from './profiles.js';

describe('profiles section', () => {
  it('renders profile popover with list of profiles', () => {
    const list = { innerHTML: '', querySelectorAll: vi.fn(() => []) };
    const countBadge = { textContent: '' };
    const addContainer = { classList: { toggle: vi.fn() } };
    const root = {
      getElementById: vi.fn(id => {
        if (id === 'popoverProfilesList') return list;
        if (id === 'popoverProfileCount') return countBadge;
        if (id === 'popoverAddProfileContainer') return addContainer;
        return null;
      }),
    };
    const state = {
      profiles: [{ id: 1, name: 'Principal', avatar_url: 'avatar1.png' }],
      selectedProfileId: 1,
    };

    renderProfilePopover({ root, state, resolveAvatarCdnUrl: u => `https://cdn/${u}` });

    expect(countBadge.textContent).toBe('1/6');
    expect(list.innerHTML).toContain('Principal');
    expect(list.innerHTML).toContain('https://cdn/avatar1.png');
  });

  it('shows and closes select profile prompt modal', () => {
    const modal = { classList: { add: vi.fn(), remove: vi.fn() } };
    const grid = { innerHTML: '', querySelectorAll: vi.fn(() => []) };
    const root = {
      getElementById: vi.fn(id => {
        if (id === 'modalSelectProfilePrompt') return modal;
        if (id === 'modalProfileCardsGrid') return grid;
        return null;
      }),
    };
    const state = { profiles: [{ id: 2, name: 'Secundario' }], selectedProfileId: 2 };

    showSelectProfilePrompt({ root, state, resolveAvatarCdnUrl: u => u });
    expect(modal.classList.add).toHaveBeenCalledWith('flex');
    expect(modal.classList.remove).toHaveBeenCalledWith('hidden');

    closeSelectProfilePrompt(root);
    expect(modal.classList.add).toHaveBeenCalledWith('hidden');
    expect(modal.classList.remove).toHaveBeenCalledWith('flex');
  });

  it('opens and closes edit and create profile modals', () => {
    const modalEdit = { classList: { add: vi.fn(), remove: vi.fn() } };
    const nameInput = { value: '', focus: vi.fn() };
    const targetInput = { value: '' };
    const modalCreate = { classList: { add: vi.fn(), remove: vi.fn() } };

    const root = {
      getElementById: vi.fn(id => {
        if (id === 'modalEditProfile') return modalEdit;
        if (id === 'inputEditProfileName') return nameInput;
        if (id === 'editProfileTargetId') return targetInput;
        if (id === 'modalCreateProfile') return modalCreate;
        if (id === 'inputCreateProfileName') return nameInput;
        return null;
      }),
    };

    const state = { profiles: [{ id: 5, name: 'Perfil 5' }] };

    openEditProfileModal({ root, state, profileId: 5 });
    expect(nameInput.value).toBe('Perfil 5');
    expect(targetInput.value).toBe(5);

    closeEditProfileModal(root);
    expect(modalEdit.classList.add).toHaveBeenCalledWith('hidden');

    openCreateProfileModal({ root, state, showToast: vi.fn() });
    expect(nameInput.value).toBe('');
    expect(modalCreate.classList.remove).toHaveBeenCalledWith('hidden');

    closeCreateProfileModal(root);
    expect(modalCreate.classList.add).toHaveBeenCalledWith('hidden');
  });
});
