import { describe, it, expect, vi } from 'vitest';
import { attachControllerDelegates } from './delegates.js';

describe('delegates', () => {
  it('wires step delegates to preferencesStep, profilesStep, and addonsStep', () => {
    const controller = {
      preferencesStep: {
        selectPosterEngine: vi.fn(),
        toggleCustomUrlInput: vi.fn(),
        updateUI: vi.fn(),
      },
      profilesStep: {
        openNewModal: vi.fn(),
        render: vi.fn(),
      },
      addonsStep: {
        render: vi.fn(),
        moveAddon: vi.fn(),
      },
    };

    attachControllerDelegates(controller);

    controller.selectPosterEngine('rpdb');
    expect(controller.preferencesStep.selectPosterEngine).toHaveBeenCalledWith('rpdb');

    controller.openNewProfileModal();
    expect(controller.profilesStep.openNewModal).toHaveBeenCalled();

    controller.moveAddon(0, 'up');
    expect(controller.addonsStep.moveAddon).toHaveBeenCalledWith(0, 'up');
  });
});
