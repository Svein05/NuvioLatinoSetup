import { describe, expect, it, vi } from 'vitest';
import { renderProfilesList, renderProfileWarningUI } from './profiles-view.js';
import { mountProfilesStep } from './profiles.js';

function createMockElement(id = '') {
  const listeners = new Map();
  return {
    id,
    innerHTML: '',
    value: '',
    dataset: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      replace: vi.fn(),
    },
    addEventListener: (evt, fn) => listeners.set(evt, fn),
    click: () => listeners.get('click')?.({ stopPropagation: vi.fn() }),
    querySelectorAll: () => [],
    querySelector: () => null,
  };
}

describe('profiles-view', () => {
  it('renders list of profiles to container innerHTML', () => {
    const container = createMockElement('container');
    const profiles = [
      { id: 'p1', name: 'Profile One' },
      { id: 'p2', name: 'Profile Two' },
    ];
    renderProfilesList(container, { profiles, selectedProfileId: 'p1' });

    expect(container.innerHTML).toContain('Profile One');
    expect(container.innerHTML).toContain('Profile Two');
    expect(container.innerHTML).toContain('Nuevo Perfil');
  });

  it('renders empty message when no profiles exist', () => {
    const container = createMockElement('container');
    renderProfilesList(container, { profiles: [] });

    expect(container.innerHTML).toContain('No se encontraron perfiles');
  });

  it('renders warning UI for new and existing profiles', () => {
    const textEl = createMockElement('profileWarningText');
    const container = createMockElement('profileOverwriteWarning');
    const iconEl = createMockElement('profileWarningIcon');

    const origDoc = globalThis.document;
    globalThis.document = {
      getElementById: (id) => {
        if (id === 'profileWarningText') return textEl;
        if (id === 'profileOverwriteWarning') return container;
        if (id === 'profileWarningIcon') return iconEl;
        return null;
      },
    };

    try {
      renderProfileWarningUI({ isNew: true, displayName: 'Newbie' });
      expect(textEl.innerHTML).toContain('Perfil nuevo');

      renderProfileWarningUI({ isNew: false, hasAio: true, displayName: 'Old' });
      expect(textEl.innerHTML).toContain('se actualizará');
    } finally {
      globalThis.document = origDoc;
    }
  });
});

describe('mountProfilesStep', () => {
  it('warns when trying to create a profile with empty name', async () => {
    const notify = vi.fn();
    const createProfile = vi.fn();
    const state = {
      profiles: [{ id: 'p1', name: 'Main' }],
      selectedProfileId: 'p1',
      isProfileNew: () => false,
    };

    const elements = new Map([
      ['profilesList', createMockElement('profilesList')],
      ['profileOverwriteWarning', createMockElement('profileOverwriteWarning')],
      ['profileWarningText', createMockElement('profileWarningText')],
      ['profileWarningIcon', createMockElement('profileWarningIcon')],
      ['modalNewProfile', createMockElement('modalNewProfile')],
      ['inputNewProfileName', createMockElement('inputNewProfileName')],
      ['btnConfirmNewProfile', createMockElement('btnConfirmNewProfile')],
      ['modalDeleteProfile', createMockElement('modalDeleteProfile')],
      ['deleteProfileTargetName', createMockElement('deleteProfileTargetName')],
      ['btnConfirmDeleteProfile', createMockElement('btnConfirmDeleteProfile')],
    ]);

    const mockRoot = {
      getElementById: (id) => elements.get(id) || null,
    };

    mountProfilesStep({
      state,
      actions: {
        notify,
        createProfile,
        deleteProfile: vi.fn(),
        onSelectProfile: vi.fn(),
        checkProfileHasAio: vi.fn().mockResolvedValue(false),
        loadAvatars: vi.fn(),
        filterAvatars: vi.fn().mockReturnValue([]),
        getFranchises: vi.fn().mockReturnValue([]),
        resolveCdnUrl: (p) => p,
      },
      root: mockRoot,
    });

    elements.get('btnConfirmNewProfile').click();
    expect(notify).toHaveBeenCalledWith('Escribe un nombre para el nuevo perfil.', 'warning');
    expect(createProfile).not.toHaveBeenCalled();
  });
});
