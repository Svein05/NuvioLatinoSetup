import { describe, it, expect, vi } from 'vitest';
import { handleStepRouting, refreshStep7UI, handleWizardStateUpdate } from './step-router.js';

describe('step-router', () => {
  it('routes step changes to appropriate controller handlers', () => {
    const state = { unlockStep: vi.fn() };
    const controller = {
      renderProfiles: vi.fn(),
      updatePreferencesUI: vi.fn(),
      startPosterRotation: vi.fn(),
      stopPosterRotation: vi.fn(),
      renderAddonsManager: vi.fn(),
      refreshStep7UI: vi.fn(),
    };

    handleStepRouting({ currentStep: 2, state, controller });
    expect(controller.renderProfiles).toHaveBeenCalled();
    expect(controller.stopPosterRotation).toHaveBeenCalled();

    handleStepRouting({ currentStep: 5, state, controller });
    expect(state.unlockStep).toHaveBeenCalledWith(6);
    expect(controller.startPosterRotation).toHaveBeenCalled();
  });

  it('refreshes step 7 UI elements and toggles manual container', () => {
    const manualContainer = { classList: { toggle: vi.fn() } };
    const btnExec = { classList: { toggle: vi.fn() }, style: {} };
    const aioPassEl = { value: '' };
    const root = {
      querySelector: vi.fn(sel => {
        if (sel === '#manualModeContainer') return manualContainer;
        if (sel === '#btnExecutePipeline') return btnExec;
        if (sel === '#aioPassword') return aioPassEl;
        return null;
      }),
    };
    const injectionStep = { updateUI: vi.fn() };
    const setupPasswordToggles = vi.fn();

    refreshStep7UI({
      root,
      state: { isManualMode: true, aiometadata: { password: 'pass' } },
      injectionStep,
      setupPasswordToggles,
    });

    expect(manualContainer.classList.toggle).toHaveBeenCalledWith('hidden', false);
    expect(btnExec.classList.toggle).toHaveBeenCalledWith('hidden', true);
    expect(aioPassEl.value).toBe('pass');
    expect(injectionStep.updateUI).toHaveBeenCalled();
    expect(setupPasswordToggles).toHaveBeenCalled();
  });

  it('handles state update events (logs and finish)', () => {
    const state = {
      execution: { logs: ['log1', 'log2'], isCompleted: true, error: null },
      selectedProfileName: 'Test',
    };
    const controller = {
      injectionStep: {
        handleLog: vi.fn(),
        handleFinished: vi.fn(),
      },
      updateUI: vi.fn(),
    };

    handleWizardStateUpdate({ state, eventType: 'LOG_ADDED', controller });
    expect(controller.injectionStep.handleLog).toHaveBeenCalledWith('log2');

    handleWizardStateUpdate({ state, eventType: 'EXECUTION_FINISHED', controller });
    expect(controller.injectionStep.handleFinished).toHaveBeenCalledWith(expect.objectContaining({ isCompleted: true }));

    handleWizardStateUpdate({ state, eventType: 'STEP_UNLOCKED', controller });
    expect(controller.updateUI).toHaveBeenCalled();
  });
});
