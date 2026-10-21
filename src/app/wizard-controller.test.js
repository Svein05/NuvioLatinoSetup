import { describe, it, expect, vi } from 'vitest';
import { AppController, DEMO_POSTERS } from './wizard-controller.js';

describe('wizard-controller', () => {
  it('exports DEMO_POSTERS array', () => {
    expect(Array.isArray(DEMO_POSTERS)).toBe(true);
    expect(DEMO_POSTERS.length).toBeGreaterThan(0);
  });

  it('instantiates AppController with initial properties and delegates', () => {
    const controller = new AppController();
    expect(controller.miniNuvio).toBeNull();
    expect(controller.preferencesStep).toBeNull();
    expect(controller.addonsStep).toBeNull();
    expect(controller.injectionStep).toBeNull();
    expect(typeof controller.init).toBe('function');
    expect(typeof controller.showLandingView).toBe('function');
    expect(typeof controller.showWizardView).toBe('function');
    expect(typeof controller.toggleView).toBe('function');
    expect(typeof controller.selectPosterEngine).toBe('function');
  });

  it('sets auth badge through setAuthBadge', () => {
    const controller = new AppController();
    const badge = { className: '', innerHTML: '' };
    const originalDoc = globalThis.document;
    globalThis.document = { querySelector: vi.fn().mockReturnValue(badge) };

    try {
      controller.setAuthBadge(true);
      expect(badge.className).toContain('emerald');

      controller.setAuthBadge(false);
      expect(badge.className).toContain('slate');
    } finally {
      globalThis.document = originalDoc;
    }
  });
});
