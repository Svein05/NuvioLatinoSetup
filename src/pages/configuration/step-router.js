export function handleStepRouting({ currentStep, state, controller }) {
  if (currentStep === 2) {
    controller.renderProfiles?.();
  } else if (currentStep === 3) {
    state.unlockStep(4);
  } else if (currentStep === 5) {
    state.unlockStep(6);
    controller.updatePreferencesUI?.();
    controller.startPosterRotation?.();
  } else if (currentStep === 6) {
    state.unlockStep(7);
    controller.renderAddonsManager?.();
  } else if (currentStep === 7) {
    controller.refreshStep7UI?.();
  }
  if (currentStep !== 5) {
    controller.stopPosterRotation?.();
  }
}

export function refreshStep7UI({ root = document, state, injectionStep, setupPasswordToggles }) {
  const manualContainer = root.querySelector?.('#manualModeContainer');
  const btnExec = root.querySelector?.('#btnExecutePipeline');
  if (manualContainer && btnExec) {
    manualContainer.classList.toggle('hidden', !state.isManualMode);
    btnExec.classList.toggle('hidden', state.isManualMode);
    btnExec.style.display = state.isManualMode ? 'none' : 'flex';
  }
  const aioPassEl = root.querySelector?.('#aioPassword');
  if (aioPassEl) {
    if (!aioPassEl.value && state.aiometadata?.password) {
      aioPassEl.value = state.aiometadata.password;
    } else if (aioPassEl.value && !state.aiometadata?.password) {
      state.aiometadata.password = aioPassEl.value.trim();
    }
  }
  injectionStep?.updateUI();
  setupPasswordToggles?.();
}

export function handleWizardStateUpdate({ state, eventType, controller }) {
  if (eventType === 'LOG_ADDED') {
    const lastLog = state.execution?.logs?.[state.execution.logs.length - 1];
    controller.injectionStep?.handleLog(lastLog);
  } else if (eventType === 'EXECUTION_FINISHED') {
    controller.injectionStep?.handleFinished({
      isCompleted: state.execution?.isCompleted,
      profileName: state.selectedProfileName || 'Principal',
      error: state.execution?.error,
    });
  } else if (eventType === 'STEP_UNLOCKED' || eventType === 'API_KEYS_VALIDATED' || eventType === 'API_KEYS_INVALIDATED') {
    controller.updateUI();
  }
}
