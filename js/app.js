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

    await state.loadTemplates();
    this.miniNuvio.init();

    // 2. Configurar eventos de navegación y formularios
    this.setupNavigation();
    this.setupStep1Events();
    this.setupStep2Profiles();
    this.setupStep4ApiKeys();
    this.setupStep5AIOMetadata();
    this.setupStep6Execution();

    // 3. Suscribirse al estado para actualizar la UI reactiva
    state.subscribe((s, eventType) => {
      this.handleStateUpdate(s, eventType);
    });

    // 4. Mostrar paso inicial
    this.updateUI();
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
    window.goToStep = (targetStep) => {
      if (targetStep === state.currentStep) return;

      // Retroceder siempre está permitido para revisar datos previos
      if (targetStep < state.currentStep) {
        state.currentStep = targetStep;
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
      this.updateUI();
    };

    window.changeStep = (delta) => {
      const next = state.currentStep + delta;
      if (next < 1 || next > state.totalSteps) return;

      // Retroceder 1 paso
      if (delta < 0) {
        state.currentStep = next;
        this.updateUI();
        return;
      }

      // Avanzar 1 paso: validar paso actual
      const val = state.validateStep(state.currentStep);
      if (!val.valid) {
        this.showToast(val.error, 'warning');
        return;
      }

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

    // Actualizar botones de navegación superior en cápsulas (Pills)
    for (let i = 1; i <= totalSteps; i++) {
      const capsule = document.getElementById(`capsule-step-${i}`);
      if (!capsule) continue;

      const isCurrent = (i === currentStep);
      const isUnlocked = (i <= maxUnlockedStep);
      const statusIcon = capsule.querySelector('.step-icon-status');

      if (isCurrent) {
        capsule.className = "step-capsule active";
        if (statusIcon) statusIcon.className = "step-icon-status hidden";
      } else if (i < currentStep) {
        // Pasos anteriores ya completados
        capsule.className = "step-capsule completed";
        if (statusIcon) statusIcon.className = "fa-solid fa-circle-check text-emerald-400 text-xs step-icon-status";
      } else if (isUnlocked) {
        // Siguiente paso desbloqueado disponible
        capsule.className = "step-capsule completed";
        if (statusIcon) statusIcon.className = "step-icon-status hidden";
      } else {
        // Paso bloqueado
        capsule.className = "step-capsule locked";
        if (statusIcon) statusIcon.className = "fa-solid fa-lock text-slate-500 text-[10px] step-icon-status";
      }
    }

    // Controles inferiores
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const stepCounter = document.getElementById('stepCounter');

    if (btnBack) btnBack.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.display = (currentStep === totalSteps) ? 'none' : 'flex';
    if (stepCounter) stepCounter.innerText = `Paso ${currentStep} de ${totalSteps}`;

    // Si estamos en el paso 6, refrescar resumen
    if (currentStep === 6) {
      this.refreshStep6Summary();
    }
  }

  setupStep1Events() {
    const emailInput = document.getElementById('nuvioEmail');
    const passInput = document.getElementById('nuvioPassword');
    const btnConnect = document.getElementById('btnNuvioConnect');
    const btnSignup = document.getElementById('btnNuvioSignup');
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabSignup = document.getElementById('tabAuthSignup');
    const headingText = document.getElementById('authHeadingText');
    const headingIcon = document.getElementById('authHeadingIcon');
    const subtitle = document.getElementById('authSubtitle');
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
        if (headingIcon) headingIcon.className = "fa-solid fa-user-lock text-brand-500 text-lg";
        if (subtitle) subtitle.innerText = "El asistente se comunicará con la API pública de Nuvio directamente desde tu navegador.";
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
        if (headingIcon) headingIcon.className = "fa-solid fa-user-plus text-emerald-400 text-lg";
        if (subtitle) subtitle.innerText = "Registra tu cuenta oficial en Nuvio de forma gratuita directamente desde aquí.";
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
      });
    }

    if (passInput) {
      passInput.addEventListener('input', (e) => {
        state.nuvioAuth.password = e.target.value;
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
          btnSignup.innerHTML = '<i class="fa-solid fa-user-plus mr-1"></i> Crear Cuenta Oficial en Nuvio';
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
          state.profiles.push(newProfile);
          state.selectedProfileId = newProfile.id;
          state.selectedProfileName = newProfile.name || name;
          state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)

          this.renderProfiles();
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

  renderProfiles() {
    const container = document.getElementById('profilesContainer');
    if (!container) return;

    if (state.profiles && state.profiles.length > 0) {
      container.innerHTML = state.profiles.map((p, idx) => {
        const isSelected = state.selectedProfileId === p.id || (!state.selectedProfileId && idx === 0);
        if (isSelected && !state.selectedProfileId) {
          state.selectedProfileId = p.id;
          state.selectedProfileName = p.name || p.title || `Perfil ${idx + 1}`;
          state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
        }

        const name = p.name || p.title || `Perfil ${idx + 1}`;
        const avatar = p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

        return `
          <label class="cursor-pointer border ${isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'} p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
            <input type="radio" name="profile_select" value="${p.id}" ${isSelected ? 'checked' : ''} onchange="window.appController.selectProfile('${p.id}', '${name.replace(/'/g, "\\'")}')" class="hidden">
            <img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full border-2 ${isSelected ? 'border-brand-500' : 'border-slate-700'} object-cover">
            <span class="text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}">${name}</span>
            <span class="text-[10px] ${isSelected ? 'text-brand-400 font-semibold uppercase tracking-wider' : 'text-slate-500'}">
              ${isSelected ? 'Seleccionado' : 'Click para elegir'}
            </span>
          </label>
        `;
      }).join('');
    } else {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-xl p-6">
          <i class="fa-solid fa-user-circle text-4xl text-slate-600 mb-2"></i>
          <p class="text-sm font-medium text-slate-300">No se encontraron perfiles en tu cuenta de Nuvio</p>
          <p class="text-xs text-slate-500 mt-1">Usa la opción de abajo para crear tu primer perfil directamente.</p>
        </div>
      `;
    }
  }

  selectProfile(id, name) {
    state.selectedProfileId = id;
    state.selectedProfileName = name;
    state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
    this.renderProfiles();
    this.updateUI();
  }

  setupStep4ApiKeys() {
    const tmdbInput = document.getElementById('tmdbApiKey');
    const mdblistInput = document.getElementById('mdblistApiKey');
    const traktInput = document.getElementById('traktToken');

    const checkStep4Unlock = () => {
      if (state.apiKeys.tmdb && state.apiKeys.tmdb.length >= 8) {
        state.unlockStep(5); // Desbloquea Paso 5 (AIOMetadata)
        this.updateUI();
      }
    };

    if (tmdbInput) {
      tmdbInput.addEventListener('input', (e) => {
        state.apiKeys.tmdb = e.target.value.trim();
        checkStep4Unlock();
      });
    }
    if (mdblistInput) {
      mdblistInput.addEventListener('input', (e) => {
        state.apiKeys.mdblist = e.target.value.trim();
      });
    }
    if (traktInput) {
      traktInput.addEventListener('input', (e) => {
        state.apiKeys.trakt = e.target.value.trim();
      });
    }
  }

  setupStep5AIOMetadata() {
    const instanceInput = document.getElementById('aioInstanceUrl');
    const passwordInput = document.getElementById('aioPassword');
    const btnGenPass = document.getElementById('btnGeneratePassword');

    const checkStep5Unlock = () => {
      if (state.aiometadata.password && state.aiometadata.password.length >= 4) {
        state.unlockStep(6); // Desbloquea Paso 6 (Inyección)
        this.updateUI();
      }
    };

    if (instanceInput) {
      instanceInput.value = state.aiometadata.instanceUrl;
      instanceInput.addEventListener('input', (e) => {
        state.aiometadata.instanceUrl = e.target.value.trim() || CONFIG.DEFAULT_AIOMETADATA_URL;
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', (e) => {
        state.aiometadata.password = e.target.value;
        checkStep5Unlock();
      });
    }

    if (btnGenPass && passwordInput) {
      btnGenPass.addEventListener('click', () => {
        const randomPass = 'Latino-' + Math.random().toString(36).substring(2, 8) + '-' + Math.floor(1000 + Math.random() * 9000);
        passwordInput.value = randomPass;
        state.aiometadata.password = randomPass;
        checkStep5Unlock();
        this.showToast('Contraseña aleatoria generada y configurada', 'info');
      });
    }
  }

  setupStep6Execution() {
    const btnExecute = document.getElementById('btnExecutePipeline');
    const modeSimRadio = document.getElementById('modeSimulation');
    const modeRealRadio = document.getElementById('modeReal');
    const btnDownloadCol = document.getElementById('btnDownloadCollections');
    const btnDownloadAio = document.getElementById('btnDownloadAioConfig');

    if (modeSimRadio) {
      modeSimRadio.addEventListener('change', () => {
        if (modeSimRadio.checked) state.execution.mode = 'simulation';
      });
    }

    if (modeRealRadio) {
      modeRealRadio.addEventListener('change', () => {
        if (modeRealRadio.checked) state.execution.mode = 'real';
      });
    }

    if (btnExecute) {
      btnExecute.addEventListener('click', () => {
        // Validar todos los pasos anteriores antes de ejecutar
        for (let i = 1; i <= 5; i++) {
          const val = state.validateStep(i);
          if (!val.valid) {
            this.showToast(`Paso ${i} incompleto: ${val.error}`, 'error');
            window.goToStep(i);
            return;
          }
        }
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
        PipelineInjector.downloadAioConfigJson();
      });
    }
  }

  refreshStep6Summary() {
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
      catalogsCount = meta.catalogs.length;
    } catch (_) {
      catalogsCount = 0;
    }

    if (targetEl) targetEl.innerText = state.selectedProfileName || 'Perfil Principal';
    if (countEl) countEl.innerText = `${activeFolders} carruseles seleccionados`;
    if (catalogsEl) catalogsEl.innerText = `${catalogsCount} catálogos sincronizados`;
  }

  handleStateUpdate(s, eventType) {
    if (eventType === 'LOG_ADDED') {
      this.renderLogs();
    } else if (eventType === 'LOGS_CLEARED') {
      const consoleEl = document.getElementById('consoleLog');
      if (consoleEl) consoleEl.innerHTML = '';
    } else if (eventType === 'EXECUTION_FINISHED') {
      const btnExecute = document.getElementById('btnExecutePipeline');
      if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.innerHTML = '<i class="fa-solid fa-bolt"></i><span>Re-ejecutar Configuración</span>';
      }
    } else if (eventType === 'STEP_UNLOCKED') {
      this.updateUI();
    }
  }

  renderLogs() {
    const consoleEl = document.getElementById('consoleLog');
    if (!consoleEl) return;

    consoleEl.innerHTML = state.execution.logs.map(log => {
      let colorClass = 'log-info';
      if (log.type === 'success') colorClass = 'log-success';
      if (log.type === 'warning') colorClass = 'log-warning';
      if (log.type === 'error') colorClass = 'log-error';

      return `<div class="${colorClass}">[${log.timestamp}] ${log.message}</div>`;
    }).join('');

    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
}

// Instanciar y exportar
export const appController = new AppController();
window.appController = appController;

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  appController.init();
});
