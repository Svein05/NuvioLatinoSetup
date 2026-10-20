import { mountApiKeysStep } from '../pages/configuration/steps/api-keys.js';
import { verifyWizardApiKeys } from './api-key-validation.js';
import { mountPreferencesStep } from '../pages/configuration/steps/preferences.js';
import { mountAddonsStep } from '../pages/configuration/steps/addons.js';
import { mountInjectionStep } from '../pages/configuration/steps/injection.js';
import { createInjectionStepActions } from '../pages/configuration/steps/injection-actions.js';
import { compileUniversalBadgeRules } from './badge-compilation.js';
import { validateDebridKey } from '../integrations/debrid/validate-key.js';
import { executePipeline, downloadCollectionsJson, downloadAioConfigJson } from './provisioning.js';
import { recordSuccessfulCompletion } from './completions.js';
import { NuvioClient } from '../integrations/nuvio/client.js';

function getRoot(root) {
  if (root) return root;
  return typeof document !== 'undefined' ? document : null;
}

export function mountStep3ApiKeys(controller, state, root) {
  const targetRoot = getRoot(root);
  if (!targetRoot) return;
  controller.disposeApiKeys?.();
  const synchronize = snapshot => {
    Object.assign(state.apiKeys, snapshot.keys);
    state.searchAiEnabled = snapshot.aiEnabled;
    state.invalidateApiKeysValidation();
    controller.updateNavigationButtons();
  };
  controller.disposeApiKeys = mountApiKeysStep({
    initial: {
      keys: { ...state.apiKeys },
      aiEnabled: state.searchAiEnabled,
      statusMap: { ...state.apiKeysValidationStatus },
    },
    verify: verifyWizardApiKeys,
    onSnapshot: synchronize,
    onEdit: synchronize,
    onValidated: result => {
      state.setApiKeysValidation(result.valid, result.statusMap);
      controller.updateUI();
      controller.updateNavigationButtons();
    },
    notify: (msg, type) => controller.showToast(msg, type),
  }, targetRoot);
}

export function mountStep5Preferences(controller, state, root) {
  const targetRoot = getRoot(root);
  if (!targetRoot) return;
  controller.disposePreferencesStep?.();
  controller.preferencesStep = mountPreferencesStep({
    state,
    actions: {
      compileBadgeRules: compileUniversalBadgeRules,
      notify: (msg, type) => controller.showToast(msg, type),
      onUpdate: () => {
        controller.updateNavigationButtons();
        controller.updateManualModeButtons();
        controller.refreshStep7Summary?.();
      },
    },
    root: targetRoot,
  });
}

export function mountStep6Addons(controller, state, root) {
  const targetRoot = getRoot(root);
  if (!targetRoot) return;
  controller.addonsStep = mountAddonsStep({
    state,
    actions: {
      notify: (msg, type) => controller.showToast(msg, type),
      validateDebridKey,
      onUpdate: () => controller.updateUI(),
    },
    root: targetRoot,
  });
}

export function mountStep7Injection(controller, state, root) {
  const targetRoot = getRoot(root);
  if (!targetRoot) return;
  state.execution.mode = 'real';
  controller.injectionStep = mountInjectionStep({
    state,
    actions: createInjectionStepActions({
      state,
      controller,
      notify: (msg, type) => controller.showToast(msg, type),
      executePipeline: () => executePipeline(state, { nuvioClient: NuvioClient }),
      recordCompletion: () => recordSuccessfulCompletion(),
      downloadCollectionsJson: col => downloadCollectionsJson(col),
      downloadAioConfigJson: meta => downloadAioConfigJson(meta),
    }),
    root: targetRoot,
  });
}
