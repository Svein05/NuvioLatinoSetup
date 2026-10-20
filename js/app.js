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
import { renderVerifiedKeyStatus, renderUnverifiedKeyStatus } from '../src/shared/ui/verified-key-status.js';
import { mountPreferencesStep } from '../src/pages/configuration/steps/preferences.js';
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
    const drawer = document.getElementById('indexDrawer');
    const overlay = document.getElementById('indexDrawerOverlay');
    const btnOpen = document.getElementById('btnOpenIndex');
    const btnClose = document.getElementById('btnCloseIndex');

    const openDrawer = () => {
      if (drawer) drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    };

    const closeDrawer = () => {
      if (drawer) drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    };

    if (btnOpen) btnOpen.addEventListener('click', openDrawer);
    if (btnClose) btnClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    window.goToStep = (targetStep) => {
      if (targetStep === state.currentStep) {
        closeDrawer();
        return;
      }

      // En modo manual, el paso 2 de perfiles está omitido
      if (state.isManualMode && targetStep === 2) {
        this.showToast('En modo sin cuenta, el paso 2 de perfiles está omitido.', 'info');
        return;
      }

      // Retroceder siempre está permitido para revisar datos previos
      if (targetStep < state.currentStep) {
        state.currentStep = targetStep;
        closeDrawer();
        this.updateUI();
        return;
      }

      // En modo manual, permitir avanzar desde el paso 1 al paso 3
      if (state.isManualMode && state.currentStep === 1 && targetStep === 3) {
        state.unlockStep(3);
        state.currentStep = 3;
        closeDrawer();
        this.updateUI();
        return;
      }

      // Restricción: avanzar estrictamente un paso a la vez (+1)
      if (targetStep > state.currentStep + 1) {
        this.showToast('Solo puedes avanzar un paso a la vez tras completar el actual.', 'warning');
        return;
      }

      // Avanzar al paso inmediatamente siguiente: validar el paso actual
      const val = state.validateStep(state.currentStep);
      if (!val.valid) {
        this.showToast(val.error, 'warning');
        return;
      }

      state.unlockStep(targetStep);
      state.currentStep = targetStep;
      closeDrawer();
      this.updateUI();
    };

    window.changeStep = (delta) => {
      // Retroceder
      if (delta < 0) {
        if (state.isManualMode && state.currentStep === 3) {
          state.currentStep = 1;
          this.updateUI();
          return;
        }
        const prev = state.currentStep + delta;
        if (prev >= 1) {
          state.currentStep = prev;
          this.updateUI();
        }
        return;
      }

      // Avanzar: validar paso actual
      const val = state.validateStep(state.currentStep);
      if (!val.valid) {
        this.showToast(val.error, 'warning');
        return;
      }

      if (state.isManualMode && state.currentStep === 1) {
        state.unlockStep(3);
        state.currentStep = 3;
        this.updateUI();
        return;
      }

      const next = state.currentStep + delta;
      if (next > state.totalSteps) return;

      state.unlockStep(next);
      state.currentStep = next;
      this.updateUI();
    };
  }

  updateUI() {
    const { currentStep, totalSteps, maxUnlockedStep } = state;

    // Cambiar visibilidad de los paneles de contenido
    for (let i = 1; i <= totalSteps; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) {
        el.classList.toggle('active', i === currentStep);
      }
    }

    // Actualizar items del Drawer lateral (Índice de Pasos)
    for (let i = 1; i <= totalSteps; i++) {
      const item = document.getElementById(`drawer-step-${i}`);
      if (!item) continue;

      if (state.isManualMode && i === 2) {
        item.className = "drawer-step-item opacity-40 cursor-not-allowed";
        item.title = "Paso omitido en modo manual (sin cuenta de Nuvio)";
        const statusIcon = item.querySelector('.drawer-status-icon');
        if (statusIcon) statusIcon.className = "fa-solid fa-ban text-slate-500 text-[10px] drawer-status-icon";
        continue;
      }

      const isCurrent = (i === currentStep);
      const isUnlocked = (i <= maxUnlockedStep);
      const statusIcon = item.querySelector('.drawer-status-icon');

      if (isCurrent) {
        item.className = "drawer-step-item active";
        if (statusIcon) statusIcon.className = "drawer-status-icon hidden";
      } else if (i < currentStep) {
        // Pasos anteriores completados
        item.className = "drawer-step-item completed";
        if (statusIcon) statusIcon.className = "fa-solid fa-circle-check text-emerald-400 text-xs drawer-status-icon";
      } else if (isUnlocked) {
        // Paso desbloqueado disponible
        item.className = "drawer-step-item completed";
        if (statusIcon) statusIcon.className = "drawer-status-icon hidden";
      } else {
        // Paso bloqueado
        item.className = "drawer-step-item locked";
        if (statusIcon) statusIcon.className = "fa-solid fa-lock text-slate-500 text-[10px] drawer-status-icon";
      }
    }

    // Controles superiores
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const stepCounter = document.getElementById('stepCounter');
    const drawerStepCounter = document.getElementById('drawerStepCounter');

    if (btnBack) btnBack.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.display = (currentStep === totalSteps) ? 'none' : 'flex';
    if (stepCounter) stepCounter.innerText = `Paso ${currentStep} de ${totalSteps}`;
    if (drawerStepCounter) drawerStepCounter.innerText = `Paso ${currentStep} de ${totalSteps}`;

    // Si estamos en el paso 2, 3, 5, 6 o 7, refrescar o sincronizar vistas
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
      const manualContainer = document.getElementById('manualModeContainer');
      const btnExec = document.getElementById('btnExecutePipeline');
      if (state.isManualMode) {
        if (manualContainer) manualContainer.classList.remove('hidden');
        if (btnExec) {
          btnExec.classList.add('hidden');
          btnExec.style.display = 'none';
        }
        this.updateManualModeButtons();
      } else {
        if (manualContainer) manualContainer.classList.add('hidden');
        if (btnExec) {
          btnExec.classList.remove('hidden');
          btnExec.style.display = 'flex';
        }
      }
      const aioPassEl = document.getElementById('aioPassword');
      if (aioPassEl) {
        if (!aioPassEl.value && state.aiometadata?.password) {
          aioPassEl.value = state.aiometadata.password;
        } else if (aioPassEl.value && !state.aiometadata?.password) {
          state.aiometadata.password = aioPassEl.value.trim();
        }
      }

      this.refreshStep7Summary();
      this.updateStep7ExecuteButton();
      this.setupPasswordToggles();
    }

    // Rotación sincronizada de demostración activa exclusivamente en el Paso 5
    if (currentStep !== 5) {
      this.stopPosterRotation();
    }

    // Actualizar estilo reactivo del botón Siguiente
    this.updateNavigationButtons();
  }

  updateNavigationButtons() {
    const btnNext = document.getElementById('btnNext');
    if (!btnNext) return;

    const val = state.validateStep(state.currentStep);
    if (val.valid) {
      btnNext.disabled = false;
      btnNext.className = "lat-capsule-btn solid text-xs py-1.5 px-4 shadow-[var(--shadow-lift)] cursor-pointer flex items-center gap-1.5";
      btnNext.title = "Avanzar al siguiente paso";
    } else {
      btnNext.disabled = true;
      btnNext.className = "lat-capsule-btn glass opacity-40 text-xs py-1.5 px-4 cursor-not-allowed flex items-center gap-1.5";
      btnNext.title = val.error || "Completa este paso para continuar";
    }
  }

  updateStep6ExecuteButton() {
    this.updateStep7ExecuteButton();
  }

  updateStep7ExecuteButton() {
    const btnExecute = document.getElementById('btnExecutePipeline');
    if (!btnExecute) return;

    // En modo manual, este botón NUNCA se muestra
    if (state.isManualMode) {
      btnExecute.classList.add('hidden');
      btnExecute.style.display = 'none';
      return;
    }

    btnExecute.classList.remove('hidden');
    btnExecute.style.display = 'flex';

    const passwordInput = document.getElementById('aioPassword');
    const rawVal = ((passwordInput ? passwordInput.value : '') || state.aiometadata?.password || '').trim();

    // Sincronizar reactivamente si el DOM contiene un valor pero el estado aún no
    if (rawVal && state.aiometadata.password !== rawVal) {
      state.aiometadata.password = rawVal;
    }

    const hasPassword = Boolean(rawVal && rawVal.length >= 6);
    if (hasPassword) {
      btnExecute.disabled = false;
      btnExecute.className = "lat-capsule-btn solid px-7 py-3 text-sm flex items-center gap-2 shadow-[var(--shadow-lift)] cursor-pointer";
      btnExecute.title = "Ejecutar la inyección y configuración automática";
    } else {
      btnExecute.disabled = true;
      btnExecute.className = "lat-capsule-btn glass opacity-40 px-7 py-3 text-sm flex items-center gap-2 cursor-not-allowed shadow-none";
      btnExecute.title = "Ingresa o genera una contraseña maestra (mínimo 6 caracteres) para activar";
    }
  }

  updateManualModeButtons() {
    const btnCopyAio = document.getElementById('btnCopyAioConfig');
    const btnDownloadAio = document.getElementById('btnDownloadAioConfig');
    const btnCopyBadge = document.getElementById('btnCopyBadgeUrl');
    const btnCopyBadgeCompiled = document.getElementById('btnCopyBadgeCompiledJson');
    const btnDownloadBadges = document.getElementById('btnDownloadBadges');
    const btnCopyAioStreams = document.getElementById('btnCopyAioStreamsManifest');
    const isBadgesEnabled = Boolean(state.preferences && state.preferences.badgesEnabled);
    const isAioStreamsInstalled = Boolean(state.aiostreams?.installed || (state.profileAddons || []).some(a => a.isAioStreams));

    if (btnCopyBadge) {
      if (isBadgesEnabled) {
        btnCopyBadge.classList.remove('hidden');
      } else {
        btnCopyBadge.classList.add('hidden');
      }
    }

    if (btnCopyBadgeCompiled) {
      if (isBadgesEnabled) {
        btnCopyBadgeCompiled.classList.remove('hidden');
      } else {
        btnCopyBadgeCompiled.classList.add('hidden');
      }
    }

    if (btnDownloadBadges) {
      if (isBadgesEnabled) {
        btnDownloadBadges.classList.remove('hidden');
      } else {
        btnDownloadBadges.classList.add('hidden');
      }
    }

    if (btnCopyAioStreams) {
      if (isAioStreamsInstalled) {
        btnCopyAioStreams.classList.remove('hidden');
      } else {
        btnCopyAioStreams.classList.add('hidden');
      }
    }

    if (!btnCopyAio) return;

    const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 6);

    if (hasPassword) {
      btnCopyAio.disabled = false;
      btnCopyAio.className = "lat-capsule-btn solid text-xs py-2 px-4 shadow-[var(--shadow-lift)] flex items-center gap-2 cursor-pointer";
      btnCopyAio.title = "Copiar JSON de configuración de AIOMetadata";
      if (btnDownloadAio) {
        btnDownloadAio.disabled = false;
        btnDownloadAio.className = "lat-capsule-btn glass px-4 py-3 text-xs flex items-center gap-2 cursor-pointer";
      }
    } else {
      btnCopyAio.disabled = true;
      btnCopyAio.className = "lat-capsule-btn glass opacity-40 text-xs py-2 px-4 cursor-not-allowed flex items-center gap-2 shadow-none";
      btnCopyAio.title = "Ingresa una contraseña para tus addons (mínimo 6 caracteres) primero";
      if (btnDownloadAio) {
        btnDownloadAio.disabled = true;
        btnDownloadAio.className = "lat-capsule-btn glass opacity-40 px-4 py-3 text-xs flex items-center gap-2 cursor-not-allowed";
      }
    }
  }

  showCompletionModal({ isManual = false, profileName = 'Principal' } = {}) {
    const modal = document.getElementById('completionModal');
    const titleEl = document.getElementById('completionModalTitle');
    const msgEl = document.getElementById('completionModalMessage');
    const btnClose = document.getElementById('btnCloseCompletionModal');

    if (!modal) return;

    if (isManual) {
      // Registrar finalización exitosa en el contador global para modo manual
      recordSuccessfulCompletion().catch(err => {
        console.warn('[AppController] Error actualizando contador de configuraciones:', err);
      });

      if (titleEl) titleEl.innerText = "¡Archivos JSON Listos!";
      if (msgEl) {
        msgEl.innerHTML = `
          <p class="font-medium text-slate-200">¡Listo! Has copiado con éxito ambos archivos JSON (Colecciones y Metadata).</p>
          <p class="mt-1.5 text-slate-400">Ahora solo tienes que ingresar manualmente los JSON dentro de Nuvio en un nuevo perfil y agregar tus addons de Streams preferidos :D</p>
        `;
      }
    } else {
      if (titleEl) titleEl.innerText = "¡Configuración Exitosa!";
      if (msgEl) {
        msgEl.innerHTML = `
          <p class="font-medium text-slate-200">¡Listo! Todo debería estar correctamente importado y configurado en el perfil <strong class="text-brand-400 font-bold">"${profileName}"</strong> de tu cuenta Nuvio.</p>
          <p class="mt-1.5 text-slate-400">Ahora solo tienes que agregar tus addons de Streams preferidos :D</p>
        `;
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const closeModal = () => {
      modal.classList.remove('flex');
      modal.classList.add('hidden');
    };

    if (btnClose) {
      btnClose.onclick = closeModal;
    }

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
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
    const btnOpenModal = document.getElementById('btnOpenAddAddonModal');
    const modal = document.getElementById('modalAddAddon');
    const btnCloseModal = document.getElementById('btnCloseAddAddonModal');
    const btnCancelModal = document.getElementById('btnCancelAddAddon');
    const btnConfirmModal = document.getElementById('btnConfirmAddAddon');
    const urlInput = document.getElementById('inputAddonManifestUrl');

    if (btnOpenModal) {
      btnOpenModal.addEventListener('click', () => this.openAddAddonModal());
    }
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => this.closeAddAddonModal());
    }
    if (btnCancelModal) {
      btnCancelModal.addEventListener('click', () => this.closeAddAddonModal());
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeAddAddonModal();
      });
    }
    if (btnConfirmModal) {
      btnConfirmModal.addEventListener('click', () => this.handleAddAddonConfirm());
    }
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddAddonConfirm();
        }
      });
    }

    // --- Modal de Confirmación de Borrado de Addon ---
    const modalConfirmRemove = document.getElementById('modalConfirmRemoveAddon');
    const btnCloseConfirmRemove = document.getElementById('btnCloseConfirmRemoveAddonModal');
    const btnCancelConfirmRemove = document.getElementById('btnCancelConfirmRemoveAddon');
    const btnAcceptConfirmRemove = document.getElementById('btnAcceptConfirmRemoveAddon');

    if (btnCloseConfirmRemove) {
      btnCloseConfirmRemove.addEventListener('click', () => this.closeConfirmRemoveAddonModal());
    }
    if (btnCancelConfirmRemove) {
      btnCancelConfirmRemove.addEventListener('click', () => this.closeConfirmRemoveAddonModal());
    }
    if (btnAcceptConfirmRemove) {
      btnAcceptConfirmRemove.addEventListener('click', () => this.executeConfirmRemoveAddon());
    }
    if (modalConfirmRemove) {
      modalConfirmRemove.addEventListener('click', (e) => {
        if (e.target === modalConfirmRemove) this.closeConfirmRemoveAddonModal();
      });
    }

    // --- Flujo de AIOStreams y Modal de Conflicto ---
    const btnOpenAioModal = document.getElementById('btnOpenAddAioStreamsModal');
    const modalAioConflict = document.getElementById('modalAioStreamsConflict');
    const btnCancelAioConflict = document.getElementById('btnCancelAioStreamsConflict');
    const btnConfirmAioConflict = document.getElementById('btnConfirmAioStreamsConflict');

    if (btnOpenAioModal) {
      btnOpenAioModal.addEventListener('click', () => this.handleOpenAddAioStreamsClick());
    }
    if (btnCancelAioConflict) {
      btnCancelAioConflict.addEventListener('click', () => this.closeAioStreamsConflictModal());
    }
    if (btnConfirmAioConflict) {
      btnConfirmAioConflict.addEventListener('click', () => this.confirmAioStreamsReplacement());
    }
    if (modalAioConflict) {
      modalAioConflict.addEventListener('click', (e) => {
        if (e.target === modalAioConflict) this.closeAioStreamsConflictModal();
      });
    }

    const modalAioReq = document.getElementById('modalAioStreamsRequirement');
    const btnCancelAioReq = document.getElementById('btnCancelAioStreamsReq');
    const btnAcceptAioReq = document.getElementById('btnAcceptAioStreamsReq');
    if (btnCancelAioReq) {
      btnCancelAioReq.addEventListener('click', () => this.closeAioStreamsRequirementModal());
    }
    if (btnAcceptAioReq) {
      btnAcceptAioReq.addEventListener('click', () => this.openAioStreamsDebridsModal());
    }
    if (modalAioReq) {
      modalAioReq.addEventListener('click', (e) => {
        if (e.target === modalAioReq) this.closeAioStreamsRequirementModal();
      });
    }

    // --- Modal de Formulario de API Keys Debrid para AIOStreams ---
    const modalAioDebrids = document.getElementById('modalAioStreamsDebrids');
    const btnCloseAioDebrids = document.getElementById('btnCloseAioStreamsDebridsModal');
    const btnCancelAioDebrids = document.getElementById('btnCancelAioStreamsDebrids');
    const btnValidateDebrids = document.getElementById('btnValidateDebridKeys');
    const btnInstallAio = document.getElementById('btnInstallAioStreams');

    if (btnCloseAioDebrids) {
      btnCloseAioDebrids.addEventListener('click', () => this.closeAioStreamsDebridsModal());
    }
    if (btnCancelAioDebrids) {
      btnCancelAioDebrids.addEventListener('click', () => this.closeAioStreamsDebridsModal());
    }
    if (modalAioDebrids) {
      modalAioDebrids.addEventListener('click', (e) => {
        if (e.target === modalAioDebrids) this.closeAioStreamsDebridsModal();
      });
    }

    if (btnValidateDebrids) {
      btnValidateDebrids.addEventListener('click', () => this.validateDebridKeys());
    }
    if (btnInstallAio) {
      btnInstallAio.addEventListener('click', () => this.installAioStreamsFromModal());
    }

    // Escuchar cambios en los inputs para invalidar validación previa, restaurar enlace y actualizar botón de instalar
    const debridIds = ['Torbox', 'Alldebrid', 'Realdebrid', 'Premiumize', 'Debridlink', 'Easydebrid', 'Debrider', 'Torrin', 'Offcloud'];
    const debridLinks = {
      Torbox: 'https://torbox.app/settings',
      Alldebrid: 'https://alldebrid.com/apikeys',
      Realdebrid: 'https://real-debrid.com/apitoken',
      Premiumize: 'https://www.premiumize.me/account',
      Debridlink: 'https://debrid-link.com/webapp/apikey'
    };
    debridIds.forEach(id => {
      const input = document.getElementById(`inputDebrid${id}`);
      if (input) {
        input.addEventListener('input', () => {
          const key = id.toLowerCase();
          if (this._aioStreamsDraft) {
            delete this._aioStreamsDraft.validatedKeys[key];
            delete this._aioStreamsDraft.debrids[key];
          }
          const statusEl = document.getElementById(`statusDebrid${id}`);
          if (statusEl) {
            if (debridLinks[id]) {
              statusEl.innerHTML = `<a href="${debridLinks[id]}" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white underline flex items-center gap-1" title="Obtener clave"><span class="hidden sm:inline">Obtener clave</span> <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>`;
            } else {
              statusEl.innerHTML = '';
            }
          }
          this.updateInstallAioStreamsBtnState();
        });
      }
    });
  }

  /**
   * Intenta obtener información del manifest de un addon (nombre y logo oficial)
   */
  async fetchManifestInfo(manifestUrl) {
    if (!manifestUrl) return null;
    if (!this.manifestCache) this.manifestCache = new Map();

    let cleanUrl = String(manifestUrl).trim();
    if (cleanUrl.startsWith('stremio://')) {
      cleanUrl = 'https://' + cleanUrl.slice(10);
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    if (!cleanUrl.includes('.json') && !cleanUrl.endsWith('manifest.json')) {
      cleanUrl = cleanUrl.replace(/\/+$/, '') + '/manifest.json';
    }

    if (this.manifestCache.has(cleanUrl)) {
      return this.manifestCache.get(cleanUrl);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(cleanUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const info = {
        name: data.name || data.id || null,
        logo: data.logo || data.icon || null,
        description: data.description || null
      };
      this.manifestCache.set(cleanUrl, info);
      return info;
    } catch (_) {
      // Fallback silencioso en caso de CORS o offline
      return null;
    }
  }

  /**
   * Proveedor de logos conocidos para addons populares en caso de fallo de red/CORS
   */
  getAddonFallbackLogo(url = '', name = '') {
    const lowerUrl = String(url || '').toLowerCase();
    const lowerName = String(name || '').toLowerCase();

    if (lowerUrl.includes('aiostreams') || lowerName.includes('aiostreams')) {
      return 'https://aiostreams.am/logo.png';
    }
    if (lowerUrl.includes('lat-add') || lowerUrl.includes('latadd') || lowerName.includes('lat-add') || lowerName.includes('latadd')) {
      return 'https://lat-add.midnightignite.me/logo.png';
    }
    if (lowerUrl.includes('torrentio') || lowerName.includes('torrentio')) {
      return 'https://torrentio.strem.fun/images/logo.png';
    }
    if (lowerUrl.includes('torbox') || lowerName.includes('torbox')) {
      return 'https://stremio.torbox.app/logo.png';
    }
    if (lowerUrl.includes('cinetorrent') || lowerName.includes('cinetorrent')) {
      return 'https://cinetorrent.midnightignite.me/logo.png';
    }
    if (lowerUrl.includes('subtitles') || lowerName.includes('opensubtitles')) {
      return 'https://www.opensubtitles.com/favicon.ico';
    }
    return null;
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

    this.renderAddonsList();
    this.enrichProfileAddonsManifests();
  }

  /**
   * Enriquecimiento en segundo plano de logos y nombres desde manifests oficiales
   */
  async enrichProfileAddonsManifests() {
    const addonsToFetch = (state.profileAddons || []).filter(a => !a.logo && (a.manifest_url || a.url));
    if (addonsToFetch.length === 0) return;

    let updatedAny = false;
    await Promise.allSettled(addonsToFetch.map(async (addon) => {
      const url = addon.manifest_url || addon.url;
      const fallbackLogo = this.getAddonFallbackLogo(url, addon.name);
      if (fallbackLogo && !addon.logo) {
        addon.logo = fallbackLogo;
        updatedAny = true;
      }

      const info = await this.fetchManifestInfo(url);
      if (info) {
        if (info.logo && addon.logo !== info.logo) {
          addon.logo = info.logo;
          updatedAny = true;
        }
        if (info.name && (!addon.name || addon.name.startsWith('Addon '))) {
          addon.name = info.name;
          updatedAny = true;
        }
      }
    }));

    if (updatedAny) {
      this.renderAddonsList();
    }
  }

  renderAddonsList() {
    const container = document.getElementById('addonsManagerContainer');
    if (!container) return;

    const addons = state.profileAddons || [];

    const escapeText = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Tarjeta Anclada de AIOMetadata en posición #1
    let html = `
      <div class="p-3.5 sm:p-4 rounded-[20px] bg-white/[0.05] border-2 border-[#ffd479]/40 shadow-[0_0_20px_rgba(255,212,121,0.12)] flex items-center justify-between gap-3 select-none transition-all">
        <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <!-- Posición #1 en grande a la extrema izquierda -->
          <span class="text-2xl sm:text-3xl font-mono font-bold text-[#ffd479] min-w-[2.5rem] sm:min-w-[3rem] text-center select-none shrink-0 tracking-tight">#1</span>

          <!-- Logo oficial de AIOMetadata -->
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
            <img src="https://raw.githubusercontent.com/cedya77/aiometadata/main/assets/logo.png" 
                 alt="AIOMetadata" 
                 class="w-full h-full object-cover" 
                 onerror="this.onerror=null; this.src='https://aiometadatafortheweebs.midnightignite.me/logo.png';">
          </div>

          <!-- Título y descripción -->
          <div class="min-w-0 flex-1">
            <h4 class="font-bold text-sm sm:text-base text-white truncate tracking-wide">AIOMetadata Latino</h4>
            <p class="text-[11px] sm:text-xs text-white/50 truncate mt-0.5">
              Addon Principal de Metadatos: catálogos, sinopsis, calificaciones y pósters en español latino.
            </p>
          </div>
        </div>

        <div class="shrink-0 flex items-center">
          <div class="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 flex items-center justify-center text-xs" title="AIOMetadata siempre permanece en la posición #1">
            <i class="fa-solid fa-lock text-[11px]"></i>
          </div>
        </div>
      </div>
    `;

    // Tarjetas para cada uno de los addons secundarios
    if (addons.length > 0) {
      addons.forEach((addon, idx) => {
        const pos = idx + 2;
        const isFirstSecondary = idx === 0;
        const isLastSecondary = idx === addons.length - 1;
        const isAioStreams = Boolean(addon.isAioStreams);
        const name = isAioStreams ? 'AIOStreams' : (addon.name || `Addon ${pos}`);
        const url = addon.manifest_url || addon.url || '';
        const logoUrl = isAioStreams
          ? 'https://numb3rs.stream/assets/images/aiostreams.svg'
          : (addon.logo || this.getAddonFallbackLogo(url, name));
        const initials = isAioStreams ? 'AS' : ((name.replace(/[^a-zA-Z0-9]/g, '') || 'AD').slice(0, 2).toUpperCase());

        const logoHtml = logoUrl
          ? `<img src="${escapeText(logoUrl)}" alt="${escapeText(name)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center font-bold text-white/70 text-xs bg-white/[0.08]\\'>${escapeText(initials)}</div>';">`
          : `<div class="w-full h-full flex items-center justify-center font-bold text-white/70 text-xs bg-white/[0.08]">${escapeText(initials)}</div>`;

        let titleAndDescHtml = '';
        if (isAioStreams) {
          const debridsMap = addon.debrids || state.aiostreams.debrids || {};
          const activeDebrids = Object.keys(debridsMap).filter(k => debridsMap[k]);
          const debridsStr = activeDebrids.length > 0 ? activeDebrids.map(d => d.toUpperCase()).join(', ') : 'Sin debrids';
          titleAndDescHtml = `
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-semibold text-sm sm:text-base text-white truncate">AIOStreams Latino</h4>
              </div>
              <p class="text-[10px] sm:text-[11px] text-white/50 truncate mt-0.5">
                <span class="text-emerald-400 font-medium">Debrids: ${escapeText(debridsStr)}</span> • El manifiesto se generará con tu clave maestra en el Paso 7
              </p>
            </div>
          `;
        } else {
          titleAndDescHtml = `
            <div class="min-w-0 flex-1">
              <h4 class="font-semibold text-sm sm:text-base text-white truncate">${escapeText(name)}</h4>
              <p class="text-[10px] sm:text-[11px] font-mono text-white/40 truncate mt-0.5 select-all" title="${escapeText(url)}">
                ${escapeText(url || 'Sin URL de manifiesto')}
              </p>
            </div>
          `;
        }

        html += `
          <div class="p-3.5 sm:p-4 rounded-[18px] bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] flex items-center justify-between gap-3 transition-all duration-150">
            <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <!-- Posición en grande a la extrema izquierda -->
              <span class="text-2xl sm:text-3xl font-mono font-bold text-white/40 min-w-[2.5rem] sm:min-w-[3rem] text-center select-none shrink-0 tracking-tight">#${pos}</span>

              <!-- Logo del Addon -->
              <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.06] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                ${logoHtml}
              </div>

              <!-- Nombre y URL o información de Debrids -->
              ${titleAndDescHtml}
            </div>
            
            <div class="shrink-0 flex items-center gap-1.5">
              ${isAioStreams ? `
                <!-- Editar Debrids de AIOStreams (⚙️) -->
                <button type="button" 
                        onclick="window.appController.openAioStreamsDebridsModal()" 
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/60 hover:text-amber-300 hover:bg-white/[0.1] active:scale-95 border border-white/[0.08] flex items-center justify-center transition-all" 
                        title="Editar claves Debrid de AIOStreams">
                  <i class="fa-solid fa-gear text-[11px]"></i>
                </button>
              ` : ''}

              <!-- Subir orden (▲) -->
              <button type="button" 
                      onclick="window.appController.moveAddon(${idx}, -1)" 
                      ${isFirstSecondary ? 'disabled' : ''} 
                      class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isFirstSecondary ? 'opacity-20 cursor-not-allowed text-white/20' : 'text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95'} border border-white/[0.08] flex items-center justify-center transition-all" 
                      title="${isFirstSecondary ? 'No puede subir por encima de AIOMetadata' : 'Subir prioridad'}">
                <i class="fa-solid fa-chevron-up text-[10px]"></i>
              </button>

              <!-- Bajar orden (▼) -->
              <button type="button" 
                      onclick="window.appController.moveAddon(${idx}, 1)" 
                      ${isLastSecondary ? 'disabled' : ''} 
                      class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${isLastSecondary ? 'opacity-20 cursor-not-allowed text-white/20' : 'text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95'} border border-white/[0.08] flex items-center justify-center transition-all" 
                      title="${isLastSecondary ? 'Último elemento de la lista' : 'Bajar prioridad'}">
                <i class="fa-solid fa-chevron-down text-[10px]"></i>
              </button>

              <!-- Eliminar Addon (🗑️) -->
              <button type="button" 
                      onclick="window.appController.removeAddon(${idx})" 
                      class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/15 active:scale-95 border border-white/[0.08] flex items-center justify-center transition-all ml-0.5" 
                      title="Eliminar addon de este perfil">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
              </button>
            </div>
          </div>
        `;
      });
    } else {
      html += `
        <div class="py-8 px-4 rounded-[18px] bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2 mt-2">
          <i class="fa-solid fa-circle-nodes text-2xl text-white/20"></i>
          <p class="text-xs text-white/60">No hay addons secundarios registrados en este perfil.</p>
          <p class="text-[11px] text-white/40 max-w-md mx-auto">
            Puedes agregar tus addons de streaming (AIOStreams, Torrentio, Torbox, etc.) pulsando el botón <strong class="text-white">"Agregar Addon"</strong>.
          </p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  moveAddon(index, direction) {
    state.moveAddon(index, direction);
    this.renderAddonsList();
  }

  removeAddon(index) {
    const addon = state.profileAddons[index];
    if (!addon) return;
    this.pendingDeleteAddonIndex = index;
    const nameEl = document.getElementById('deleteAddonTargetName');
    if (nameEl) {
      nameEl.textContent = `"${addon.name || 'Addon ' + (index + 2)}"`;
    }
    const modal = document.getElementById('modalConfirmRemoveAddon');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeConfirmRemoveAddonModal() {
    this.pendingDeleteAddonIndex = null;
    const modal = document.getElementById('modalConfirmRemoveAddon');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  executeConfirmRemoveAddon() {
    if (this.pendingDeleteAddonIndex === null || this.pendingDeleteAddonIndex === undefined) return;
    const idx = this.pendingDeleteAddonIndex;
    const addon = state.profileAddons[idx];
    const name = addon?.name || 'este addon';
    state.removeAddon(idx);
    this.closeConfirmRemoveAddonModal();
    this.renderAddonsList();
    this.showToast(`✓ Addon "${name}" removido de la lista.`, 'info');
  }

  openAddAddonModal(defaultUrl = '') {
    const modal = document.getElementById('modalAddAddon');
    const urlInput = document.getElementById('inputAddonManifestUrl');

    if (urlInput) {
      urlInput.value = defaultUrl;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (urlInput) urlInput.focus();
    }
  }

  closeAddAddonModal() {
    const modal = document.getElementById('modalAddAddon');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async handleAddAddonConfirm() {
    const urlInput = document.getElementById('inputAddonManifestUrl');
    const btnConfirm = document.getElementById('btnConfirmAddAddon');
    let rawUrl = (urlInput ? urlInput.value : '').trim();

    if (!rawUrl) {
      this.showToast('Por favor ingresa la URL del manifest (.json).', 'warning');
      if (urlInput) urlInput.focus();
      return;
    }

    // Normalizar protocolo stremio:// a https://
    if (rawUrl.startsWith('stremio://')) {
      rawUrl = 'https://' + rawUrl.slice(10);
    }
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
    }

    // 1. Verificar si es AIOMetadata
    if (isAioMetadataAddon({ url: rawUrl, name: '' })) {
      this.showToast('AIOMetadata ya es tu addon principal (#1) y se encuentra anclado en la parte superior.', 'info');
      if (urlInput) urlInput.focus();
      return;
    }

    // 2. Verificar duplicados por enlace del manifiesto
    if (state.hasAddonManifest(rawUrl)) {
      this.showToast('Este enlace de manifiesto ya se encuentra agregado en tu perfil.', 'warning');
      if (urlInput) urlInput.focus();
      return;
    }

    const originalConfirmHtml = btnConfirm ? btnConfirm.innerHTML : '';
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Verificando manifest...';
    }

    let manifestInfo = null;
    try {
      manifestInfo = await this.fetchManifestInfo(rawUrl);
    } catch (_) {}

    let finalName = manifestInfo?.name || '';
    let finalLogo = manifestInfo?.logo || this.getAddonFallbackLogo(rawUrl, finalName);

    if (!finalName) {
      try {
        const u = new URL(rawUrl);
        finalName = u.hostname.replace(/^(www\.|stremio\.)/, '').split('.')[0];
        finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
      } catch (_) {
        finalName = `Addon ${state.profileAddons.length + 2}`;
      }
    }

    state.addCustomAddon(rawUrl, finalName, finalLogo);

    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = originalConfirmHtml;
    }

    if (urlInput) {
      urlInput.value = '';
    }

    this.closeAddAddonModal();
    this.renderAddonsList();
    this.showToast(`✓ Addon "${finalName}" agregado exitosamente a la lista.`, 'success');
  }

  handleOpenAddAioStreamsClick() {
    if (state.hasAioStreamsInstance()) {
      this.openAioStreamsConflictModal();
    } else {
      this.openAioStreamsRequirementModal();
    }
  }

  openAioStreamsConflictModal() {
    const modal = document.getElementById('modalAioStreamsConflict');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeAioStreamsConflictModal() {
    const modal = document.getElementById('modalAioStreamsConflict');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  confirmAioStreamsReplacement() {
    const idx = state.getAioStreamsIndex();
    if (idx !== -1) {
      const removed = state.profileAddons[idx];
      const name = removed?.name || 'AIOStreams';
      state.removeAddon(idx);
      this.renderAddonsList();
      this.showToast(`Instancia previa de "${name}" desinstalada. Configura la nueva versión.`, 'info');
    }
    this.closeAioStreamsConflictModal();
    this.openAioStreamsRequirementModal();
  }

  openAioStreamsRequirementModal() {
    const modal = document.getElementById('modalAioStreamsRequirement');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeAioStreamsRequirementModal() {
    const modal = document.getElementById('modalAioStreamsRequirement');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  openAioStreamsDebridsModal() {
    this.closeAioStreamsRequirementModal();
    const modal = document.getElementById('modalAioStreamsDebrids');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    // Inicializar copia de trabajo aislada (Draft) sin mutar state.aiostreams directamente
    this._aioStreamsDraft = {
      debrids: { ...(state.aiostreams.debrids || {}) },
      validatedKeys: { ...(state.aiostreams.validatedKeys || {}) }
    };

    // Detectar si el addon ya existe en la lista para alternar entre "Actualizar" e "Instalar"
    const isEditing = state.hasAioStreamsInstance();
    const iconEl = document.getElementById('iconInstallAioStreams');
    const textEl = document.getElementById('textInstallAioStreams');
    if (iconEl && textEl) {
      if (isEditing) {
        iconEl.className = 'fa-solid fa-arrows-rotate text-[10px]';
        textEl.innerText = 'Actualizar Addon';
      } else {
        iconEl.className = 'fa-solid fa-plus text-[10px]';
        textEl.innerText = 'Instalar Addon';
      }
    }

    const debridIds = ['Torbox', 'Alldebrid', 'Realdebrid', 'Premiumize', 'Debridlink', 'Easydebrid', 'Debrider', 'Torrin', 'Offcloud'];
    debridIds.forEach(id => {
      const key = id.toLowerCase();
      const input = document.getElementById(`inputDebrid${id}`);
      if (input) {
        input.value = this._aioStreamsDraft.debrids[key] || '';
      }
      const statusEl = document.getElementById(`statusDebrid${id}`);
      if (statusEl) {
        if (this._aioStreamsDraft.validatedKeys[key]) {
          statusEl.innerHTML = `<span class="text-emerald-400 font-medium flex items-center gap-1"><i class="fa-solid fa-check text-[10px]"></i> Verificada</span>`;
        } else {
          const links = {
            Torbox: 'https://torbox.app/settings',
            Alldebrid: 'https://alldebrid.com/apikeys',
            Realdebrid: 'https://real-debrid.com/apitoken',
            Premiumize: 'https://www.premiumize.me/account',
            Debridlink: 'https://debrid-link.com/webapp/apikey'
          };
          if (links[id]) {
            statusEl.innerHTML = `<a href="${links[id]}" target="_blank" rel="noopener noreferrer" class="text-white/50 hover:text-white underline flex items-center gap-1" title="Obtener clave"><span class="hidden sm:inline">Obtener clave</span> <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>`;
          } else {
            statusEl.innerHTML = '';
          }
        }
      }
    });

    this.updateInstallAioStreamsBtnState();
  }

  closeAioStreamsDebridsModal() {
    const modal = document.getElementById('modalAioStreamsDebrids');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    // Descartar borrador de trabajo sin alterar la configuración previa guardada en state.aiostreams
    this._aioStreamsDraft = null;
  }

  updateInstallAioStreamsBtnState() {
    const btnInstall = document.getElementById('btnInstallAioStreams');
    if (!btnInstall) return;

    const draft = this._aioStreamsDraft || { debrids: {}, validatedKeys: {} };
    const isEditing = state.hasAioStreamsInstance();

    // 1. Debe haber al menos una clave API validada con éxito
    const hasValidatedKey = Object.values(draft.validatedKeys || {}).some(v => v === true);

    // 2. Comprobar si hay algún input con texto que aún no esté validado
    const debridIds = ['Torbox', 'Alldebrid', 'Realdebrid', 'Premiumize', 'Debridlink', 'Easydebrid', 'Debrider', 'Torrin', 'Offcloud'];
    let hasUnvalidatedNonEmptyKey = false;
    for (const id of debridIds) {
      const key = id.toLowerCase();
      const input = document.getElementById(`inputDebrid${id}`);
      const val = (input ? input.value : '').trim();
      if (val && !draft.validatedKeys[key]) {
        hasUnvalidatedNonEmptyKey = true;
        break;
      }
    }

    if (hasValidatedKey && !hasUnvalidatedNonEmptyKey) {
      btnInstall.disabled = false;
      btnInstall.className = "lat-capsule-btn solid text-xs py-1.5 px-3.5 flex items-center gap-1.5 opacity-100 cursor-pointer shadow-[var(--shadow-pill)]";
      btnInstall.title = isEditing 
        ? "Actualizar AIOStreams con tus proveedores Debrid validados" 
        : "Instalar AIOStreams con tus proveedores Debrid validados";
    } else {
      btnInstall.disabled = true;
      btnInstall.className = "lat-capsule-btn solid text-xs py-1.5 px-3.5 flex items-center gap-1.5 opacity-40 cursor-not-allowed shadow-[var(--shadow-pill)]";
      if (!hasValidatedKey) {
        btnInstall.title = "Debes validar al menos una clave API Debrid para continuar";
      } else {
        btnInstall.title = "Hay claves modificadas o incorrectas sin validar. Pulsa 'Validar Claves' o borra el campo.";
      }
    }
  }

  async validateDebridKeys() {
    const btnValidate = document.getElementById('btnValidateDebridKeys');
    const btnText = document.getElementById('btnValidateDebridKeysText');
    const debridIds = ['Torbox', 'Alldebrid', 'Realdebrid', 'Premiumize', 'Debridlink', 'Easydebrid', 'Debrider', 'Torrin', 'Offcloud'];

    if (!this._aioStreamsDraft) {
      this._aioStreamsDraft = {
        debrids: { ...(state.aiostreams.debrids || {}) },
        validatedKeys: { ...(state.aiostreams.validatedKeys || {}) }
      };
    }

    const entriesToValidate = [];
    debridIds.forEach(id => {
      const key = id.toLowerCase();
      const input = document.getElementById(`inputDebrid${id}`);
      const val = (input ? input.value : '').trim();
      if (val) {
        entriesToValidate.push({ id, key, val });
      }
    });

    if (entriesToValidate.length === 0) {
      this.showToast('Ingresa la clave API de al menos un proveedor Debrid para validar.', 'warning');
      const firstInput = document.getElementById('inputDebridTorbox');
      if (firstInput) firstInput.focus();
      return;
    }

    if (btnValidate) btnValidate.disabled = true;
    if (btnText) btnText.innerText = 'Validando en vivo...';

    let validatedCount = 0;
    let failedCount = 0;

    for (const item of entriesToValidate) {
      const statusEl = document.getElementById(`statusDebrid${item.id}`);
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-amber-300 flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin text-[10px]"></i> Verificando...</span>`;
      }

      try {
        const res = await validateDebridKey(item.key, item.val);
        if (res.valid) {
          validatedCount++;
          this._aioStreamsDraft.validatedKeys[item.key] = true;
          this._aioStreamsDraft.debrids[item.key] = item.val;
          if (statusEl) renderVerifiedKeyStatus(statusEl, res);
        } else {
          failedCount++;
          delete this._aioStreamsDraft.validatedKeys[item.key];
          delete this._aioStreamsDraft.debrids[item.key];
          if (statusEl) renderUnverifiedKeyStatus(statusEl, res);
        }
      } catch (err) {
        failedCount++;
        delete this._aioStreamsDraft.validatedKeys[item.key];
        delete this._aioStreamsDraft.debrids[item.key];
        if (statusEl) {
          statusEl.innerHTML = `<span class="text-rose-400 font-medium flex items-center gap-1" title="${err.message || 'Error'}"><i class="fa-solid fa-xmark text-[10px]"></i> Error de red</span>`;
        }
      }
    }

    if (btnValidate) btnValidate.disabled = false;
    if (btnText) btnText.innerText = 'Validar Claves';

    this.updateInstallAioStreamsBtnState();

    if (validatedCount > 0 && failedCount === 0) {
      const isEditing = state.hasAioStreamsInstance();
      const actionWord = isEditing ? 'Actualizar Addon' : 'Instalar Addon';
      this.showToast(`✓ ${validatedCount} clave(s) Debrid verificada(s) con éxito. Ya puedes pulsar "${actionWord}".`, 'success');
    } else if (validatedCount > 0 && failedCount > 0) {
      this.showToast(`Se verificaron ${validatedCount} clave(s), pero ${failedCount} falló. Corrige o borra la clave errónea para poder guardar.`, 'warning');
    } else {
      this.showToast('No se pudo validar ninguna de las claves ingresadas. Verifica tus credenciales.', 'error');
    }
  }

  installAioStreamsFromModal() {
    const draft = this._aioStreamsDraft || { debrids: {}, validatedKeys: {} };
    const debridIds = ['Torbox', 'Alldebrid', 'Realdebrid', 'Premiumize', 'Debridlink', 'Easydebrid', 'Debrider', 'Torrin', 'Offcloud'];
    const activeDebrids = {};

    debridIds.forEach(id => {
      const key = id.toLowerCase();
      const input = document.getElementById(`inputDebrid${id}`);
      const val = (input ? input.value : '').trim();
      if (val && draft.validatedKeys[key]) {
        activeDebrids[key] = val;
      }
    });

    // Validar que no haya campos con texto sin validar
    const hasUnvalidatedNonEmptyKey = debridIds.some(id => {
      const key = id.toLowerCase();
      const input = document.getElementById(`inputDebrid${id}`);
      const val = (input ? input.value : '').trim();
      return val && !draft.validatedKeys[key];
    });

    if (hasUnvalidatedNonEmptyKey) {
      this.showToast('Tienes claves modificadas o incorrectas sin validar. Corrige o borra las claves erróneas.', 'error');
      return;
    }

    if (Object.keys(activeDebrids).length === 0) {
      this.showToast('Debes validar en vivo al menos una clave API Debrid antes de guardar.', 'warning');
      return;
    }

    const isEditing = state.hasAioStreamsInstance();
    state.setAioStreamsConfig(activeDebrids, draft.validatedKeys);
    this.closeAioStreamsDebridsModal();
    this.renderAddonsList();
    if (isEditing) {
      this.showToast('✓ Configuración de AIOStreams actualizada con éxito.', 'success');
    } else {
      this.showToast('✓ AIOStreams Latino configurado y agregado a tus addons.', 'success');
    }
  }

  setupStep6Injection() {
    this.setupStep7Injection();
  }

  setupStep7Injection() {
    const passwordInput = document.getElementById('aioPassword');
    const btnGenPass = document.getElementById('btnGeneratePassword');
    const btnExecute = document.getElementById('btnExecutePipeline');
    const btnDownloadCol = document.getElementById('btnDownloadCollections');
    const btnDownloadAio = document.getElementById('btnDownloadAioConfig');
    const btnCopyBadge = document.getElementById('btnCopyBadgeUrl');
    const btnCopyBadgeCompiled = document.getElementById('btnCopyBadgeCompiledJson');
    const btnDownloadBadges = document.getElementById('btnDownloadBadges');

    // Forzar modo Real en producción
    state.execution.mode = 'real';

    if (passwordInput) {
      if (state.aiometadata?.password) {
        passwordInput.value = state.aiometadata.password;
      } else if (passwordInput.value) {
        state.aiometadata.password = passwordInput.value.trim();
      }

      const syncPassword = () => {
        const val = passwordInput.value.trim();
        state.aiometadata.password = val;
        this.saveSession();
        this.updateStep6ExecuteButton();
        this.updateManualModeButtons();
        this.updateNavigationButtons();
      };

      passwordInput.addEventListener('input', syncPassword);
      passwordInput.addEventListener('change', syncPassword);
      passwordInput.addEventListener('keyup', syncPassword);
      passwordInput.addEventListener('focus', syncPassword);
      passwordInput.addEventListener('blur', syncPassword);
      passwordInput.addEventListener('paste', () => {
        setTimeout(syncPassword, 10);
      });
    }




    if (btnGenPass && passwordInput) {
      btnGenPass.addEventListener('click', () => {
        const randomPass = 'Latino-' + Math.random().toString(36).substring(2, 8) + '-' + Math.floor(1000 + Math.random() * 9000);
        passwordInput.value = randomPass;
        state.aiometadata.password = randomPass;
        this.saveSession();
        this.updateStep6ExecuteButton();
        this.updateManualModeButtons();
        this.updateNavigationButtons();
        this.showToast('Contraseña aleatoria generada y configurada', 'info');
      });
    }

    // Botones de Modo Manual: Copiar JSON al portapapeles
    const btnCopyCol = document.getElementById('btnCopyCollectionsJson');
    const btnCopyAio = document.getElementById('btnCopyAioConfig');

    if (btnCopyBadge) {
      btnCopyBadge.addEventListener('click', async () => {
        try {
          const packId = state.preferences.selectedBadgePack || 'tinted';
          const badgeUrl = getBadgePackUrl(packId);
          const pack = getBadgePackById(packId);
          await navigator.clipboard.writeText(badgeUrl);
          this.showToast(`✓ Enlace JSON de badges (${pack.name}) copiado al portapapeles`, 'success');
        } catch (err) {
          this.showToast('No se pudo copiar automáticamente al portapapeles.', 'warning');
        }
      });
    }

    if (btnCopyBadgeCompiled) {
      btnCopyBadgeCompiled.addEventListener('click', async () => {
        await this.copyCompiledBadgeJson();
      });
    }

    if (btnCopyCol) {
      btnCopyCol.addEventListener('click', async () => {
        try {
          const colData = state.getSynchronizedNuvioCollections();
          await navigator.clipboard.writeText(JSON.stringify(colData, null, 2));
          state.manualCopiedCollections = true;
          this.showToast('✓ JSON de Colecciones copiado al portapapeles', 'success');

          if (state.isManualMode && state.manualCopiedCollections && state.manualCopiedAio) {
            setTimeout(() => {
              this.showCompletionModal({ isManual: true });
            }, 600);
          }
        } catch (err) {
          this.showToast('No se pudo copiar automáticamente al portapapeles. Usa el botón de descarga.', 'warning');
        }
      });
    }

    if (btnCopyAio) {
      btnCopyAio.addEventListener('click', async () => {
        const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 6);
        if (!hasPassword) {
          this.showToast('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
          if (passwordInput) passwordInput.focus();
          return;
        }

        try {
          const aioData = state.getSynchronizedMetadataPayload();
          await navigator.clipboard.writeText(JSON.stringify(aioData, null, 2));
          state.manualCopiedAio = true;
          this.showToast('✓ JSON de Metadata copiado al portapapeles', 'success');

          if (state.isManualMode && state.manualCopiedCollections && state.manualCopiedAio) {
            setTimeout(() => {
              this.showCompletionModal({ isManual: true });
            }, 600);
          }
        } catch (err) {
          this.showToast('No se pudo copiar automáticamente al portapapeles. Usa el botón de descarga.', 'warning');
        }
      });
    }

    const btnCopyAioStreams = document.getElementById('btnCopyAioStreamsManifest');
    if (btnCopyAioStreams) {
      btnCopyAioStreams.addEventListener('click', async () => {
        const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 6);
        if (!hasPassword) {
          this.showToast('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
          if (passwordInput) passwordInput.focus();
          return;
        }

        const originalHtml = btnCopyAioStreams.innerHTML;
        try {
          btnCopyAioStreams.disabled = true;
          btnCopyAioStreams.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-cyan-400"></i><span>Generando...</span>';

          let manifestUrl = state.aiostreams.manifestUrl;
          if (!manifestUrl) {
            this.showToast('Generando manifest de AIOStreams en la instancia oficial...', 'info');
            let template = state.rawAioStreamsTemplate;
            if (!template) {
              const fetchRes = await fetch(`${CONFIG.TEMPLATES.AIOSTREAMS}?v=${Date.now()}`);
              template = await fetchRes.json();
              state.rawAioStreamsTemplate = template;
            }
            const aioConfig = compileStreamingConfig(template, state.aiostreams.debrids);
            const masterPass = state.aiometadata.password.trim();
            const res = await createStreamingConfiguration(CONFIG.AIOSTREAMS_INSTANCE, aioConfig, masterPass);
            manifestUrl = res.manifestUrl;
            state.aiostreams.manifestUrl = manifestUrl;
          }

          await navigator.clipboard.writeText(manifestUrl);
          this.showToast('✓ Enlace del Manifiesto de AIOStreams copiado al portapapeles', 'success');
        } catch (err) {
          this.showToast(`Error al generar o copiar AIOStreams: ${err.message}`, 'error');
        } finally {
          btnCopyAioStreams.disabled = false;
          btnCopyAioStreams.innerHTML = originalHtml;
        }
      });
    }

    if (btnExecute) {
      btnExecute.addEventListener('click', () => {
        // Sincronizar inmediatamente la contraseña si el input tiene valor
        if (passwordInput && passwordInput.value && (!state.aiometadata?.password || state.aiometadata.password !== passwordInput.value.trim())) {
          state.aiometadata.password = passwordInput.value.trim();
          this.saveSession();
        }

        // Validar todos los pasos (1 a 7) antes de ejecutar
        for (let i = 1; i <= 7; i++) {
          const val = state.validateStep(i);
          if (!val.valid) {
            this.showToast(`Paso ${i} incompleto: ${val.error}`, 'error');
            if (i < 7) window.goToStep(i);
            if (i === 7 && passwordInput) passwordInput.focus();
            return;
          }
        }

        const statusContainer = document.getElementById('injectionStatusContainer');
        const phaseTitle = document.getElementById('injectionPhaseTitle');
        const phaseStep = document.getElementById('injectionPhaseStep');
        const progressBar = document.getElementById('injectionProgressBar');
        const phaseDetail = document.getElementById('injectionPhaseDetail');

        if (statusContainer) statusContainer.classList.remove('hidden');
        if (phaseTitle) phaseTitle.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-brand-400"></i><span>Iniciando inyección...</span>';
        if (phaseStep) phaseStep.innerText = 'Fase 1 de 5';
        if (progressBar) progressBar.style.width = '15%';
        if (phaseDetail) phaseDetail.innerText = 'Conectando con servidores de AIOMetadata y Nuvio...';

        btnExecute.disabled = true;
        btnExecute.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Aprovisionando en Nuvio...</span>';

        executePipeline(state, { nuvioClient: NuvioClient });
      });
    }

    if (btnDownloadCol) {
      btnDownloadCol.addEventListener('click', () => {
        downloadCollectionsJson(state.getSynchronizedNuvioCollections());
        recordSuccessfulCompletion().catch(err => {
          console.warn('[Counter] Error actualizando contador tras descargar colecciones:', err);
        });
      });
    }

    if (btnDownloadAio) {
      btnDownloadAio.addEventListener('click', () => {
        const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 6);
        if (state.isManualMode && !hasPassword) {
          this.showToast('Debes ingresar o generar una contraseña para tus addons (mínimo 6 caracteres) primero.', 'warning');
          if (passwordInput) passwordInput.focus();
          return;
        }
        downloadAioConfigJson(state.getSynchronizedMetadataPayload());
        recordSuccessfulCompletion().catch(err => {
          console.warn('[Counter] Error actualizando contador tras descargar metadata:', err);
        });
      });
    }

    if (btnDownloadBadges) {
      btnDownloadBadges.addEventListener('click', () => {
        this.downloadCompiledBadgeJson();
      });
    }
  }

  refreshStep6Summary() {
    this.refreshStep7Summary();
  }

  refreshStep7Summary() {
    const targetEl = document.getElementById('summaryProfileTarget');
    const countEl = document.getElementById('summaryCollectionsCount');
    const catalogsEl = document.getElementById('summaryCatalogsCount');
    const posterEngineEl = document.getElementById('summaryPosterEngine');
    const enrichmentEl = document.getElementById('summaryEnrichmentStatus');

    let activeFolders = 0;
    state.collections.forEach(sec => {
      if (sec.enabled !== false) {
        (sec.folders || []).forEach(f => {
          if (f.enabled !== false) activeFolders++;
        });
      }
    });

    let catalogsCount = 0;
    try {
      const meta = state.getSynchronizedMetadataPayload();
      catalogsCount = (meta.config?.catalogs || meta.catalogs || []).length;
    } catch (_) {
      catalogsCount = 0;
    }

    if (targetEl) targetEl.innerText = state.isManualMode ? 'Manual (Sin cuenta)' : (state.selectedProfileName || 'Perfil Principal');
    if (countEl) {
      countEl.innerText = `${activeFolders} carruseles seleccionados`;
      countEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
    }
    if (catalogsEl) {
      catalogsEl.innerText = `${catalogsCount} catálogos sincronizados`;
      catalogsEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
    }

    if (posterEngineEl) {
      const engine = state.preferences?.posterEngine || 'default';
      if (engine === 'betterposter') {
        posterEngineEl.innerText = 'BetterPoster (es-MX)';
      } else if (engine === 'postersplus') {
        posterEngineEl.innerText = 'PostersPlus (Badges)';
      } else {
        posterEngineEl.innerText = 'Nativo / Limpio';
      }
      posterEngineEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
    }

    if (enrichmentEl) {
      const enr = Boolean(state.preferences?.tmdbEnrichment);
      const rat = Boolean(state.preferences?.mdblistRatings && state.apiKeys.mdblist);
      if (enr && rat) {
        enrichmentEl.innerText = 'TMDB + MDBList (Activos)';
        enrichmentEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
      } else if (enr) {
        enrichmentEl.innerText = 'Solo TMDB (Activo)';
        enrichmentEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
      } else if (rat) {
        enrichmentEl.innerText = 'Solo MDBList (Activo)';
        enrichmentEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
      } else {
        enrichmentEl.innerText = 'Desactivados';
        enrichmentEl.className = 'text-xs sm:text-sm text-white/40 font-medium block truncate';
      }
    }

    const badgesEl = document.getElementById('summaryBadgesStatus');
    if (badgesEl) {
      if (state.preferences && state.preferences.badgesEnabled) {
        const pack = getBadgePackById(state.preferences.selectedBadgePack);
        badgesEl.innerText = `${pack.name}`;
        badgesEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
      } else {
        badgesEl.innerText = 'Desactivado';
        badgesEl.className = 'text-xs sm:text-sm text-white/40 font-medium block truncate';
      }
    }

    const addonsEl = document.getElementById('summaryAddonsStatus');
    if (addonsEl) {
      const extraCount = state.profileAddons ? state.profileAddons.length : 0;
      const hasAioStreams = Boolean(state.aiostreams?.installed || (state.profileAddons || []).some(a => a.isAioStreams));
      if (hasAioStreams && extraCount === 1) {
        addonsEl.innerText = `AIOMetadata (#1) + AIOStreams`;
      } else if (hasAioStreams) {
        addonsEl.innerText = `AIOMetadata (#1) + AIOStreams + ${extraCount - 1} más`;
      } else if (extraCount > 0) {
        addonsEl.innerText = `AIOMetadata (#1) + ${extraCount} addons`;
      } else {
        addonsEl.innerText = `AIOMetadata (#1 principal)`;
      }
      addonsEl.className = 'text-xs sm:text-sm text-white font-medium block truncate';
    }
  }

  handleStateUpdate(s, eventType) {
    if (eventType === 'LOG_ADDED') {
      const lastLog = state.execution.logs[state.execution.logs.length - 1];
      if (lastLog) {
        const detailEl = document.getElementById('injectionPhaseDetail');
        if (detailEl) detailEl.innerText = lastLog.message;

        const match = lastLog.message.match(/\[(\d+)\/(\d+)\]/);
        if (match) {
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          const stepEl = document.getElementById('injectionPhaseStep');
          const barEl = document.getElementById('injectionProgressBar');
          if (stepEl) stepEl.innerText = `Fase ${current} de ${total}`;
          if (barEl) barEl.style.width = `${(current / total) * 100}%`;
        }
      }
    } else if (eventType === 'EXECUTION_FINISHED') {
      const btnExecute = document.getElementById('btnExecutePipeline');
      const titleEl = document.getElementById('injectionPhaseTitle');
      const barEl = document.getElementById('injectionProgressBar');
      const detailEl = document.getElementById('injectionPhaseDetail');

      if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.innerHTML = '<i class="fa-solid fa-check"></i><span>Configuración Lista (Re-ejecutar)</span>';
      }

      if (state.execution.isCompleted) {
        if (titleEl) {
          titleEl.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i><span class="text-emerald-400">¡Configuración inyectada con éxito!</span>';
        }
        if (barEl) {
          barEl.style.width = '100%';
          barEl.className = 'bg-emerald-500 h-1.5 rounded-full transition-all duration-300';
        }
        if (detailEl) {
          detailEl.innerText = `Perfil "${state.selectedProfileName || 'Principal'}" configurado y listo en tu app Nuvio.`;
          detailEl.className = 'text-[11px] text-emerald-300 font-medium';
        }
        this.showToast('🎉 ¡Aprovisionamiento completado con éxito en Nuvio!', 'success');

        // Mostrar ventana emergente de finalización y recomendación
        setTimeout(() => {
          this.showCompletionModal({ isManual: false, profileName: state.selectedProfileName || 'Principal' });
        }, 800);
      } else {
        if (titleEl) {
          titleEl.innerHTML = '<i class="fa-solid fa-circle-exclamation text-rose-400"></i><span class="text-rose-400 font-bold">Error durante la inyección</span>';
        }
        if (barEl) {
          barEl.className = 'bg-rose-500 h-1.5 rounded-full transition-all duration-300';
        }
        const errorDetail = state.execution.error || 'Ocurrió un error inesperado al procesar la inyección.';
        if (detailEl) {
          detailEl.innerHTML = `
            <div class="mt-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1.5">
              <div class="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <i class="fa-solid fa-bug"></i>
                <span>Detalle técnico del error:</span>
              </div>
              <p class="text-rose-200 text-xs font-mono break-words leading-relaxed select-text">${errorDetail}</p>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">
              💡 Puedes reintentar o usar los botones de <strong>Descargar Colecciones JSON</strong> y <strong>Descargar Config AIOMetadata</strong> para importar manualmente.
            </p>
          `;
          detailEl.className = 'text-xs text-slate-300';
        }
        this.showToast('Ocurrió un error durante la inyección. Revisa el detalle.', 'error');
      }
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
