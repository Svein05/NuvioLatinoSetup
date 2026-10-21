import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showLandingView, showWizardView, toggleView } from './view-switch.js';

describe('view-switch', () => {
  let root;
  let landing;
  let wizard;
  let btnText;
  let btnIcon;

  beforeEach(() => {
    landing = {
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
      },
    };
    wizard = {
      classList: {
        classes: new Set(['hidden']),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
      },
    };
    btnText = { innerText: '' };
    btnIcon = { className: '' };

    root = {
      querySelector: vi.fn((sel) => {
        if (sel === '#landingView') return landing;
        if (sel === '#wizardView') return wizard;
        if (sel === '#btnToggleWizardHeaderText') return btnText;
        if (sel === '#btnToggleWizardHeader i') return btnIcon;
        return null;
      }),
    };
  });

  describe('showLandingView', () => {
    it('shows landing view and hides wizard view', () => {
      showLandingView(root, false);
      expect(landing.classList.contains('hidden')).toBe(false);
      expect(wizard.classList.contains('hidden')).toBe(true);
      expect(btnText.innerText).toBe('Iniciar Asistente');
      expect(btnIcon.className).toContain('fa-wand-magic-sparkles');
    });
  });

  describe('showWizardView', () => {
    it('shows wizard view and hides landing view, calling onShow callback', () => {
      const onShow = vi.fn();
      showWizardView(root, false, onShow);
      expect(landing.classList.contains('hidden')).toBe(true);
      expect(wizard.classList.contains('hidden')).toBe(false);
      expect(btnText.innerText).toBe('Ver Presentación');
      expect(btnIcon.className).toContain('fa-house');
      expect(onShow).toHaveBeenCalled();
    });
  });

  describe('toggleView', () => {
    it('toggles to wizard when landing is visible', () => {
      const onShow = vi.fn();
      toggleView(root, onShow);
      expect(wizard.classList.contains('hidden')).toBe(false);
      expect(onShow).toHaveBeenCalled();
    });

    it('toggles to landing when landing is hidden', () => {
      landing.classList.add('hidden');
      toggleView(root);
      expect(landing.classList.contains('hidden')).toBe(false);
      expect(wizard.classList.contains('hidden')).toBe(true);
    });
  });
});
