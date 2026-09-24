/**
 * Controlador Principal de la Aplicación (UI y Eventos)
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { state } from './state.js';
import { CONFIG } from './config.js';
import { MiniNuvio } from './mini-nuvio.js';
import { NuvioClient } from './nuvio-client.js';
import { PipelineInjector } from './injector.js';

class AppController {
  constructor() {
    this.miniNuvio = null;
  }

  async init() {
    // 1. Inicializar Mini Nuvio y Cargar Plantillas
    this.miniNuvio = new MiniNuvio('miniNuvioContainer');
    window.miniNuvioInstance = this.miniNuvio;
    window.appController = this;

    await state.loadTemplates();
    this.miniNuvio.init();

    // 2. Configurar eventos de navegación y formularios
    this.setupNavigation();
    this.setupStep1Events();
    this.setupStep2Profiles();
    this.setupStep3ApiKeys();
    this.setupStep5Injection();

    // 3. Suscribirse al estado para actualizar la UI reactiva
    state.subscribe((s, eventType) => {
      this.handleStateUpdate(s, eventType);
    });

    // 4. Mostrar paso inicial del asistente
    this.updateUI();

    // 5. Control inicial de vistas (Landing por defecto, o Asistente si hay hash o página dedicada)
    const landing = document.getElementById('landingView');
    if (!landing) {
      // Estamos en la página dedicada de configuración (/configuration/)
      const wizard = document.getElementById('wizardView');
      if (wizard) wizard.classList.remove('hidden');
      this.updateUI();
    } else {
      if (window.location.hash === '#wizard' || window.location.hash === '#setup') {
        this.showWizardView(false);
      } else {
        this.showLandingView(false);
      }

      // Escuchar cambios de navegación en el historial
      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#wizard' || window.location.hash === '#setup') {
          this.showWizardView(false);
        } else {
          this.showLandingView(false);
        }
      });
    }
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
   * Sistema de Notificaciones Flotantes (Toasts)
   * @param {string} message 
   * @param {'info' | 'success' | 'warning' | 'error'} type 
   * @param {number} duration 
   */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 text-xs font-medium';

    let icon = 'fa-circle-info text-brand-400';
    let colors = 'bg-slate-900/95 border-brand-500/40 text-slate-100 shadow-brand-950/40';

    if (type === 'success') {
      icon = 'fa-circle-check text-emerald-400';
      colors = 'bg-slate-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40';
    } else if (type === 'error') {
      icon = 'fa-circle-exclamation text-rose-400';
      colors = 'bg-slate-900/95 border-rose-500/40 text-rose-100 shadow-rose-950/40';
    } else if (type === 'warning') {
      icon = 'fa-triangle-exclamation text-amber-400';
      colors = 'bg-slate-900/95 border-amber-500/40 text-amber-100 shadow-amber-950/40';
    }

    toast.className += ` ${colors}`;
    toast.innerHTML = `
      <i class="fa-solid ${icon} text-base shrink-0"></i>
      <span class="flex-1 leading-snug">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, duration);
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

    // Si estamos en el paso 3 o 5, refrescar o sincronizar vistas
    if (currentStep === 3) {
      state.unlockStep(4);
    } else if (currentStep === 5) {
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
      this.refreshStep5Summary();
      this.updateStep5ExecuteButton();
    }

    // Actualizar estilo reactivo del botón Siguiente
    this.updateNavigationButtons();
  }

  updateNavigationButtons() {
    const btnNext = document.getElementById('btnNext');
    if (!btnNext) return;

    const val = state.validateStep(state.currentStep);
    if (val.valid) {
      btnNext.className = "px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20 cursor-pointer";
      btnNext.title = "Avanzar al siguiente paso";
    } else {
      btnNext.className = "px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700/60 shadow-none transition-all flex items-center gap-1.5 cursor-not-allowed";
      btnNext.title = val.error || "Completa este paso para continuar";
    }
  }

  updateStep5ExecuteButton() {
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

    const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 4);
    if (hasPassword) {
      btnExecute.disabled = false;
      btnExecute.className = "px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-brand-600/30 cursor-pointer";
      btnExecute.title = "Ejecutar la inyección y configuración automática";
    } else {
      btnExecute.disabled = true;
      btnExecute.className = "px-6 py-3 bg-slate-800 text-slate-500 border border-slate-700/60 font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-not-allowed shadow-none";
      btnExecute.title = "Ingresa o genera una contraseña maestra (mínimo 4 caracteres) para activar";
    }
  }

  updateManualModeButtons() {
    const btnCopyAio = document.getElementById('btnCopyAioConfig');
    const btnDownloadAio = document.getElementById('btnDownloadAioConfig');
    if (!btnCopyAio) return;

    const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 4);

    if (hasPassword) {
      btnCopyAio.disabled = false;
      btnCopyAio.className = "px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-brand-600/25 flex items-center gap-2 cursor-pointer";
      btnCopyAio.title = "Copiar JSON de configuración de AIOMetadata";
      if (btnDownloadAio) {
        btnDownloadAio.disabled = false;
        btnDownloadAio.className = "px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer";
      }
    } else {
      btnCopyAio.disabled = true;
      btnCopyAio.className = "px-4 py-2.5 bg-slate-800 text-slate-500 border border-slate-700/60 font-semibold rounded-xl text-xs transition-all shadow-none flex items-center gap-2 cursor-not-allowed";
      btnCopyAio.title = "Ingresa una contraseña para el addon (mínimo 4 caracteres) primero";
      if (btnDownloadAio) {
        btnDownloadAio.disabled = true;
        btnDownloadAio.className = "px-4 py-3 bg-slate-950 text-slate-600 border border-slate-900 rounded-xl text-xs transition-all flex items-center gap-2 cursor-not-allowed";
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
    const emailInput = document.getElementById('nuvioEmail');
    const passInput = document.getElementById('nuvioPassword');
    const btnConnect = document.getElementById('btnNuvioConnect');
    const btnSignup = document.getElementById('btnNuvioSignup');
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabSignup = document.getElementById('tabAuthSignup');
    const headingText = document.getElementById('authHeadingText');
    const hintText = document.getElementById('authHintText');

    let authMode = 'login'; // 'login' | 'signup'

    const switchAuthMode = (mode) => {
      authMode = mode;
      if (mode === 'login') {
        if (tabLogin) {
          tabLogin.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-brand-600 text-white shadow-sm flex items-center justify-center gap-1.5";
        }
        if (tabSignup) {
          tabSignup.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-1.5";
        }
        if (headingText) headingText.innerText = "Conectar con tu cuenta de Nuvio";
        if (hintText) hintText.classList.add('hidden');
        if (btnConnect) btnConnect.style.display = 'flex';
        if (btnSignup) btnSignup.style.display = 'none';
      } else {
        if (tabSignup) {
          tabSignup.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-emerald-600 text-white shadow-sm flex items-center justify-center gap-1.5";
        }
        if (tabLogin) {
          tabLogin.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-1.5";
        }
        if (headingText) headingText.innerText = "Crear una nueva cuenta en Nuvio";
        if (hintText) hintText.classList.remove('hidden');
        if (btnConnect) btnConnect.style.display = 'none';
        if (btnSignup) btnSignup.style.display = 'flex';
      }
    };

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthMode('login'));
    if (tabSignup) tabSignup.addEventListener('click', () => switchAuthMode('signup'));

    if (emailInput) {
      emailInput.addEventListener('input', (e) => {
        state.nuvioAuth.email = e.target.value.trim();
        this.updateNavigationButtons();
      });
    }

    if (passInput) {
      passInput.addEventListener('input', (e) => {
        state.nuvioAuth.password = e.target.value;
        this.updateNavigationButtons();
      });
    }

    // Acción Continuar sin Cuenta (Modo Manual)
    const btnContinueWithout = document.getElementById('btnContinueWithoutAccount');
    if (btnContinueWithout) {
      btnContinueWithout.addEventListener('click', () => {
        state.enableManualMode();
        const badge = document.getElementById('authStatusBadge');
        if (badge) {
          badge.className = "text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5";
          badge.innerHTML = '<i class="fa-solid fa-user-slash text-[10px]"></i> Modo Manual (Sin cuenta)';
        }
        this.showToast('Continuando en modo manual sin cuenta de Nuvio.', 'info');
        setTimeout(() => {
          state.unlockStep(3);
          state.currentStep = 3;
          this.updateUI();
        }, 300);
      });
    }

    // Acción Iniciar Sesión
    if (btnConnect) {
      btnConnect.addEventListener('click', async () => {
        const email = emailInput?.value?.trim();
        const password = passInput?.value;
        const apikey = CONFIG.NUVIO_PUBLIC_ANON_KEY;

        if (!email || !password) {
          this.showToast('Por favor ingresa tu correo y contraseña de Nuvio.', 'warning');
          return;
        }

        btnConnect.disabled = true;
        btnConnect.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Conectando...';

        try {
          const auth = await NuvioClient.login({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey,
            email,
            password
          });

          state.isManualMode = false;
          state.nuvioAuth.accessToken = auth.accessToken;
          state.nuvioAuth.userId = auth.userId;
          state.nuvioAuth.isAuthenticated = true;
          state.nuvioAuth.apikey = apikey;

          // Obtener perfiles de la cuenta
          const profiles = await NuvioClient.getProfiles({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey,
            accessToken: auth.accessToken,
            userId: auth.userId
          });

          state.profiles = profiles;
          if (profiles.length > 0) {
            state.selectedProfileId = profiles[0].id;
            state.selectedProfileName = profiles[0].name || profiles[0].title || 'Perfil Principal';
            state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
          }

          state.unlockStep(2); // Desbloquea Paso 2 (Elegir Perfil)
          this.renderProfiles();
          this.setAuthBadge(true);
          this.showToast('✓ ¡Sesión iniciada con éxito! Perfiles sincronizados.', 'success');

          // Auto-avanzar al paso 2 de manera fluida
          setTimeout(() => {
            state.currentStep = 2;
            this.updateUI();
          }, 600);
        } catch (err) {
          this.showToast(`Error al conectar: ${err.message}`, 'error');
          this.setAuthBadge(false);
        } finally {
          btnConnect.disabled = false;
          btnConnect.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> Conectar Cuenta';
        }
      });
    }

    // Acción Crear Cuenta
    if (btnSignup) {
      btnSignup.addEventListener('click', async () => {
        const email = emailInput?.value?.trim();
        const password = passInput?.value;
        const apikey = CONFIG.NUVIO_PUBLIC_ANON_KEY;

        if (!email || !password) {
          this.showToast('Por favor ingresa un correo y contraseña para crear tu cuenta.', 'warning');
          return;
        }

        if (password.length < 6) {
          this.showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
          return;
        }

        btnSignup.disabled = true;
        btnSignup.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Registrando cuenta...';

        try {
          const auth = await NuvioClient.signup({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey,
            email,
            password
          });

          state.isManualMode = false;
          state.nuvioAuth.accessToken = auth.accessToken;
          state.nuvioAuth.userId = auth.userId;
          state.nuvioAuth.isAuthenticated = true;
          state.nuvioAuth.apikey = apikey;

          // Consultar perfiles o crear perfil inicial "Principal"
          let profiles = [];
          try {
            profiles = await NuvioClient.getProfiles({
              apiUrl: CONFIG.NUVIO_API_URL,
              apikey,
              accessToken: auth.accessToken,
              userId: auth.userId
            });
          } catch (_) {
            profiles = [];
          }

          if (profiles.length === 0) {
            try {
              const defaultProfile = await NuvioClient.createProfile({
                apiUrl: CONFIG.NUVIO_API_URL,
                apikey,
                accessToken: auth.accessToken,
                userId: auth.userId,
                name: 'Principal'
              });
              profiles = [defaultProfile];
            } catch (_) {}
          }

          state.profiles = profiles;
          if (profiles.length > 0) {
            state.selectedProfileId = profiles[0].id;
            state.selectedProfileName = profiles[0].name || profiles[0].title || 'Principal';
            state.unlockStep(3);
          }

          state.unlockStep(2);
          this.renderProfiles();
          this.setAuthBadge(true);
          this.showToast('✓ ¡Cuenta creada con éxito! Bienvenido a Nuvio.', 'success');

          setTimeout(() => {
            state.currentStep = 2;
            this.updateUI();
          }, 600);
        } catch (err) {
          this.showToast(err.message, 'error');
          if (/iniciar sesión/i.test(err.message)) {
            switchAuthMode('login');
          }
        } finally {
          btnSignup.disabled = false;
          btnSignup.innerHTML = '<i class="fa-solid fa-user-plus mr-1"></i> Crear Cuenta en Nuvio';
        }
      });
    }
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

  setupStep2Profiles() {
    this.renderProfiles();

    const btnCreate = document.getElementById('btnCreateProfile');
    const nameInput = document.getElementById('newProfileName');

    if (btnCreate && nameInput) {
      const handleCreate = async () => {
        const name = nameInput.value.trim();
        if (!name) {
          this.showToast('Por favor escribe un nombre para el nuevo perfil.', 'warning');
          nameInput.focus();
          return;
        }

        if (!state.nuvioAuth.isAuthenticated || !state.nuvioAuth.accessToken) {
          this.showToast('Debes haber iniciado sesión con tu cuenta de Nuvio en el Paso 1.', 'error');
          return;
        }

        btnCreate.disabled = true;
        btnCreate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Creando...</span>';

        try {
          const newProfile = await NuvioClient.createProfile({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken: state.nuvioAuth.accessToken,
            userId: state.nuvioAuth.userId,
            name: name
          });

          // Agregar a la lista de perfiles y auto-seleccionar
          state.newlyCreatedProfileIds.add(String(newProfile.id));
          state.profiles.push(newProfile);
          state.selectedProfileId = newProfile.id;
          state.selectedProfileName = newProfile.name || name;
          state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)

          this.renderProfiles();
          this.updateProfileWarning(newProfile.id, newProfile.name || name);
          nameInput.value = '';
          this.showToast(`¡Perfil "${name}" creado y seleccionado con éxito!`, 'success');
        } catch (err) {
          console.error(err);
          this.showToast(`Error al crear perfil: ${err.message}`, 'error');
        } finally {
          btnCreate.disabled = false;
          btnCreate.innerHTML = '<i class="fa-solid fa-plus"></i><span>Crear Perfil</span>';
        }
      };

      btnCreate.addEventListener('click', handleCreate);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCreate();
        }
      });
    }
  }

  updateProfileWarning(profileId, profileName) {
    const warningContainer = document.getElementById('profileOverwriteWarning');
    const nameEl = document.getElementById('warningProfileName');
    if (!warningContainer) return;

    if (!profileId) {
      warningContainer.classList.add('hidden');
      return;
    }

    const isNew = state.isProfileNew(profileId);
    if (!isNew) {
      if (nameEl) nameEl.innerText = `"${profileName || 'seleccionado'}"`;
      warningContainer.classList.remove('hidden');
    } else {
      warningContainer.classList.add('hidden');
    }
  }

  renderProfiles() {
    const container = document.getElementById('profilesContainer');
    if (!container) return;

    if (state.profiles && state.profiles.length > 0) {
      container.innerHTML = state.profiles.map((p, idx) => {
        const isSelected = (state.selectedProfileId !== null && state.selectedProfileId !== undefined && String(state.selectedProfileId) === String(p.id)) || (state.selectedProfileId === null && idx === 0);
        if (isSelected && state.selectedProfileId === null) {
          state.selectedProfileId = p.id;
          state.selectedProfileName = p.name || p.title || `Perfil ${idx + 1}`;
          state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
        }

        const name = p.name || p.title || `Perfil ${idx + 1}`;
        const avatar = p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

        return `
          <div onclick="window.appController.selectProfile('${p.id}', '${name.replace(/'/g, "\\'")}')" 
               class="group relative cursor-pointer p-4 rounded-xl flex flex-col items-center gap-2.5 transition-all duration-200 select-none ${
                 isSelected 
                   ? 'border-2 border-brand-500 ring-4 ring-brand-500/25 bg-brand-500/15 shadow-lg shadow-brand-500/20 transform -translate-y-0.5' 
                   : 'border border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/60 hover:-translate-y-0.5'
               }">
            ${isSelected ? `
              <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-md ring-2 ring-emerald-400/40">
                <i class="fa-solid fa-check"></i>
              </div>
            ` : `
              <div class="absolute top-2 right-2 w-4 h-4 rounded-full border border-slate-700 bg-slate-900/80 flex items-center justify-center text-[8px] text-transparent group-hover:border-slate-500">
                <i class="fa-solid fa-check text-slate-600"></i>
              </div>
            `}
            <div class="relative">
              <img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full object-cover transition-all ${
                isSelected ? 'ring-2 ring-brand-400 shadow-md scale-105' : 'ring-1 ring-slate-700 group-hover:ring-slate-500'
              }">
            </div>
            <div class="text-center w-full">
              <div class="text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}">${name}</div>
              <div class="text-[10px] mt-0.5 ${isSelected ? 'text-emerald-400 font-bold uppercase tracking-wider' : 'text-slate-500 group-hover:text-slate-400'}">
                ${isSelected ? '✓ Seleccionado' : 'Click para elegir'}
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.updateProfileWarning(state.selectedProfileId, state.selectedProfileName);
    } else {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl p-6">
          <i class="fa-solid fa-user-circle text-4xl text-slate-600 mb-2"></i>
          <p class="text-sm font-medium text-slate-300">No se encontraron perfiles en tu cuenta de Nuvio</p>
          <p class="text-xs text-slate-500 mt-1">Usa la opción de abajo para crear tu primer perfil directamente.</p>
        </div>
      `;
      this.updateProfileWarning(null, '');
    }
  }

  selectProfile(id, name) {
    state.selectedProfileId = id;
    state.selectedProfileName = name;
    state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
    this.renderProfiles();
    this.updateProfileWarning(id, name);
    this.updateUI();
  }

  setupStep3ApiKeys() {
    const tmdbInput = document.getElementById('tmdbApiKey');
    const tvdbInput = document.getElementById('tvdbApiKey');
    const mdblistInput = document.getElementById('mdblistApiKey');
    const rpdbInput = document.getElementById('rpdbApiKey');
    const fanartInput = document.getElementById('fanartApiKey');
    const topPosterInput = document.getElementById('topPosterApiKey');
    const publicmetadbInput = document.getElementById('publicmetadbApiKey');

    const toggleAi = document.getElementById('toggleSearchAi');
    const aiContainer = document.getElementById('aiKeysContainer');
    const geminiInput = document.getElementById('geminiApiKey');
    const openrouterInput = document.getElementById('openrouterApiKey');

    const btnValidate = document.getElementById('btnValidateApiKeys');
    const overallBadge = document.getElementById('apiKeyOverallBadge');
    const statusMsg = document.getElementById('apiKeyStatusMessage');

    const invalidateValidation = (modifiedKey) => {
      if (state.apiKeysValidated) {
        state.invalidateApiKeysValidation();
        if (overallBadge) overallBadge.classList.add('hidden');
        if (statusMsg) {
          statusMsg.innerText = 'Has modificado tus claves. Debes probarlas nuevamente para continuar.';
          statusMsg.className = 'text-[11px] text-amber-400 mt-0.5 font-medium';
        }
      }
      const badge = document.getElementById(`badge-${modifiedKey}`);
      if (badge && modifiedKey === 'tmdb') {
        badge.className = 'text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 font-mono';
        badge.innerText = 'No verificada';
      }
      this.updateNavigationButtons();
    };

    // 1. Vincular campos base
    const bindInput = (el, key, isDefault = null) => {
      if (!el) return;
      el.value = state.apiKeys[key] || isDefault || '';
      el.addEventListener('input', (e) => {
        state.apiKeys[key] = e.target.value.trim() || (isDefault || '');
        invalidateValidation(key);
      });
    };

    bindInput(tmdbInput, 'tmdb');
    bindInput(tvdbInput, 'tvdb');
    bindInput(mdblistInput, 'mdblist');
    bindInput(rpdbInput, 'rpdb', 't0-free-rpdb');
    bindInput(fanartInput, 'fanart');
    bindInput(topPosterInput, 'topPoster');
    bindInput(publicmetadbInput, 'publicmetadb');

    // 2. Vincular Búsqueda con IA y sus campos
    if (toggleAi && aiContainer) {
      toggleAi.checked = Boolean(state.searchAiEnabled);
      toggleAi.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        state.searchAiEnabled = enabled;
        if (enabled) {
          aiContainer.classList.remove('hidden');
        } else {
          aiContainer.classList.add('hidden');
        }
        invalidateValidation('ai');
      });
    }

    bindInput(geminiInput, 'gemini');
    bindInput(openrouterInput, 'openrouter');

    // 3. Botón de Verificación de Claves API (Obligatorio para continuar)
    if (btnValidate) {
      btnValidate.addEventListener('click', async () => {
        btnValidate.disabled = true;
        btnValidate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Probando credenciales...</span>';

        let allValid = true;
        const validationMap = {};

        // Validar TMDB (Obligatoria)
        const tmdbKey = (state.apiKeys.tmdb || '').trim();
        const tmdbBadge = document.getElementById('badge-tmdb');
        if (!tmdbKey || tmdbKey.length < 8) {
          allValid = false;
          if (tmdbBadge) {
            tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
            tmdbBadge.innerText = '✗ Obligatoria';
          }
        } else {
          try {
            const res = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(tmdbKey)}`);
            if (res.ok) {
              validationMap.tmdb = true;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                tmdbBadge.innerText = '✓ Válida';
              }
            } else {
              allValid = false;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                tmdbBadge.innerText = '✗ Inválida';
              }
            }
          } catch (_) {
            if (tmdbKey.length === 32) {
              validationMap.tmdb = true;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                tmdbBadge.innerText = '✓ Válida';
              }
            } else {
              allValid = false;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                tmdbBadge.innerText = '✗ Error de red';
              }
            }
          }
        }

        // Validar Búsqueda con IA si está activa
        if (state.searchAiEnabled) {
          const geminiKey = (state.apiKeys.gemini || '').trim();
          const openrouterKey = (state.apiKeys.openrouter || '').trim();
          const geminiBadge = document.getElementById('badge-gemini');
          const openrouterBadge = document.getElementById('badge-openrouter');

          if (!geminiKey && !openrouterKey) {
            allValid = false;
            this.showToast('Búsqueda con IA activa: ingresa clave de Gemini u OpenRouter.', 'warning');
          }

          if (geminiKey) {
            try {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`);
              if (res.ok) {
                if (geminiBadge) {
                  geminiBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                  geminiBadge.innerText = '✓ Válida';
                }
              } else {
                allValid = false;
                if (geminiBadge) {
                  geminiBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                  geminiBadge.innerText = '✗ Inválida';
                }
              }
            } catch (_) {
              if (geminiKey.startsWith('AIzaSy') && geminiKey.length >= 30 && geminiBadge) {
                geminiBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                geminiBadge.innerText = '✓ Válida';
              }
            }
          }

          if (openrouterKey) {
            try {
              const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
                headers: { 'Authorization': `Bearer ${openrouterKey}` }
              });
              if (res.ok) {
                if (openrouterBadge) {
                  openrouterBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                  openrouterBadge.innerText = '✓ Válida';
                }
              } else {
                allValid = false;
                if (openrouterBadge) {
                  openrouterBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                  openrouterBadge.innerText = '✗ Inválida';
                }
              }
            } catch (_) {
              if ((openrouterKey.startsWith('sk-or-v1-') || openrouterKey.length >= 20) && openrouterBadge) {
                openrouterBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                openrouterBadge.innerText = '✓ Válida';
              }
            }
          }
        }

        // Validar opcionales si fueron provistas
        const mdblistKey = (state.apiKeys.mdblist || '').trim();
        const mdblistBadge = document.getElementById('badge-mdblist');
        if (mdblistKey) {
          try {
            const res = await fetch(`https://mdblist.com/api/?apikey=${encodeURIComponent(mdblistKey)}&s=avatar`);
            if (res.ok) {
              if (mdblistBadge) {
                mdblistBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                mdblistBadge.innerText = '✓ Válida';
              }
            } else {
              allValid = false;
              if (mdblistBadge) {
                mdblistBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                mdblistBadge.innerText = '✗ Inválida';
              }
            }
          } catch (_) {
            if (mdblistKey.length >= 10 && mdblistBadge) {
              mdblistBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
              mdblistBadge.innerText = '✓ Válida';
            }
          }
        }

        const fanartKey = (state.apiKeys.fanart || '').trim();
        const fanartBadge = document.getElementById('badge-fanart');
        if (fanartKey && fanartBadge) {
          fanartBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
          fanartBadge.innerText = '✓ Válida';
        }

        const rpdbBadge = document.getElementById('badge-rpdb');
        if (rpdbBadge) {
          rpdbBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
          rpdbBadge.innerText = '✓ Válida';
        }

        // Resultado Final
        if (allValid) {
          state.setApiKeysValidation(true, validationMap);
          if (overallBadge) overallBadge.classList.remove('hidden');
          if (statusMsg) {
            statusMsg.innerText = '✓ Todas las claves han sido comprobadas con éxito. Ya puedes avanzar al siguiente paso.';
            statusMsg.className = 'text-[11px] text-emerald-400 mt-0.5 font-medium';
          }
          this.showToast('✓ Claves API verificadas exitosamente', 'success');
          this.updateUI();
        } else {
          state.setApiKeysValidation(false, validationMap);
          if (overallBadge) overallBadge.classList.add('hidden');
          if (statusMsg) {
            statusMsg.innerText = 'No se pudieron verificar una o más claves. Revisa los campos marcados en rojo.';
            statusMsg.className = 'text-[11px] text-red-400 mt-0.5 font-medium';
          }
          this.showToast('Revisa las claves marcadas en rojo para continuar', 'error');
        }

        btnValidate.disabled = false;
        btnValidate.innerHTML = '<i class="fa-solid fa-vial-circle-check"></i><span>Probar Claves API</span>';
      });
    }

    // 4. Botones de alternar visibilidad de contraseña (eye icon)
    document.querySelectorAll('.btn-toggle-key').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
          }
        } else {
          input.type = 'password';
          if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
          }
        }
      });
    });
  }

  setupStep5Injection() {
    const passwordInput = document.getElementById('aioPassword');
    const btnGenPass = document.getElementById('btnGeneratePassword');
    const btnExecute = document.getElementById('btnExecutePipeline');
    const btnDownloadCol = document.getElementById('btnDownloadCollections');
    const btnDownloadAio = document.getElementById('btnDownloadAioConfig');

    // Forzar modo Real en producción
    state.execution.mode = 'real';

    if (passwordInput) {
      passwordInput.value = state.aiometadata.password || '';
      passwordInput.addEventListener('input', (e) => {
        state.aiometadata.password = e.target.value;
        this.updateStep5ExecuteButton();
        this.updateManualModeButtons();
        this.updateNavigationButtons();
      });
    }

    if (btnGenPass && passwordInput) {
      btnGenPass.addEventListener('click', () => {
        const randomPass = 'Latino-' + Math.random().toString(36).substring(2, 8) + '-' + Math.floor(1000 + Math.random() * 9000);
        passwordInput.value = randomPass;
        state.aiometadata.password = randomPass;
        this.updateStep5ExecuteButton();
        this.updateManualModeButtons();
        this.updateNavigationButtons();
        this.showToast('Contraseña aleatoria generada y configurada', 'info');
      });
    }

    // Botones de Modo Manual: Copiar JSON al portapapeles
    const btnCopyCol = document.getElementById('btnCopyCollectionsJson');
    const btnCopyAio = document.getElementById('btnCopyAioConfig');

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
        const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 4);
        if (!hasPassword) {
          this.showToast('Debes ingresar o generar una contraseña para el addon (mínimo 4 caracteres) primero.', 'warning');
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

    if (btnExecute) {
      btnExecute.addEventListener('click', () => {
        // Validar todos los pasos (1 a 5) antes de ejecutar
        for (let i = 1; i <= 5; i++) {
          const val = state.validateStep(i);
          if (!val.valid) {
            this.showToast(`Paso ${i} incompleto: ${val.error}`, 'error');
            if (i < 5) window.goToStep(i);
            if (i === 5 && passwordInput) passwordInput.focus();
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

        PipelineInjector.execute();
      });
    }

    if (btnDownloadCol) {
      btnDownloadCol.addEventListener('click', () => {
        PipelineInjector.downloadCollectionsJson();
      });
    }

    if (btnDownloadAio) {
      btnDownloadAio.addEventListener('click', () => {
        const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 4);
        if (state.isManualMode && !hasPassword) {
          this.showToast('Debes ingresar o generar una contraseña para el addon (mínimo 4 caracteres) primero.', 'warning');
          if (passwordInput) passwordInput.focus();
          return;
        }
        PipelineInjector.downloadAioConfigJson();
      });
    }
  }

  refreshStep5Summary() {
    const targetEl = document.getElementById('summaryProfileTarget');
    const countEl = document.getElementById('summaryCollectionsCount');
    const catalogsEl = document.getElementById('summaryCatalogsCount');

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
    if (countEl) countEl.innerText = `${activeFolders} carruseles seleccionados`;
    if (catalogsEl) catalogsEl.innerText = `${catalogsCount} catálogos sincronizados`;
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

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  appController.init();
});
