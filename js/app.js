import { compileUniversalBadgeRules } from '../src/app/badge-compilation.js';
import { initializeWizard } from '../src/app/wizard-bootstrap.js';
import { whenDocumentReady } from '../src/shared/ui/when-document-ready.js';
import { mountApiKeysStep } from '../src/pages/configuration/steps/api-keys.js';
import { verifyWizardApiKeys } from '../src/app/api-key-validation.js';
import { mountAuthStep } from '../src/pages/configuration/steps/auth.js';
import { mountProfilesStep } from '../src/pages/configuration/steps/profiles.js';
import { createProfilesStepActions } from '../src/pages/configuration/steps/profiles-actions.js';
import { authenticateWizard } from '../src/workflows/authenticate-wizard.js';
import { createWizardSessionStore } from '../src/workflows/wizard-session.js';
import { showToast as renderToast } from '../src/shared/ui/toast/render.js';
import { initPasswordToggles } from '../src/shared/ui/password-toggle.js';
import { state } from '../src/app/wizard-state.js';
import { CONFIG } from '../src/app/config.js';
import { MiniNuvio } from '../src/app/mini-nuvio.js';
import { NuvioClient } from '../src/integrations/nuvio/client.js';
import { executePipeline, downloadCollectionsJson, downloadAioConfigJson } from '../src/app/provisioning.js';
import { createStreamingConfiguration } from '../src/app/streaming-configuration.js';
import { validateDebridKey } from '../src/integrations/debrid/validate-key.js';
import { getBadgePackById, getBadgePackUrl } from '../src/features/badges/index.js';
import { mountPreferencesStep } from '../src/pages/configuration/steps/preferences.js';
import { mountAddonsStep } from '../src/pages/configuration/steps/addons.js';
import { mountInjectionStep } from '../src/pages/configuration/steps/injection.js';
import { setupStepperNavigation } from '../src/pages/configuration/stepper.js';
import { showCompletionModal } from '../src/pages/configuration/completion-modal.js';
import { initCompletionsCounterUI, recordSuccessfulCompletion } from '../src/app/completions.js';
import {
  loadAvatarsCatalog,
  filterAvatars,
  resolveAvatarCdnUrl,
  getFranchisesSummary,
} from '../src/app/avatar-catalog.js';
import { DEMO_POSTERS } from '../src/features/posters/index.js';
import { showLandingView, showWizardView, toggleView } from '../src/pages/configuration/view-switch.js';
import { saveWizardSession, restoreWizardSession, setAuthBadgeUI } from '../src/pages/configuration/session-sync.js';
import { attachControllerDelegates } from '../src/pages/configuration/delegates.js';
import { generateAioStreamsManifest } from '../src/workflows/generate-aiostreams-manifest.js';

export { DEMO_POSTERS };

const wizardSessionStore = createWizardSessionStore({ key: 'nuvio_wizard_auth', storage: sessionStorage });

