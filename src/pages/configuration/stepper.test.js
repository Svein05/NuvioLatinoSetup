import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupStepperNavigation, updateStepperUI, updateNavigationButtons } from './stepper.js';

function createMockElement(id = '') {
  return {
    id,
    innerText: '',
    className: '',
    style: {},
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
    querySelector: vi.fn(() => ({ className: '' })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('Stepper & Drawer Navigation Module', () => {
  let root;
  let state;
  let elements;

  beforeEach(() => {
    elements = {
      indexDrawer: createMockElement('indexDrawer'),
      indexDrawerOverlay: createMockElement('indexDrawerOverlay'),
      btnOpenIndex: createMockElement('btnOpenIndex'),
      btnCloseIndex: createMockElement('btnCloseIndex'),
      btnBack: createMockElement('btnBack'),
      btnNext: createMockElement('btnNext'),
      stepCounter: createMockElement('stepCounter'),
      drawerStepCounter: createMockElement('drawerStepCounter'),
      'step-1': createMockElement('step-1'),
      'step-2': createMockElement('step-2'),
      'step-3': createMockElement('step-3'),
      'drawer-step-1': createMockElement('drawer-step-1'),
      'drawer-step-2': createMockElement('drawer-step-2'),
      'drawer-step-3': createMockElement('drawer-step-3'),
    };

    root = {
      querySelector: vi.fn(selector => {
        const id = selector.replace('#', '');
        return elements[id] || null;
      }),
      querySelectorAll: vi.fn(() => []),
    };

    state = {
      currentStep: 1,
      totalSteps: 3,
      maxUnlockedStep: 1,
      isManualMode: false,
      unlockStep: vi.fn(s => { state.maxUnlockedStep = Math.max(state.maxUnlockedStep, s); }),
      validateStep: vi.fn(() => ({ valid: true })),
    };
  });

  it('updates stepper UI elements and classes based on currentStep', () => {
    updateStepperUI(root, state);
    expect(elements['step-1'].classList.toggle).toHaveBeenCalledWith('active', true);
    expect(elements.stepCounter.innerText).toBe('Paso 1 de 3');
    expect(elements.btnBack.style.visibility).toBe('hidden');
    expect(elements.btnNext.style.display).toBe('flex');
  });

  it('updates navigation buttons according to step validation', () => {
    state.validateStep.mockReturnValueOnce({ valid: false, error: 'Falta configurar' });
    updateNavigationButtons(root, state);
    expect(elements.btnNext.disabled).toBe(true);

    state.validateStep.mockReturnValueOnce({ valid: true });
    updateNavigationButtons(root, state);
    expect(elements.btnNext.disabled).toBe(false);
  });

  it('handles goToStep forward validation and backwards navigation', () => {
    const notify = vi.fn();
    const onStepChanged = vi.fn();
    const stepper = setupStepperNavigation({ state, actions: { notify, onStepChanged }, root });

    // Jumping +2 is rejected
    stepper.goToStep(3);
    expect(notify).toHaveBeenCalledWith('Solo puedes avanzar un paso a la vez tras completar el actual.', 'warning');
    expect(state.currentStep).toBe(1);

    // Advancing +1 with valid step works
    stepper.goToStep(2);
    expect(state.unlockStep).toHaveBeenCalledWith(2);
    expect(state.currentStep).toBe(2);
    expect(onStepChanged).toHaveBeenCalled();

    // Navigating backwards is always allowed
    stepper.goToStep(1);
    expect(state.currentStep).toBe(1);

    stepper.dispose();
  });

  it('handles changeStep delta transitions correctly', () => {
    const notify = vi.fn();
    const onStepChanged = vi.fn();
    const stepper = setupStepperNavigation({ state, actions: { notify, onStepChanged }, root });

    // Step forward
    stepper.changeStep(1);
    expect(state.currentStep).toBe(2);

    // Step backwards
    stepper.changeStep(-1);
    expect(state.currentStep).toBe(1);

    stepper.dispose();
  });
});
