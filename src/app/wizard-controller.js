import { initializeWizard } from './wizard-bootstrap.js';
import { mountAuthStep } from '../pages/configuration/steps/auth.js';
import { createAuthStepMountOptions } from '../pages/configuration/steps/auth-actions.js';
import { mountProfilesStep } from '../pages/configuration/steps/profiles.js';
import { createProfilesStepActions } from '../pages/configuration/steps/profiles-actions.js';
import { authenticateWizard } from '../workflows/authenticate-wizard.js';
import { createWizardSessionStore } from '../workflows/wizard-session.js';
import { showToast as renderToast } from '../shared/ui/toast/render.js';
import { initPasswordToggles } from '../shared/ui/password-toggle.js';
import { state } from './wizard-state.js';
import { CONFIG } from './config.js';
import { MiniNuvio } from './mini-nuvio.js';
import { NuvioClient } from '../integrations/nuvio/client.js';
import { createStreamingConfiguration } from './streaming-configuration.js';
import { setupStepperNavigation } from '../pages/configuration/stepper.js';
import { initCompletionsCounterUI } from './completions.js';
import { recordAvatarUsage } from './avatar-ranking.js';
import {
  loadAvatarsCatalog,
  filterAvatars,
  resolveAvatarCdnUrl,
  getFranchisesSummary,
} from './avatar-catalog.js';
import { DEMO_POSTERS } from '../features/posters/index.js';
import { showLandingView, showWizardView, toggleView } from '../pages/configuration/view-switch.js';
import { saveWizardSession, restoreWizardSession, setAuthBadgeUI } from '../pages/configuration/session-sync.js';
import { attachControllerDelegates } from '../pages/configuration/delegates.js';
import { generateAioStreamsManifest } from '../workflows/generate-aiostreams-manifest.js';
import { syncProfileAddonsIfNeeded } from '../pages/configuration/addons-sync.js';
import { handleStepRouting, refreshStep7UI, handleWizardStateUpdate } from '../pages/configuration/step-router.js';
import {
  mountStep3ApiKeys,
  mountStep5Preferences,
  mountStep6Addons,
  mountStep7Injection,
} from './wizard-steps.js';

export { DEMO_POSTERS };

const wizardSessionStore = createWizardSessionStore({
  key: 'nuvio_wizard_auth',
  storage: typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
});

export class AppController {
  constructor() {
    this.miniNuvio = null;
    this.preferencesStep = null;
    this.addonsStep = null;
    this.injectionStep = null;
    this.stepper = null;
    this.profilePendingDelete = null;
    attachControllerDelegates(this);
    this.nextDemoPoster = this.nextDemoPoster.bind(this);
    this.prevDemoPoster = this.prevDemoPoster.bind(this);
  }

  async init() {
    return initializeWizard({
      controller: this,
      state,
      MiniNuvio,
      loadAvatarsCatalog,
      initCounter: initCompletionsCounterUI,
    });
  }

  showLandingView(updateHash = true) {
    showLandingView(document, updateHash);
  }

  showWizardView(updateHash = true) {
    showWizardView(document, updateHash, () => this.updateUI());
  }

  toggleView() {
    toggleView(document, () => this.updateUI());
  }

  showToast(message, type = 'info', duration = 3500) {
    return renderToast(message, { type, duration });
  }

  setupPasswordToggles() {
    return initPasswordToggles();
  }

  saveSession() {
    saveWizardSession(state, wizardSessionStore);
  }

  restoreSession() {
    restoreWizardSession(state, wizardSessionStore, {
      setAuthBadge: connected => this.setAuthBadge(connected),
      updateProfileWarning: (id, name) => this.updateProfileWarning(id, name),
    });
  }

  setupNavigation() {
    this.stepper = setupStepperNavigation({
      state,
      actions: {
        notify: (msg, type) => this.showToast(msg, type),
        onStepChanged: () => this.updateUI(),
      },
    });
  }

  updateUI() {
    this.stepper?.updateUI();
    handleStepRouting({ currentStep: state.currentStep, state, controller: this });
    this.updateNavigationButtons();
  }

  refreshStep7UI() {
    refreshStep7UI({
      root: document,
      state,
      injectionStep: this.injectionStep,
      setupPasswordToggles: () => this.setupPasswordToggles(),
    });
  }

