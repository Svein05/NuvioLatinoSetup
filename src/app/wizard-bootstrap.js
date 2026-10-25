import { createLifetime } from '../shared/ui/lifetime.js';
import { bindWizardCommands } from '../pages/configuration/commands.js';
import { managePageDialogs } from '../shared/ui/dialog-accessibility.js';

function connectWizard(controller, state, lifetime) {
  bindWizardCommands({ controller, lifetime });
  lifetime.add(managePageDialogs());
  controller.setupNavigation();
  controller.setupStep1Events();
  controller.setupStep2Profiles();
  controller.setupStep3ApiKeys();
  controller.setupStep5Preferences();
  controller.setupStep6AddonsManager();
  controller.setupStep7Injection();
  lifetime.add(controller.setupPasswordToggles());
  controller.restoreSession();
  lifetime.add(state.subscribe((snapshot, eventType) => controller.handleStateUpdate(snapshot, eventType)));
  lifetime.add(() => {
    controller.disposeAuthStep?.(); controller.disposeApiKeys?.(); controller.disposeProfilesStep?.();
    controller.disposePreferencesStep?.(); controller.addonsStep?.dispose(); controller.injectionStep?.dispose();
    controller.stepper?.dispose(); controller.miniNuvio?.dispose();
  });
  controller.updateUI();
}

function connectPageNavigation(controller, lifetime) {
  const landing = document.getElementById('landingView');
  if (!landing) {
    document.getElementById('wizardView')?.classList.remove('hidden');
    controller.updateUI();
    return;
  }
  const showCurrentView = () => {
    const wizardHash = ['#wizard', '#setup'].includes(window.location.hash);
    if (wizardHash) controller.showWizardView(false);
    else controller.showLandingView(false);
  };
  showCurrentView();
  lifetime.on(window, 'hashchange', showCurrentView);
}

/** Composition boundary. Legacy implementations are supplied while their features migrate. */
export async function initializeWizard({ controller, state, MiniNuvio, loadAvatarsCatalog, initCounter }) {
  const lifetime = createLifetime();
  lifetime.on(window, 'pagehide', event => { if (!event.persisted) lifetime.dispose(); });
  controller.miniNuvio = new MiniNuvio('miniNuvioContainer', { notify: (message, type) => controller.showToast(message, type) });
  initCounter();
  loadAvatarsCatalog().catch(() => console.warn('[Wizard] Catálogo de avatares no disponible.'));
  await state.loadTemplates();
  if (lifetime.signal.aborted) return;
  controller.miniNuvio.init();
  connectWizard(controller, state, lifetime);
  connectPageNavigation(controller, lifetime);
  const wizard = document.getElementById('wizardView');
  wizard?.removeAttribute('inert');
  wizard?.setAttribute('aria-busy', 'false');
}
