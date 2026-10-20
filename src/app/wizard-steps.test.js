import { describe, it, expect, vi } from 'vitest';
import {
  mountStep3ApiKeys,
  mountStep5Preferences,
  mountStep6Addons,
  mountStep7Injection,
} from './wizard-steps.js';

function createMockRoot() {
  const el = () => ({
    value: '',
    innerText: '',
    innerHTML: '',
    className: '',
    style: {},
    classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(() => el()),
    querySelectorAll: vi.fn().mockReturnValue([]),
  });
  return {
    querySelector: vi.fn(() => el()),
    querySelectorAll: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('wizard-steps', () => {
  it('mounts step 3 api keys step with mock root', () => {
    const controller = {
      showToast: vi.fn(),
      updateNavigationButtons: vi.fn(),
      updateUI: vi.fn(),
    };
    const state = {
      apiKeys: {},
      searchAiEnabled: false,
      apiKeysValidationStatus: {},
      invalidateApiKeysValidation: vi.fn(),
      setApiKeysValidation: vi.fn(),
    };
    const root = createMockRoot();

    mountStep3ApiKeys(controller, state, root);
    expect(controller.disposeApiKeys).toBeDefined();
  });

  it('mounts step 5 preferences step with mock root', () => {
    const controller = { showToast: vi.fn() };
    const state = { preferences: {} };
    const root = createMockRoot();

    mountStep5Preferences(controller, state, root);
    expect(controller.preferencesStep).toBeDefined();
  });

  it('mounts step 6 addons step with mock root', () => {
    const controller = { showToast: vi.fn(), updateUI: vi.fn() };
    const state = { addons: [] };
    const root = createMockRoot();

    mountStep6Addons(controller, state, root);
    expect(controller.addonsStep).toBeDefined();
  });

  it('mounts step 7 injection step with mock root', () => {
    const controller = { showToast: vi.fn() };
    const state = { execution: {}, preferences: {} };
    const root = createMockRoot();

    mountStep7Injection(controller, state, root);
    expect(controller.injectionStep).toBeDefined();
  });
});
