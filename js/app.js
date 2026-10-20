import { compileUniversalBadgeRules } from '../src/app/badge-compilation.js';
import { initializeWizard } from '../src/app/wizard-bootstrap.js';
import { whenDocumentReady } from '../src/shared/ui/when-document-ready.js';
import { mountApiKeysStep } from '../src/pages/configuration/steps/api-keys.js';
import { verifyWizardApiKeys } from '../src/app/api-key-validation.js';
import { mountAuthStep } from '../src/pages/configuration/steps/auth.js';
import { mountProfilesStep } from '../src/pages/configuration/steps/profiles.js';
import { authenticateWizard } from '../src/workflows/authenticate-wizard.js';
import { createWizardSessionStore } from '../src/workflows/wizard-session.js';
const wizardSessionStore = createWizardSessionStore({ key: 'nuvio_wizard_auth', storage: sessionStorage });
import { showToast as renderToast } from '../src/shared/ui/toast/render.js';
import { initPasswordToggles } from '../src/shared/ui/password-toggle.js';
/**
 * Controlador Principal de la Aplicación (UI y Eventos)
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { state, isAioMetadataAddon, isAioStreamsAddon } from '../src/app/wizard-state.js';
import { CONFIG } from '../src/app/config.js';
import { MiniNuvio } from '../src/app/mini-nuvio.js';
import { NuvioClient } from '../src/integrations/nuvio/client.js';
import { executePipeline, downloadCollectionsJson, downloadAioConfigJson } from '../src/app/provisioning.js';
import { compileStreamingConfig } from '../src/features/addons/index.js';
import { createStreamingConfiguration } from '../src/app/streaming-configuration.js';
import { validateDebridKey } from '../src/integrations/debrid/validate-key.js';
import { getBadgePackById, getBadgePackUrl } from '../src/features/badges/index.js';
import { mountPreferencesStep } from '../src/pages/configuration/steps/preferences.js';
import { mountAddonsStep } from '../src/pages/configuration/steps/addons.js';
import { mountInjectionStep } from '../src/pages/configuration/steps/injection.js';
import { setupStepperNavigation } from '../src/pages/configuration/stepper.js';
import { showCompletionModal } from '../src/pages/configuration/completion-modal.js';
import { initCompletionsCounterUI, recordSuccessfulCompletion } from '../src/app/completions.js';
import { formatFranchiseName } from '../src/features/avatars/index.js';
import {
  loadAvatarsCatalog,
  getCompiledAvatars,
  filterAvatars,
  resolveAvatarCdnUrl,
  getFranchisesSummary,
} from '../src/app/avatar-catalog.js';

// Catálogo de 30 títulos icónicos para la demostración sincronizada de carátulas (Paso 5)
import { DEMO_POSTERS } from '../src/features/posters/index.js';
export { DEMO_POSTERS };

class AppController {
  constructor() {
    this.miniNuvio = null;
    this.preferencesStep = null;
    this.addonsStep = null;
    this.injectionStep = null;
    this.stepper = null;
    this.profilePendingDelete = null;
    this.nextDemoPoster = this.nextDemoPoster.bind(this);
    this.prevDemoPoster = this.prevDemoPoster.bind(this);
  }

  async init() {
    return initializeWizard({ controller: this, state, MiniNuvio, loadAvatarsCatalog,
      initCounter: initCompletionsCounterUI });
  }

  /**
   * Muestra la Landing Page de Presentación inicial
   */
  showLandingView(updateHash = true) {
    const landing = document.getElementById('landingView');
    const wizard = document.getElementById('wizardView');
    if (!landing && wizard) {
      window.location.href = '../';
      return;
    }
    const btnText = document.getElementById('btnToggleWizardHeaderText');
    const btnIcon = document.querySelector('#btnToggleWizardHeader i');
    if (landing && wizard) {
      landing.classList.remove('hidden');
      wizard.classList.add('hidden');
      if (btnText) btnText.innerText = 'Iniciar Asistente';
      if (btnIcon) btnIcon.className = 'fa-solid fa-wand-magic-sparkles text-[11px]';
      if (updateHash && window.location.hash) {
        history.pushState('', document.title, window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Muestra el Asistente de Configuración (5 Pasos)
   */
  showWizardView(updateHash = true) {
    const landing = document.getElementById('landingView');
    const wizard = document.getElementById('wizardView');
    if (!landing && wizard) {
      wizard.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.updateUI();
      return;
    }
    const btnText = document.getElementById('btnToggleWizardHeaderText');
    const btnIcon = document.querySelector('#btnToggleWizardHeader i');
    if (landing && wizard) {
      landing.classList.add('hidden');
      wizard.classList.remove('hidden');
      if (btnText) btnText.innerText = 'Ver Presentación';
      if (btnIcon) btnIcon.className = 'fa-solid fa-house text-[11px]';
      if (updateHash) {
        window.location.hash = '#wizard';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.updateUI();
    }
  }

  /**
   * Alterna dinámicamente entre la Landing y el Asistente
   */
  toggleView() {
    const landing = document.getElementById('landingView');
    if (!landing) {
      window.location.href = '../';
      return;
    }
    if (!landing.classList.contains('hidden')) {
      this.showWizardView();
    } else {
      this.showLandingView();
    }
  }

  /**
   * Sistema de Notificaciones Flotantes (Toasts) Cinemático LAT-ADD
   * @param {string} message 
   * @param {'info' | 'success' | 'warning' | 'error'} type 
   * @param {number} duration 
   */
  showToast(message, type = 'info', duration = 3500) { return renderToast(message, { type, duration }); }

  /**
   * Inicializa manejadores universales para alternar visibilidad de contraseñas (ojito)
   */
  setupPasswordToggles() { return initPasswordToggles(); }

  saveSession() {
    if (!state.nuvioAuth.isAuthenticated || !state.nuvioAuth.accessToken) return;
    wizardSessionStore.write({ auth: state.nuvioAuth, profiles: state.profiles,
      selectedProfileId: state.selectedProfileId, selectedProfileName: state.selectedProfileName,
      newlyCreatedProfileIds: Array.from(state.newlyCreatedProfileIds || []),
      currentStep: state.currentStep, maxUnlockedStep: state.maxUnlockedStep });
  }

  restoreSession() {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const data = wizardSessionStore.read();
      if (data && data.auth && data.auth.isAuthenticated) {
        state.nuvioAuth = { ...state.nuvioAuth, ...data.auth };
        state.profiles = data.profiles || [];
        state.selectedProfileId = data.selectedProfileId || null;
        state.selectedProfileName = data.selectedProfileName || '';
        if (Array.isArray(data.newlyCreatedProfileIds)) {
          state.newlyCreatedProfileIds = new Set(data.newlyCreatedProfileIds.map(String));
        }

        state.maxUnlockedStep = Math.max(state.maxUnlockedStep, data.maxUnlockedStep || 2);
        state.currentStep = Math.max(state.currentStep, data.currentStep || 2);
        this.setAuthBadge(true);
        if (state.profiles.length > 0 && !state.selectedProfileId) {
          state.selectedProfileId = state.profiles[0].id;
          state.selectedProfileName = state.profiles[0].name || state.profiles[0].title || 'Principal';
          state.unlockStep(3);
        }
        this.updateProfileWarning(state.selectedProfileId, state.selectedProfileName);
      }
    } catch (_) {}
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
      authenticate: ({ mode, credentials, signal }) => authenticateWizard({ mode, credentials, client: NuvioClient,
        context: { apiUrl: CONFIG.NUVIO_API_URL, apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY, signal } }),
      onCredentials: ({ email, password }) => {
        state.nuvioAuth.email = email;
        state.nuvioAuth.password = password;
        this.updateNavigationButtons();
      },
      onAuthenticated: ({ auth, profiles, email }) => {
        state.isManualMode = false;
        Object.assign(state.nuvioAuth, { accessToken: auth.accessToken, userId: auth.userId, expiresAt: auth.expiresAt,
          isAuthenticated: true, apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY, email, password: '' });
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
      onFailure: () => this.setAuthBadge(false)
    });
  }

  setAuthBadge(connected) {
    const badge = document.getElementById('authStatusBadge');
    if (!badge) return;
    if (connected) {
      badge.className = "text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5";
      badge.innerHTML = '<i class="fa-solid fa-check"></i> Conectado';
    } else {
      badge.className = "text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5";
      badge.innerHTML = '<i class="fa-solid fa-circle text-[8px]"></i> No autenticado';
    }
  }

  openNewProfileModal() {
    this.profilesStep?.openNewModal?.();
  }

  closeNewProfileModal() {}

  promptDeleteProfile(profileId, profileName) {
    this.profilesStep?.promptDelete?.(profileId, profileName);
  }

  setupStep2Profiles() {
    this.disposeProfilesStep?.();
    this.profilesStep = mountProfilesStep({
      state,
      actions: {
        createProfile: async ({ name, avatarUrl }) => {
          const newProfile = await NuvioClient.createProfile({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: state.nuvioAuth.accessToken,
            userId: state.nuvioAuth.userId,
            name,
            avatarUrl: avatarUrl || null,
          });
          state.newlyCreatedProfileIds.add(String(newProfile.id));
          state.profiles.push(newProfile);
          state.selectedProfileId = newProfile.id;
          state.selectedProfileName = newProfile.name || name;
          state.unlockStep(3);
          this.saveSession();
          this.updateUI();
          return newProfile;
        },
        deleteProfile: async (profileId) => {
          const deleteResult = await NuvioClient.deleteProfile({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: state.nuvioAuth.accessToken,
            userId: state.nuvioAuth.userId,
            profileId,
          });
          if (Array.isArray(deleteResult?.remainingProfiles)) {
            state.profiles = deleteResult.remainingProfiles;
          } else {
            state.profiles = (state.profiles || []).filter(p => String(p.id) !== String(profileId));
          }
          if (String(state.selectedProfileId) === String(profileId)) {
            if (state.profiles.length > 0) {
              state.selectedProfileId = state.profiles[0].id;
              state.selectedProfileName = state.profiles[0].name || state.profiles[0].title || 'Principal';
              state.unlockStep(3);
            } else {
              state.selectedProfileId = null;
              state.selectedProfileName = '';
            }
          }
          this.saveSession();
          this.updateUI();
          return deleteResult;
        },
        onSelectProfile: (id, name) => {
          state.selectedProfileId = id;
          state.selectedProfileName = name;
          state.unlockStep(3);
          this.saveSession();
          this.updateUI();
        },
        checkProfileHasAio: async (profileId) => {
          if (state.hasLoadedAddonsForProfile === profileId && state.existingAioAddon) return true;
          if (!state.nuvioAuth?.accessToken) return false;
          const addons = await NuvioClient.listAddons({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: state.nuvioAuth.accessToken,
            userId: state.nuvioAuth.userId,
            profileId,
          });
          const hasAio = (addons || []).some(isAioMetadataAddon);
          if (state.hasLoadedAddonsForProfile !== profileId) {
            state.setProfileAddons(addons, profileId);
          }
          return hasAio;
        },
        loadAvatars: loadAvatarsCatalog,
        filterAvatars,
        getFranchises: getFranchisesSummary,
        resolveCdnUrl: resolveAvatarCdnUrl,
        notify: (message, type) => this.showToast(message, type),
      },
    });
  }

  renderProfiles() {
    this.profilesStep?.render();
  }

  updateProfileWarning(id, name) {
    this.profilesStep?.updateWarning(id, name);
  }

  selectProfile(id, name) {
    state.selectedProfileId = id;
    state.selectedProfileName = name;
    state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
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
      notify: (message, type) => this.showToast(message, type)
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

  selectPosterEngine(engine) {
    this.preferencesStep?.selectPosterEngine?.(engine);
  }

  toggleCustomUrlInput(engine) {
    this.preferencesStep?.toggleCustomUrlInput?.(engine);
  }

  renderBadgeModulesUI() {
    this.preferencesStep?.renderBadgeModulesUI?.();
  }

  toggleBadgeModule(id, chk) {
    this.preferencesStep?.toggleBadgeModule?.(id, chk);
  }

  moveBadgeModule(id, delta) {
    this.preferencesStep?.moveBadgeModule?.(id, delta);
  }

  selectBadgePack(id) {
    this.preferencesStep?.selectBadgePack?.(id);
  }

  copyBadgeJsonUrl(id) {
    return this.preferencesStep?.copyBadgeJsonUrl?.(id);
  }

  getCompiledBadgeRulesJson(id) {
    return this.preferencesStep?.getCompiledBadgeRulesJson?.(id);
  }

  copyCompiledBadgeJson(id) {
    return this.preferencesStep?.copyCompiledBadgeJson?.(id);
  }

  downloadCompiledBadgeJson(id) {
    return this.preferencesStep?.downloadCompiledBadgeJson?.(id);
  }

  handleImportCustomBadge() {
    return this.preferencesStep?.handleImportCustomBadge?.();
  }

  renderBadgesGrid() {
    this.preferencesStep?.renderBadgesGrid?.();
  }

  handleBadgeImgLoaded(img) {
    this.preferencesStep?.handleBadgeImgLoaded?.(img);
  }

  fitBadgesDynamically() {
    this.preferencesStep?.fitBadgesDynamically?.();
  }

  updateStep5PosterPreviews() {
    this.preferencesStep?.updatePosterPreviews?.();
  }

  startPosterRotation() {
    this.preferencesStep?.startPosterRotation?.();
  }

  stopPosterRotation() {
    this.preferencesStep?.stopPosterRotation?.();
  }

  nextDemoPoster() {
    this.preferencesStep?.nextDemoPoster?.();
  }

  prevDemoPoster() {
    this.preferencesStep?.prevDemoPoster?.();
  }

  updatePosterCardsUI() {
    this.preferencesStep?.updateUI();
  }

  updatePreferencesUI() {
    this.preferencesStep?.updateUI();
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
          profileId: state.selectedProfileId
        });
        state.setProfileAddons(addons, state.selectedProfileId);
      } catch (err) {
        console.warn('[AppController] Error cargando addons de perfil:', err);
      }
    }

    this.addonsStep?.render();
  }

  renderAddonsList() {
    this.addonsStep?.render();
  }

  moveAddon(index, direction) {
    this.addonsStep?.moveAddon(index, direction);
  }

  removeAddon(index) {
    this.addonsStep?.removeAddon(index);
  }

  openAddAddonModal(defaultUrl = '') {
    this.addonsStep?.openAddModal(defaultUrl);
  }

  closeAddAddonModal() {
    this.addonsStep?.closeAddAddonModal();
  }

  openAioStreamsDebridsModal() {
    this.addonsStep?.openAioStreamsDebridsModal();
  }

  closeAioStreamsDebridsModal() {
    this.addonsStep?.closeAioStreamsDebridsModal();
  }

  validateDebridKeys() {
    return this.addonsStep?.validateDebridKeys();
  }

  installAioStreamsFromModal() {
    return this.addonsStep?.installAioStreamsFromModal();
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
    const hasPassword = Boolean(state.aiometadata?.password && state.aiometadata.password.length >= 6);
    if (!hasPassword) {
      this.showToast('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
      document.getElementById('aioPassword')?.focus();
      return;
    }
    const btn = document.getElementById('btnCopyAioStreamsManifest');
    const originalHtml = btn?.innerHTML;
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-cyan-400"></i><span>Generando...</span>';
      }
      let manifestUrl = state.aiostreams.manifestUrl;
      if (!manifestUrl) {
        this.showToast('Generando manifest de AIOStreams en la instancia oficial...', 'info');
        let template = state.rawAioStreamsTemplate;
        if (!template) {
          const res = await fetch(`${CONFIG.TEMPLATES.AIOSTREAMS}?v=${Date.now()}`);
          template = await res.json();
          state.rawAioStreamsTemplate = template;
        }
        const aioConfig = compileStreamingConfig(template, state.aiostreams.debrids);
        const res = await createStreamingConfiguration(CONFIG.AIOSTREAMS_INSTANCE, aioConfig, state.aiometadata.password.trim());
        manifestUrl = res.manifestUrl;
        state.aiostreams.manifestUrl = manifestUrl;
      }
      await navigator.clipboard.writeText(manifestUrl);
      this.showToast('✓ Enlace del Manifiesto de AIOStreams copiado al portapapeles', 'success');
    } catch (err) {
      this.showToast(`Error al generar o copiar AIOStreams: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
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

// Instanciar y exportar
export const appController = new AppController();
window.appController = appController;

whenDocumentReady(() => {
  appController.init();
});
