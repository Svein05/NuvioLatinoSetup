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
    this.setupStep3ApiKeys();
    this.setupStep5AIOMetadata();
    this.setupStep6Execution();

    // 3. Suscribirse al estado para actualizar la UI reactiva
    state.subscribe((s, eventType) => {
      this.handleStateUpdate(s, eventType);
    });

    // 4. Mostrar paso inicial
    this.updateUI();
  }

  setupNavigation() {
    window.goToStep = (step) => {
      if (step >= 1 && step <= state.totalSteps) {
        state.currentStep = step;
        this.updateUI();
      }
    };

    window.changeStep = (delta) => {
      const next = state.currentStep + delta;
      if (next >= 1 && next <= state.totalSteps) {
        state.currentStep = next;
        this.updateUI();
      }
    };
  }

  updateUI() {
    const { currentStep, totalSteps } = state;

    // Cambiar visibilidad de los paneles de contenido
    for (let i = 1; i <= totalSteps; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) {
        el.classList.toggle('active', i === currentStep);
      }
    }

    // Actualizar botones de navegación lateral
    for (let i = 1; i <= totalSteps; i++) {
      const btn = document.getElementById(`nav-btn-${i}`);
      if (!btn) continue;
      if (i === currentStep) {
        btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors bg-brand-600/10 text-brand-500 font-medium border border-brand-500/20";
      } else {
        btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent";
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
    const apikeyInput = document.getElementById('nuvioApikey');
    const btnConnect = document.getElementById('btnNuvioConnect');

    if (emailInput) {
      emailInput.addEventListener('input', (e) => {
        state.nuvioAuth.email = e.target.value;
      });
    }

    if (passInput) {
      passInput.addEventListener('input', (e) => {
        state.nuvioAuth.password = e.target.value;
      });
    }

    if (apikeyInput) {
      apikeyInput.value = state.nuvioAuth.apikey;
      apikeyInput.addEventListener('input', (e) => {
        state.nuvioAuth.apikey = e.target.value.trim() || CONFIG.NUVIO_PUBLIC_ANON_KEY;
      });
    }

    if (btnConnect) {
      btnConnect.addEventListener('click', async () => {
        const email = emailInput?.value?.trim();
        const password = passInput?.value;
        const apikey = apikeyInput?.value?.trim() || CONFIG.NUVIO_PUBLIC_ANON_KEY;

        if (!email || !password) {
          alert('Por favor ingresa tu correo y contraseña de Nuvio.');
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

          // Obtener perfiles
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
          }

          this.renderProfiles();
          this.setAuthBadge(true);
          alert('✓ ¡Sesión iniciada con éxito! Perfiles obtenidos de tu cuenta.');
        } catch (err) {
          alert(`❌ Error al conectar: ${err.message}`);
          this.setAuthBadge(false);
        } finally {
          btnConnect.disabled = false;
          btnConnect.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> Conectar Cuenta';
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
  }

  renderProfiles() {
    const container = document.getElementById('profilesContainer');
    if (!container) return;

    // Si hay perfiles reales cargados desde la API
    if (state.profiles && state.profiles.length > 0) {
      container.innerHTML = state.profiles.map((p, idx) => {
        const isSelected = state.selectedProfileId === p.id || (!state.selectedProfileId && idx === 0);
        if (isSelected && !state.selectedProfileId) {
          state.selectedProfileId = p.id;
          state.selectedProfileName = p.name || p.title || `Perfil ${idx + 1}`;
        }

        const name = p.name || p.title || `Perfil ${idx + 1}`;
        const avatar = p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

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
      // Perfiles mock para testing libre sin login previo
      const mockProfiles = [
        { id: 'mock-p1', name: 'Principal (Test)', label: 'P1' },
        { id: 'mock-p2', name: 'Secundario (Test)', label: 'P2' },
        { id: 'mock-p3', name: 'Invitados (Test)', label: 'P3' }
      ];

      container.innerHTML = mockProfiles.map((p, idx) => {
        const isSelected = (!state.selectedProfileId && idx === 0) || state.selectedProfileId === p.id;
        if (isSelected && !state.selectedProfileId) {
          state.selectedProfileId = p.id;
          state.selectedProfileName = p.name;
        }

        return `
          <label class="cursor-pointer border ${isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'} p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
            <input type="radio" name="profile_select" value="${p.id}" ${isSelected ? 'checked' : ''} onchange="window.appController.selectProfile('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="hidden">
            <div class="w-12 h-12 rounded-full bg-slate-800 border-2 ${isSelected ? 'border-brand-500 text-brand-400' : 'border-slate-700 text-slate-400'} flex items-center justify-center text-lg font-bold">${p.label}</div>
            <span class="text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-400'}">${p.name}</span>
            <span class="text-[10px] ${isSelected ? 'text-brand-400 font-semibold uppercase tracking-wider' : 'text-slate-500'}">
              ${isSelected ? 'Seleccionado' : 'Click para elegir'}
            </span>
          </label>
        `;
      }).join('');
    }
  }

  selectProfile(id, name) {
    state.selectedProfileId = id;
    state.selectedProfileName = name;
    this.renderProfiles();
  }

  setupStep3ApiKeys() {
    const tmdbInput = document.getElementById('tmdbApiKey');
    const mdblistInput = document.getElementById('mdblistApiKey');
    const traktInput = document.getElementById('traktToken');

    if (tmdbInput) {
      tmdbInput.addEventListener('input', (e) => { state.apiKeys.tmdb = e.target.value.trim(); });
    }
    if (mdblistInput) {
      mdblistInput.addEventListener('input', (e) => { state.apiKeys.mdblist = e.target.value.trim(); });
    }
    if (traktInput) {
      traktInput.addEventListener('input', (e) => { state.apiKeys.trakt = e.target.value.trim(); });
    }
  }

  setupStep5AIOMetadata() {
    const instanceInput = document.getElementById('aioInstanceUrl');
    const passwordInput = document.getElementById('aioPassword');
    const btnGenPass = document.getElementById('btnGeneratePassword');

    if (instanceInput) {
      instanceInput.value = state.aiometadata.instanceUrl;
      instanceInput.addEventListener('input', (e) => {
        state.aiometadata.instanceUrl = e.target.value.trim() || CONFIG.DEFAULT_AIOMETADATA_URL;
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', (e) => {
        state.aiometadata.password = e.target.value;
      });
    }

    if (btnGenPass && passwordInput) {
      btnGenPass.addEventListener('click', () => {
        const randomPass = 'Latino-' + Math.random().toString(36).substring(2, 8) + '-' + Math.floor(1000 + Math.random() * 9000);
        passwordInput.value = randomPass;
        state.aiometadata.password = randomPass;
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