  updateNavigationButtons() {
    this.stepper?.updateNavigationButtons();
  }

  updateStep6ExecuteButton() {
    this.injectionStep?.updateUI();
  }

  updateStep7ExecuteButton() {
    this.injectionStep?.updateUI();
  }

  updateManualModeButtons() {
    this.injectionStep?.updateUI();
  }

  setupStep1Events() {
    this.disposeAuthStep?.();
    this.disposeAuthStep = mountAuthStep(createAuthStepMountOptions({
      state,
      client: NuvioClient,
      config: { apiUrl: CONFIG.NUVIO_API_URL, anonKey: CONFIG.NUVIO_PUBLIC_ANON_KEY },
      authenticateWizard,
      notify: (msg, type) => this.showToast(msg, type),
      saveSession: () => this.saveSession(),
      setAuthBadge: connected => this.setAuthBadge(connected),
      renderProfiles: () => this.renderProfiles(),
      updateUI: () => this.updateUI(),
      updateNavigationButtons: () => this.updateNavigationButtons(),
    }));
  }

  setAuthBadge(connected) {
    setAuthBadgeUI(document, connected);
  }

  setupStep2Profiles() {
    this.disposeProfilesStep?.();
    this.profilesStep = mountProfilesStep({
      state,
      actions: createProfilesStepActions({
        state,
        client: NuvioClient,
        config: { apiUrl: CONFIG.NUVIO_API_URL, anonKey: CONFIG.NUVIO_PUBLIC_ANON_KEY },
        notify: (msg, type) => this.showToast(msg, type),
        saveSession: () => this.saveSession(),
        updateUI: () => this.updateUI(),
        avatarCatalog: { loadAvatarsCatalog, filterAvatars, getFranchisesSummary, resolveAvatarCdnUrl },
        recordAvatarUsage,
      }),
    });
    this.disposeProfilesStep = () => this.profilesStep.dispose();
  }

  selectProfile(id, name) {
    state.selectedProfileId = id;
    state.selectedProfileName = name;
    state.unlockStep(3);
    this.saveSession();
    this.renderProfiles();
    this.updateProfileWarning(id, name);
    this.updateUI();
  }

  setupStep3ApiKeys() {
    mountStep3ApiKeys(this, state);
  }

  setupStep5Preferences() {
    mountStep5Preferences(this, state);
  }

  setupStep6AddonsManager() {
    mountStep6Addons(this, state);
  }

  async renderAddonsManager() {
    const container = document.getElementById('addonsManagerContainer');
    if (!container) return;
    const loaded = await syncProfileAddonsIfNeeded({
      state,
      client: NuvioClient,
      config: { apiUrl: CONFIG.NUVIO_API_URL, anonKey: CONFIG.NUVIO_PUBLIC_ANON_KEY },
      container,
    });
    if (loaded) this.addonsStep?.render();
    else document.getElementById('btnRetryWizardAddons')?.addEventListener('click', () => this.renderAddonsManager(), { once: true });
    this.updateNavigationButtons();
  }

  setupStep6Injection() {
    this.setupStep7Injection();
  }

  setupStep7Injection() {
    mountStep7Injection(this, state);
  }

  async copyAioStreamsManifest() {
    return generateAioStreamsManifest({
      state,
      config: { aiostreamsInstance: CONFIG.AIOSTREAMS_INSTANCE },
      createConfiguration: createStreamingConfiguration,
      fetchTemplate: async () => {
        const res = await fetch(`${CONFIG.TEMPLATES.AIOSTREAMS}?v=${Date.now()}`);
        return res.json();
      },
      notify: (msg, type) => this.showToast(msg, type),
      copyText: text => navigator.clipboard.writeText(text),
      button: document.getElementById('btnCopyAioStreamsManifest'),
      passwordInput: document.getElementById('aioPassword'),
    });
  }

  refreshStep6Summary() {
    this.refreshStep7Summary();
  }

  refreshStep7Summary() {
    this.injectionStep?.refreshSummary();
  }

  handleStateUpdate(s, eventType) {
    handleWizardStateUpdate({ state, eventType, controller: this });
  }
}

export const appController = new AppController();