class AppController {
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
    const { currentStep } = state;
    if (currentStep === 2) {
      this.renderProfiles();
    } else if (currentStep === 3) {
      state.unlockStep(4);
    } else if (currentStep === 5) {
      state.unlockStep(6);
      this.updatePreferencesUI();
      this.startPosterRotation();
    } else if (currentStep === 6) {
      state.unlockStep(7);
      this.renderAddonsManager();
    } else if (currentStep === 7) {
      this.refreshStep7UI();
    }
    if (currentStep !== 5) {
      this.stopPosterRotation();
    }
    this.updateNavigationButtons();
  }

  refreshStep7UI() {
    const manualContainer = document.getElementById('manualModeContainer');
    const btnExec = document.getElementById('btnExecutePipeline');
    if (manualContainer && btnExec) {
      manualContainer.classList.toggle('hidden', !state.isManualMode);
      btnExec.classList.toggle('hidden', state.isManualMode);
      btnExec.style.display = state.isManualMode ? 'none' : 'flex';
    }
    const aioPassEl = document.getElementById('aioPassword');
    if (aioPassEl) {
      if (!aioPassEl.value && state.aiometadata?.password) {
        aioPassEl.value = state.aiometadata.password;
      } else if (aioPassEl.value && !state.aiometadata?.password) {
        state.aiometadata.password = aioPassEl.value.trim();
      }
    }
    this.injectionStep?.updateUI();
    this.setupPasswordToggles();
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

  showCompletionModal(options = {}) {
    showCompletionModal(document, {
      ...options,
      onRecordCompletion: () => recordSuccessfulCompletion().catch(() => {}),
    });
  }

  setupStep1Events() {
    this.disposeAuthStep?.();
    this.disposeAuthStep = mountAuthStep({
      authenticate: ({ mode, credentials, signal }) => authenticateWizard({
        mode,
        credentials,
        client: NuvioClient,
        context: { apiUrl: CONFIG.NUVIO_API_URL, apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY, signal },
      }),
      onCredentials: ({ email, password }) => {
        state.nuvioAuth.email = email;
        state.nuvioAuth.password = password;
        this.updateNavigationButtons();
      },
      onAuthenticated: ({ auth, profiles, email }) => {
        state.isManualMode = false;
        Object.assign(state.nuvioAuth, {
          accessToken: auth.accessToken,
          userId: auth.userId,
          expiresAt: auth.expiresAt,
          isAuthenticated: true,
          apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
          email,
          password: '',
        });
        state.profiles = profiles;
        if (profiles.length) {
          state.selectedProfileId = profiles[0].id;
          state.selectedProfileName = profiles[0].name || profiles[0].title || 'Principal';
          state.unlockStep(3);
        }
        state.unlockStep(2);
        this.setAuthBadge(true);
        this.saveSession();
      },
      onContinue: destination => {
        state.currentStep = destination === 'manual' ? 3 : 2;
        if (destination === 'manual') state.unlockStep(3);
        else this.renderProfiles();
        this.updateUI();
      },
      onManual: () => {
        state.enableManualMode();
        const badge = document.getElementById('authStatusBadge');
        if (badge) {
          badge.className = 'text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5';
          badge.innerHTML = '<i class="fa-solid fa-user-slash text-[10px]"></i> Modo Manual (Sin cuenta)';
        }
        this.showToast('Continuando en modo manual sin cuenta de Nuvio.', 'info');
      },
      notify: (message, type) => this.showToast(message, type),
      onFailure: () => this.setAuthBadge(false),
    });
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
        notify: (message, type) => this.showToast(message, type),
        saveSession: () => this.saveSession(),
        updateUI: () => this.updateUI(),
        avatarCatalog: { loadAvatarsCatalog, filterAvatars, getFranchisesSummary, resolveAvatarCdnUrl },
      }),
    });
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
    this.disposeApiKeys?.();
    const synchronize = snapshot => {
      Object.assign(state.apiKeys, snapshot.keys);
      state.searchAiEnabled = snapshot.aiEnabled;
      state.invalidateApiKeysValidation();
      this.updateNavigationButtons();
    };
    this.disposeApiKeys = mountApiKeysStep({
      initial: { keys: { ...state.apiKeys }, aiEnabled: state.searchAiEnabled, statusMap: { ...state.apiKeysValidationStatus } },
      verify: verifyWizardApiKeys,
      onSnapshot: synchronize,
      onEdit: synchronize,
      onValidated: result => {
        state.setApiKeysValidation(result.valid, result.statusMap);
        this.updateUI();
        this.updateNavigationButtons();
      },
      notify: (message, type) => this.showToast(message, type),
    });
  }

  setupStep5Preferences() {
    this.disposePreferencesStep?.();
    this.preferencesStep = mountPreferencesStep({
      state,
      actions: {
        compileBadgeRules: compileUniversalBadgeRules,
        notify: (message, type) => this.showToast(message, type),
        onUpdate: () => {
          this.updateNavigationButtons();
          this.updateManualModeButtons();
          this.refreshStep7Summary?.();
        },
      },
    });
  }

  setupStep6AddonsManager() {
    this.addonsStep = mountAddonsStep({
      state,
      actions: {
        notify: (msg, type) => this.showToast(msg, type),
        validateDebridKey,
        onUpdate: () => this.updateUI(),
      },
    });
  }

  async renderAddonsManager() {
    const container = document.getElementById('addonsManagerContainer');
    if (!container) return;

    if (!state.isManualMode && state.selectedProfileId && state.hasLoadedAddonsForProfile !== state.selectedProfileId) {
      container.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-[#ffd479]"></i>
          <p class="text-xs text-white/60">Cargando addons de tu cuenta de Nuvio...</p>
        </div>
      `;
      try {
        const addons = await NuvioClient.listAddons({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: state.nuvioAuth.accessToken,
          userId: state.nuvioAuth.userId,
          profileId: state.selectedProfileId,
        });
        state.setProfileAddons(addons, state.selectedProfileId);
      } catch (err) {
        console.warn('[AppController] Error cargando addons de perfil:', err);
      }
    }

    this.addonsStep?.render();
  }

  setupStep6Injection() {
    this.setupStep7Injection();
  }

  setupStep7Injection() {
    state.execution.mode = 'real';
    this.injectionStep = mountInjectionStep({
      state,
      actions: {
        notify: (msg, type) => this.showToast(msg, type),
        saveSession: () => this.saveSession(),
        onUpdate: () => {
          this.updateNavigationButtons();
          this.updateStep7ExecuteButton();
          this.updateManualModeButtons();
        },
        copyText: text => navigator.clipboard.writeText(text),
        copyBadgeJsonUrl: async () => {
          try {
            const packId = state.preferences.selectedBadgePack || 'tinted';
            const badgeUrl = getBadgePackUrl(packId);
            const pack = getBadgePackById(packId);
            await navigator.clipboard.writeText(badgeUrl);
            this.showToast(`✓ Enlace JSON de badges (${pack.name}) copiado al portapapeles`, 'success');
          } catch {
            this.showToast('No se pudo copiar automáticamente al portapapeles.', 'warning');
          }
        },
        copyCompiledBadgeJson: () => this.copyCompiledBadgeJson(),
        copyAioStreamsManifest: () => this.copyAioStreamsManifest(),
        downloadCollectionsJson: col => downloadCollectionsJson(col),
        downloadAioConfigJson: meta => downloadAioConfigJson(meta),
        downloadCompiledBadgeJson: () => this.downloadCompiledBadgeJson(),
        recordCompletion: () => recordSuccessfulCompletion().catch(() => {}),
        goToStep: stepNum => window.goToStep?.(stepNum),
        executePipeline: () => executePipeline(state, { nuvioClient: NuvioClient }),
        showCompletionModal: opt => this.showCompletionModal(opt),
        checkCompletion: () => {
          if (state.isManualMode && state.manualCopiedCollections && state.manualCopiedAio) {
            setTimeout(() => this.showCompletionModal({ isManual: true }), 600);
          }
        },
      },
    });
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
    if (eventType === 'LOG_ADDED') {
      const lastLog = state.execution.logs[state.execution.logs.length - 1];
      this.injectionStep?.handleLog(lastLog);
    } else if (eventType === 'EXECUTION_FINISHED') {
      this.injectionStep?.handleFinished({
        isCompleted: state.execution.isCompleted,
        profileName: state.selectedProfileName || 'Principal',
        error: state.execution.error,
      });
    } else if (eventType === 'STEP_UNLOCKED' || eventType === 'API_KEYS_VALIDATED' || eventType === 'API_KEYS_INVALIDATED') {
      this.updateUI();
    }
  }
}

export const appController = new AppController();
window.appController = appController;

whenDocumentReady(() => {
  appController.init();
});
