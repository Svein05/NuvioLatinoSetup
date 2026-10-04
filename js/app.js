/**
 * Controlador Principal de la Aplicación (UI y Eventos)
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { state } from './state.js';
import { CONFIG } from './config.js';
import { MiniNuvio } from './mini-nuvio.js';
import { NuvioClient } from './nuvio-client.js';
import { PipelineInjector } from './injector.js';
import { 
  BADGE_PACKS, 
  getBadgePackById, 
  getBadgePackUrl, 
  addCustomBadgePack,
  BADGE_MODULE_DEFINITIONS,
  getBadgeModuleLabel,
  getPackSectionsOrdered,
  normalizeBadgeColor,
  getCanonicalModuleId,
  isSectionActive,
  compileUniversalBadgeRules
} from './badge-packs.js';
import { initCompletionsCounterUI, recordSuccessfulCompletion } from './counter.js';

// Catálogo de 30 títulos icónicos para la demostración sincronizada de carátulas (Paso 5)
export const DEMO_POSTERS = [
  // --- 10 CLÁSICOS DEL ANIME ---
  {
    title: 'Naruto',
    category: 'Anime',
    imdbId: 'tt0409591',
    tmdbId: '46260',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/vauCOvPFl9eeagGhBtY39h4xf63.jpg'
  },
  {
    title: 'Dragon Ball Z',
    category: 'Anime',
    imdbId: 'tt0214341',
    tmdbId: '12971',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/dZyGv2iIe7U7eIqgWd5w8c2N2rG.jpg'
  },
  {
    title: 'Death Note',
    category: 'Anime',
    imdbId: 'tt0877057',
    tmdbId: '13916',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/iigTJJskR1Pcjj0G9GvK9e3T7Qx.jpg'
  },
  {
    title: 'Attack on Titan',
    category: 'Anime',
    imdbId: 'tt2560140',
    tmdbId: '1429',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/hTP1IIxDHgVzgQIO4SVASAWqQO.jpg'
  },
  {
    title: 'One Piece',
    category: 'Anime',
    imdbId: 'tt0388629',
    tmdbId: '37854',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/fcXdJlbSdUEeMSJFsXKszvG2vQv.jpg'
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    category: 'Anime',
    imdbId: 'tt1340177',
    tmdbId: '31911',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/5ZFUEO2Z881g9ur7e8X664J1.jpg'
  },
  {
    title: 'Demon Slayer (Kimetsu no Yaiba)',
    category: 'Anime',
    imdbId: 'tt9335498',
    tmdbId: '85937',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg'
  },
  {
    title: 'Hunter x Hunter',
    category: 'Anime',
    imdbId: 'tt2098220',
    tmdbId: '46298',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/ucmpFdW9yvI78bA52s1T12p0A4T.jpg'
  },
  {
    title: 'El Viaje de Chihiro',
    category: 'Anime',
    imdbId: 'tt0245429',
    tmdbId: '129',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/393DNTQiq0rno8kJJbMqlPoYUm.jpg'
  },
  {
    title: 'Cowboy Bebop',
    category: 'Anime',
    imdbId: 'tt0213338',
    tmdbId: '30991',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/xDiXDfZwC6XYC6fxHI1jl3A3Ill.jpg'
  },

  // --- 10 TOP PELÍCULAS IMDB ---
  {
    title: 'Sueños de Fuga (Shawshank Redemption)',
    category: 'Película',
    imdbId: 'tt0111161',
    tmdbId: '278',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg'
  },
  {
    title: 'El Padrino (The Godfather)',
    category: 'Película',
    imdbId: 'tt0068646',
    tmdbId: '238',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'
  },
  {
    title: 'El Caballero de la Noche (The Dark Knight)',
    category: 'Película',
    imdbId: 'tt0468569',
    tmdbId: '155',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'
  },
  {
    title: 'Pulp Fiction',
    category: 'Película',
    imdbId: 'tt0110912',
    tmdbId: '680',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg'
  },
  {
    title: 'El Club de la Pelea (Fight Club)',
    category: 'Película',
    imdbId: 'tt0137523',
    tmdbId: '550',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
  },
  {
    title: 'El Origen (Inception)',
    category: 'Película',
    imdbId: 'tt1375666',
    tmdbId: '27205',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg'
  },
  {
    title: 'Interestelar (Interstellar)',
    category: 'Película',
    imdbId: 'tt0816692',
    tmdbId: '157336',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
  },
  {
    title: 'Matrix (The Matrix)',
    category: 'Película',
    imdbId: 'tt0133093',
    tmdbId: '603',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg'
  },
  {
    title: 'Gladiador (Gladiator)',
    category: 'Película',
    imdbId: 'tt0172495',
    tmdbId: '98',
    type: 'movie',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg'
  },
  {
    title: 'Superman (2025)',
    category: 'Película',
    imdbId: 'tt5950044',
    tmdbId: '1061474',
    type: 'movie',
    fallbackPoster: 'https://upload.wikimedia.org/wikipedia/en/3/32/Superman_%282025_film%29_poster.jpg'
  },

  // --- 10 TOP SERIES IMDB ---
  {
    title: 'Breaking Bad',
    category: 'Serie',
    imdbId: 'tt0903747',
    tmdbId: '1396',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg'
  },
  {
    title: 'Game of Thrones',
    category: 'Serie',
    imdbId: 'tt0944947',
    tmdbId: '1399',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg'
  },
  {
    title: 'Chernobyl',
    category: 'Serie',
    imdbId: 'tt8756663',
    tmdbId: '87108',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg'
  },
  {
    title: 'Los Soprano (The Sopranos)',
    category: 'Serie',
    imdbId: 'tt0141842',
    tmdbId: '1398',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/57bUBY1b30uQWvT4Hq7R6B35i2A.jpg'
  },
  {
    title: 'The Wire',
    category: 'Serie',
    imdbId: 'tt0306414',
    tmdbId: '1438',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/4lbclFySvugI51fwsyxBTOm4DqK.jpg'
  },
  {
    title: 'Stranger Things',
    category: 'Serie',
    imdbId: 'tt4574334',
    tmdbId: '66732',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg'
  },
  {
    title: 'The Last of Us',
    category: 'Serie',
    imdbId: 'tt3581920',
    tmdbId: '100088',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrRI.jpg'
  },
  {
    title: 'Better Call Saul',
    category: 'Serie',
    imdbId: 'tt3032476',
    tmdbId: '60059',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/fC2HDm5t0kHVR79vis7SeRJaxHQ.jpg'
  },
  {
    title: 'Severance',
    category: 'Serie',
    imdbId: 'tt11280740',
    tmdbId: '95396',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg'
  },
  {
    title: 'The Boys',
    category: 'Serie',
    imdbId: 'tt1190634',
    tmdbId: '76479',
    type: 'series',
    fallbackPoster: 'https://image.tmdb.org/t/p/w500/7Ns6tO3aYjpp4KDTfD3T53o5fFq.jpg'
  }
];

class AppController {
  constructor() {
    this.miniNuvio = null;
    this.currentDemoIndex = 19; // Superman (2025) por defecto
    this.currentDemoItem = DEMO_POSTERS[19] || DEMO_POSTERS[0];
    this.posterRotationTimer = null;
    this.posterDeck = [];
    this.isTransitioningPoster = false;
    this.profilePendingDelete = null;
    this.nextDemoPoster = this.nextDemoPoster.bind(this);
    this.prevDemoPoster = this.prevDemoPoster.bind(this);
  }

  async init() {
    // 1. Inicializar Mini Nuvio y Cargar Plantillas
    this.miniNuvio = new MiniNuvio('miniNuvioContainer');
    window.miniNuvioInstance = this.miniNuvio;
    window.appController = this;

    // Inicializar contador global de configuraciones
    initCompletionsCounterUI();

    await state.loadTemplates();
    this.miniNuvio.init();

    // 2. Configurar eventos de navegación y formularios
    this.setupNavigation();
    this.setupStep1Events();
    this.setupStep2Profiles();
    this.setupStep3ApiKeys();
    this.setupStep5Preferences();
    this.setupStep6AddonsManager();
    this.setupStep7Injection();

    // 2.1 Restaurar sesión si existe
    this.restoreSession();

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
   * Sistema de Notificaciones Flotantes (Toasts) Cinemático LAT-ADD
   * @param {string} message 
   * @param {'info' | 'success' | 'warning' | 'error'} type 
   * @param {number} duration 
   */
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'lat-toast is-entering';

    let badgeIcon = 'fa-circle-info';
    let badgeStyle = 'bg-white/[0.08] border-white/20 text-[#ffd479]';

    if (type === 'success') {
      badgeIcon = 'fa-check';
      badgeStyle = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    } else if (type === 'error') {
      badgeIcon = 'fa-xmark';
      badgeStyle = 'bg-rose-500/15 border-rose-500/30 text-rose-400';
    } else if (type === 'warning') {
      badgeIcon = 'fa-triangle-exclamation';
      badgeStyle = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    }

    // Limpiar caracteres redundantes al inicio del mensaje para mayor elegancia visual
    const cleanMessage = String(message).replace(/^[✓✔🎉⚠️💡]\s*/u, '').trim();

    toast.innerHTML = `
      <div class="w-6 h-6 rounded-full border ${badgeStyle} flex items-center justify-center shrink-0 text-[11px] shadow-[var(--brillo-vidrio)]">
        <i class="fa-solid ${badgeIcon}"></i>
      </div>
      <span class="text-white/90 text-xs font-medium leading-snug">${cleanMessage}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('is-entering');
      toast.classList.add('is-visible');
    });

    setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 280);
    }, duration);
  }

  saveSession() {
    try {
      if (typeof sessionStorage === 'undefined') return;
      if (state.nuvioAuth.isAuthenticated && state.nuvioAuth.accessToken) {
        sessionStorage.setItem('nuvio_wizard_auth', JSON.stringify({
          auth: state.nuvioAuth,
          profiles: state.profiles,
          selectedProfileId: state.selectedProfileId,
          selectedProfileName: state.selectedProfileName,
          newlyCreatedProfileIds: Array.from(state.newlyCreatedProfileIds || []),
          currentStep: state.currentStep,
          maxUnlockedStep: state.maxUnlockedStep
        }));
      }
    } catch (_) {}
  }

  restoreSession() {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const raw = sessionStorage.getItem('nuvio_wizard_auth');
      if (!raw) return;
      const data = JSON.parse(raw);
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
      this.refreshStep7Summary();
      this.updateStep7ExecuteButton();
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

    const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 4);
    if (hasPassword) {
      btnExecute.disabled = false;
      btnExecute.className = "lat-capsule-btn solid px-7 py-3 text-sm flex items-center gap-2 shadow-[var(--shadow-lift)] cursor-pointer";
      btnExecute.title = "Ejecutar la inyección y configuración automática";
    } else {
      btnExecute.disabled = true;
      btnExecute.className = "lat-capsule-btn glass opacity-40 px-7 py-3 text-sm flex items-center gap-2 cursor-not-allowed shadow-none";
      btnExecute.title = "Ingresa o genera una contraseña maestra (mínimo 4 caracteres) para activar";
    }
  }

  updateManualModeButtons() {
    const btnCopyAio = document.getElementById('btnCopyAioConfig');
    const btnDownloadAio = document.getElementById('btnDownloadAioConfig');
    const btnCopyBadge = document.getElementById('btnCopyBadgeUrl');
    const btnCopyBadgeCompiled = document.getElementById('btnCopyBadgeCompiledJson');
    const btnDownloadBadges = document.getElementById('btnDownloadBadges');
    const isBadgesEnabled = Boolean(state.preferences && state.preferences.badgesEnabled);

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

    if (!btnCopyAio) return;

    const hasPassword = Boolean(state.aiometadata.password && state.aiometadata.password.length >= 4);

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
      btnCopyAio.title = "Ingresa una contraseña para el addon (mínimo 4 caracteres) primero";
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
    const emailInput = document.getElementById('nuvioEmail');
    const passInput = document.getElementById('nuvioPassword');
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const confirmInput = document.getElementById('nuvioPasswordConfirm');
    const matchBadge = document.getElementById('passwordMatchBadge');
    const btnConnect = document.getElementById('btnNuvioConnect');
    const btnSignup = document.getElementById('btnNuvioSignup');
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabSignup = document.getElementById('tabAuthSignup');
    const headingText = document.getElementById('authHeadingText');
    const hintText = document.getElementById('authHintText');

    let authMode = 'login'; // 'login' | 'signup'

    const pillIndicator = document.getElementById('authPillIndicator');

    const validatePasswordMatch = () => {
      if (authMode !== 'signup' || !confirmInput || !matchBadge) return;
      const p1 = passInput ? passInput.value : '';
      const p2 = confirmInput ? confirmInput.value : '';
      const baseInputClass = "w-full px-4 py-3 pr-10 rounded-[16px] bg-white/[0.04] text-sm text-white placeholder:text-white/30 shadow-[var(--brillo-vidrio)] transition-all focus:outline-none focus:ring-2";

      if (!p2) {
        matchBadge.className = 'text-[11px] text-white/40 mt-1 hidden flex items-center gap-1 font-medium';
        matchBadge.innerHTML = '';
        confirmInput.className = `${baseInputClass} border border-white/[0.12] focus:border-white/40 focus:ring-white/10`;
        return;
      }

      matchBadge.classList.remove('hidden');
      if (p1 === p2) {
        confirmInput.className = `${baseInputClass} border border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/20`;
        matchBadge.className = 'text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium';
        matchBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-xs"></i> <span>Las contraseñas coinciden perfectamente.</span>';
      } else {
        confirmInput.className = `${baseInputClass} border border-rose-400/60 focus:border-rose-400 focus:ring-rose-400/20`;
        matchBadge.className = 'text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium';
        matchBadge.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400 text-xs"></i> <span>Las contraseñas no coinciden.</span>';
      }
    };

    const switchAuthMode = (mode) => {
      authMode = mode;
      if (mode === 'login') {
        if (pillIndicator) {
          pillIndicator.classList.remove('signup');
        }
        if (tabLogin) {
          tabLogin.className = "relative z-10 flex-1 py-2 px-3 rounded-full text-xs font-semibold text-[#08090c] transition-colors duration-200 flex items-center justify-center gap-1.5 focus:outline-none";
        }
        if (tabSignup) {
          tabSignup.className = "relative z-10 flex-1 py-2 px-3 rounded-full text-xs font-medium text-white/60 hover:text-white transition-colors duration-200 flex items-center justify-center gap-1.5 focus:outline-none";
        }
        if (headingText) headingText.innerText = "Conectar con tu cuenta de Nuvio";
        if (hintText) hintText.classList.add('hidden');
        if (confirmGroup) confirmGroup.classList.add('hidden');
        if (confirmInput) confirmInput.value = '';
        if (matchBadge) matchBadge.classList.add('hidden');
        if (btnConnect) btnConnect.style.display = 'flex';
        if (btnSignup) btnSignup.style.display = 'none';
      } else {
        if (pillIndicator) {
          pillIndicator.classList.add('signup');
        }
        if (tabSignup) {
          tabSignup.className = "relative z-10 flex-1 py-2 px-3 rounded-full text-xs font-semibold text-[#08090c] transition-colors duration-200 flex items-center justify-center gap-1.5 focus:outline-none";
        }
        if (tabLogin) {
          tabLogin.className = "relative z-10 flex-1 py-2 px-3 rounded-full text-xs font-medium text-white/60 hover:text-white transition-colors duration-200 flex items-center justify-center gap-1.5 focus:outline-none";
        }
        if (headingText) headingText.innerText = "Crear una nueva cuenta en Nuvio";
        if (hintText) hintText.classList.remove('hidden');
        if (confirmGroup) confirmGroup.classList.remove('hidden');
        validatePasswordMatch();
        if (btnConnect) btnConnect.style.display = 'none';
        if (btnSignup) btnSignup.style.display = 'flex';
      }
    };

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthMode('login'));
    if (tabSignup) tabSignup.addEventListener('click', () => switchAuthMode('signup'));

    // Soporte para tecla Enter en campos de autenticación
    const handleEnterSubmit = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (authMode === 'login') {
          if (btnConnect) btnConnect.click();
        } else {
          if (btnSignup) btnSignup.click();
        }
      }
    };

    [emailInput, passInput, confirmInput].forEach(inp => {
      if (inp) inp.addEventListener('keydown', handleEnterSubmit);
    });

    if (emailInput) {
      emailInput.addEventListener('input', (e) => {
        state.nuvioAuth.email = e.target.value.trim();
        this.updateNavigationButtons();
      });
    }

    if (passInput) {
      passInput.addEventListener('input', (e) => {
        state.nuvioAuth.password = e.target.value;
        validatePasswordMatch();
        this.updateNavigationButtons();
      });
    }

    if (confirmInput) {
      confirmInput.addEventListener('input', () => {
        validatePasswordMatch();
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
          let profiles = [];
          try {
            profiles = await NuvioClient.getProfiles({
              apiUrl: CONFIG.NUVIO_API_URL,
              apikey,
              accessToken: auth.accessToken,
              userId: auth.userId
            });
          } catch (pErr) {
            console.warn('[NuvioClient] Error obteniendo perfiles:', pErr);
            profiles = [];
          }

          // Si la cuenta no tiene perfiles, crear el perfil inicial "Principal"
          if (!profiles || profiles.length === 0) {
            try {
              const defaultProfile = await NuvioClient.createProfile({
                apiUrl: CONFIG.NUVIO_API_URL,
                apikey,
                accessToken: auth.accessToken,
                userId: auth.userId,
                name: 'Principal'
              });
              if (defaultProfile) {
                profiles = [defaultProfile];
              }
            } catch (_) {}
          }

          state.profiles = profiles || [];
          if (profiles && profiles.length > 0) {
            state.selectedProfileId = profiles[0].id;
            state.selectedProfileName = profiles[0].name || profiles[0].title || 'Perfil Principal';
            state.unlockStep(3); // Desbloquea Paso 3 (Colecciones)
          }

          state.unlockStep(2); // Desbloquea Paso 2 (Elegir Perfil)
          this.setAuthBadge(true);
          this.saveSession();
          this.showToast('✓ ¡Sesión iniciada con éxito! Perfiles sincronizados.', 'success');

          // Auto-avanzar al paso 2 de manera fluida
          setTimeout(() => {
            state.currentStep = 2;
            this.renderProfiles();
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
        const confirmPassword = confirmInput?.value;
        const apikey = CONFIG.NUVIO_PUBLIC_ANON_KEY;

        if (!email || !password) {
          this.showToast('Por favor ingresa un correo y contraseña para crear tu cuenta.', 'warning');
          return;
        }

        if (password.length < 6) {
          this.showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
          passInput?.focus();
          return;
        }

        if (password !== confirmPassword) {
          this.showToast('Las contraseñas no coinciden. Por favor verifícalas antes de continuar.', 'warning');
          confirmInput?.focus();
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
          this.saveSession();
          this.showToast('✓ ¡Cuenta creada con éxito! Bienvenido a Nuvio.', 'success');

          setTimeout(() => {
            state.currentStep = 2;
            this.renderProfiles();
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

  openNewProfileModal() {
    if (state.profiles && state.profiles.length >= 6) {
      this.showToast('Has alcanzado el límite máximo de 6 perfiles permitidos en Nuvio. Selecciona uno existente.', 'warning');
      return;
    }
    const modal = document.getElementById('modalNewProfile');
    const nameInput = document.getElementById('inputNewProfileName') || document.getElementById('newProfileName');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
      }
    }
  }

  closeNewProfileModal() {
    const modal = document.getElementById('modalNewProfile');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  promptDeleteProfile(profileId, profileName) {
    if (state.profiles && state.profiles.length <= 1) {
      this.showToast('No puedes eliminar el único perfil de tu cuenta. Nuvio requiere al menos un perfil activo.', 'warning');
      return;
    }
    this.profilePendingDelete = { id: profileId, name: profileName };
    const modal = document.getElementById('modalDeleteProfile');
    const nameEl = document.getElementById('deleteProfileTargetName');
    if (nameEl) nameEl.textContent = `"${profileName}"`;
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeDeleteProfileModal() {
    this.profilePendingDelete = null;
    const modal = document.getElementById('modalDeleteProfile');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async confirmDeleteProfile() {
    if (!this.profilePendingDelete) return;

    if (state.profiles && state.profiles.length <= 1) {
      this.showToast('No puedes eliminar el único perfil de tu cuenta.', 'warning');
      this.closeDeleteProfileModal();
      return;
    }

    if (!state.nuvioAuth.isAuthenticated || !state.nuvioAuth.accessToken) {
      this.showToast('Debes haber iniciado sesión con tu cuenta de Nuvio en el Paso 1.', 'error');
      this.closeDeleteProfileModal();
      return;
    }

    const { id: profileId, name: profileName } = this.profilePendingDelete;
    const btnConfirm = document.getElementById('btnConfirmDeleteProfile');
    const originalHtml = btnConfirm ? btnConfirm.innerHTML : '';
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Eliminando...';
    }

    try {
      const deleteResult = await NuvioClient.deleteProfile({
        apiUrl: CONFIG.NUVIO_API_URL,
        apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
        accessToken: state.nuvioAuth.accessToken,
        userId: state.nuvioAuth.userId,
        profileId: profileId
      });

      // Actualizar la lista en state con los perfiles reales verificados de Nuvio
      if (Array.isArray(deleteResult?.remainingProfiles)) {
        state.profiles = deleteResult.remainingProfiles;
      } else {
        state.profiles = (state.profiles || []).filter(p => String(p.id) !== String(profileId));
      }

      // Si el perfil eliminado era el seleccionado actualmente
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

      this.closeDeleteProfileModal();
      this.saveSession();
      this.renderProfiles();
      this.updateProfileWarning(state.selectedProfileId, state.selectedProfileName);
      this.updateUI();
      this.showToast(`✓ Perfil "${profileName}" eliminado permanentemente de Nuvio.`, 'success');
    } catch (err) {
      console.error('[AppController] Error al eliminar perfil:', err);
      this.showToast(`Error al eliminar perfil: ${err.message}`, 'error');
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = originalHtml;
      }
    }
  }

  setupStep2Profiles() {
    this.renderProfiles();

    const btnOpenModal = document.getElementById('btnOpenNewProfileModal');
    const modal = document.getElementById('modalNewProfile');
    const btnCloseModal = document.getElementById('btnCloseNewProfileModal');
    const btnCancelModal = document.getElementById('btnCancelNewProfile');
    const btnConfirmModal = document.getElementById('btnConfirmNewProfile') || document.getElementById('btnCreateProfile');
    const nameInput = document.getElementById('inputNewProfileName') || document.getElementById('newProfileName');

    if (btnOpenModal) {
      btnOpenModal.addEventListener('click', () => this.openNewProfileModal());
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', () => this.closeNewProfileModal());
    if (btnCancelModal) btnCancelModal.addEventListener('click', () => this.closeNewProfileModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeNewProfileModal();
      });
    }

    // Modal de Eliminar Perfil
    const modalDelete = document.getElementById('modalDeleteProfile');
    const btnCloseDeleteModal = document.getElementById('btnCloseDeleteProfileModal');
    const btnCancelDeleteModal = document.getElementById('btnCancelDeleteProfile');
    const btnConfirmDeleteModal = document.getElementById('btnConfirmDeleteProfile');

    if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', () => this.closeDeleteProfileModal());
    if (btnCancelDeleteModal) btnCancelDeleteModal.addEventListener('click', () => this.closeDeleteProfileModal());
    if (modalDelete) {
      modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) this.closeDeleteProfileModal();
      });
    }
    if (btnConfirmDeleteModal) {
      btnConfirmDeleteModal.addEventListener('click', () => this.confirmDeleteProfile());
    }

    if (btnConfirmModal && nameInput) {
      const handleCreate = async () => {
        if (state.profiles && state.profiles.length >= 6) {
          this.showToast('Has alcanzado el límite máximo de 6 perfiles permitidos en Nuvio. Selecciona uno existente.', 'warning');
          this.closeNewProfileModal();
          return;
        }

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

        btnConfirmModal.disabled = true;
        const originalHtml = btnConfirmModal.innerHTML;
        btnConfirmModal.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Creando...';

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

          this.closeNewProfileModal();
          this.saveSession();
          this.renderProfiles();
          this.updateProfileWarning(newProfile.id, newProfile.name || name);
          this.updateUI();
          nameInput.value = '';
          this.showToast(`¡Perfil "${name}" creado y seleccionado con éxito!`, 'success');
        } catch (err) {
          console.error(err);
          this.showToast(`Error al crear perfil: ${err.message}`, 'error');
        } finally {
          btnConfirmModal.disabled = false;
          btnConfirmModal.innerHTML = originalHtml;
        }
      };

      btnConfirmModal.addEventListener('click', handleCreate);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCreate();
        }
      });
    }
  }

  async updateProfileWarning(profileId, profileName) {
    const warningContainer = document.getElementById('profileOverwriteWarning');
    const warningTextEl = document.getElementById('profileWarningText');
    const warningIcon = document.getElementById('profileWarningIcon');
    if (!warningContainer) return;

    if (!profileId || state.isManualMode) {
      warningContainer.classList.add('hidden');
      return;
    }

    const displayName = profileName || 'seleccionado';
    const isNew = state.isProfileNew(profileId);

    if (isNew) {
      if (warningTextEl) {
        warningTextEl.innerHTML = `Perfil nuevo (<strong class="text-white">"${displayName}"</strong>): se aprovisionará de forma limpia con <strong class="text-[#ffd479]">AIOMetadata</strong> como addon principal (#1) y podrás añadir tus addons de streaming en el Paso 6.`;
      }
      if (warningIcon) warningIcon.className = "fa-solid fa-sparkles text-[#ffd479] text-base shrink-0";
      warningContainer.classList.remove('hidden');
      return;
    }

    // Comprobar si ya tiene AIOMetadata en segundo plano
    if (warningTextEl) {
      warningTextEl.innerHTML = `Analizando addons del perfil <strong class="text-white">"${displayName}"</strong>...`;
    }
    warningContainer.classList.remove('hidden');

    try {
      let hasAio = false;
      if (state.hasLoadedAddonsForProfile === profileId && state.existingAioAddon) {
        hasAio = true;
      } else if (state.nuvioAuth?.accessToken) {
        const addons = await NuvioClient.listAddons({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken: state.nuvioAuth.accessToken,
          userId: state.nuvioAuth.userId,
          profileId: profileId
        });
        hasAio = (addons || []).some(a => {
          const name = String(a.name || '').toLowerCase();
          const url = String(a.url || a.manifest_url || '').toLowerCase();
          return name.includes('aiometadata') || url.includes('aiometadata') || (url.includes('/stremio/') && url.includes('manifest.json'));
        });
        if (state.hasLoadedAddonsForProfile !== profileId) {
          state.setProfileAddons(addons, profileId);
        }
      }

      if (warningTextEl) {
        if (hasAio) {
          warningTextEl.innerHTML = `Al seleccionar <strong class="text-white">"${displayName}"</strong>, se actualizará tu configuración de <strong class="text-[#ffd479]">AIOMetadata</strong> como addon principal (#1). Todos tus addons de streaming y catálogos existentes se conservarán intactos y podrás gestionarlos en el Paso 6.`;
          if (warningIcon) warningIcon.className = "fa-solid fa-rotate text-[#ffd479] text-base shrink-0";
        } else {
          warningTextEl.innerHTML = `Al seleccionar <strong class="text-white">"${displayName}"</strong>, se instalará <strong class="text-[#ffd479]">AIOMetadata</strong> como tu addon principal de metadatos (#1). Tus addons actuales de streaming se mantendrán intactos y podrás organizarlos en el Paso 6.`;
          if (warningIcon) warningIcon.className = "fa-solid fa-circle-info text-[#ffd479] text-base shrink-0";
        }
      }
    } catch (_) {
      if (warningTextEl) {
        warningTextEl.innerHTML = `En el perfil <strong class="text-white">"${displayName}"</strong> se conservarán intactos tus addons de streaming y se priorizará <strong class="text-[#ffd479]">AIOMetadata</strong> en la posición principal (#1).`;
      }
    }
  }

  renderProfiles() {
    const container = document.getElementById('profilesList') || document.getElementById('profilesContainer');
    if (!container) return;

    if (state.profiles && state.profiles.length > 0) {
      let cardsHtml = state.profiles.map((p, idx) => {
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
               class="group relative cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all duration-200 select-none min-h-[140px] w-48 sm:w-52 ${
                 isSelected 
                   ? 'border-2 border-[#ffd479] bg-white/[0.08] shadow-[0_0_20px_rgba(255,212,121,0.2)] transform -translate-y-0.5' 
                   : 'border border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] hover:-translate-y-0.5'
               }"
               style="transform: translateZ(0); backface-visibility: hidden;">
            ${isSelected ? `
              <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ffd479] text-[#08090c] flex items-center justify-center text-[10px] shadow-md font-bold">
                <i class="fa-solid fa-check"></i>
              </div>
            ` : `
              <div class="absolute top-2 right-2 w-4 h-4 rounded-full border border-white/20 bg-white/[0.05] flex items-center justify-center text-[8px] text-transparent group-hover:border-white/40">
                <i class="fa-solid fa-check text-white/40"></i>
              </div>
            `}
            <!-- Botón de Eliminar Perfil (visible solo si hay más de 1 perfil) -->
            ${state.profiles.length > 1 ? `
            <button type="button" 
                    onclick="event.stopPropagation(); window.appController.promptDeleteProfile('${p.id}', '${name.replace(/'/g, "\\'")}')"
                    class="absolute top-2 left-2 w-6 h-6 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/15 flex items-center justify-center transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 z-10"
                    title="Eliminar perfil '${name.replace(/'/g, "\\'")}'">
              <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
            ` : ''}
            <div class="relative">
              <img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full object-cover transition-all ${
                isSelected ? 'ring-2 ring-[#ffd479] shadow-md scale-105' : 'ring-1 ring-white/20 group-hover:ring-white/40'
              }">
            </div>
            <div class="text-center w-full px-1">
              <div class="text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white'}">${name}</div>
              <div class="text-[10px] mt-0.5 ${isSelected ? 'text-[#ffd479] font-mono font-bold uppercase tracking-wider' : 'text-white/40 group-hover:text-white/60'}">
                ${isSelected ? '✓ Seleccionado' : 'Click para elegir'}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Tarjeta interactiva "Nuevo Perfil" visible únicamente si hay menos de 6 perfiles
      if (state.profiles.length < 6) {
        cardsHtml += `
          <div id="cardNewProfile" onclick="window.appController.openNewProfileModal()"
               class="group relative cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all duration-200 select-none border-2 border-dashed border-white/20 hover:border-white/50 bg-white/[0.02] hover:bg-white/[0.06] hover:-translate-y-0.5 min-h-[140px] w-48 sm:w-52"
               style="transform: translateZ(0); backface-visibility: hidden;">
            <div class="w-12 h-12 rounded-full border border-white/25 bg-white/[0.06] flex items-center justify-center text-white/70 group-hover:text-white group-hover:border-white/60 group-hover:scale-105 transition-all shadow-[var(--brillo-vidrio)]">
              <i class="fa-solid fa-plus text-base"></i>
            </div>
            <div class="text-center w-full">
              <div class="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">Nuevo Perfil</div>
              <div class="text-[10px] mt-0.5 text-white/40 group-hover:text-white/60 font-mono">${state.profiles.length}/6 perfiles</div>
            </div>
          </div>
        `;
      }

      container.innerHTML = cardsHtml;
      this.updateProfileWarning(state.selectedProfileId, state.selectedProfileName);
    } else {
      container.innerHTML = `
        <div class="w-full py-8 text-center bg-white/[0.03] border border-white/10 rounded-2xl p-6" style="transform: translateZ(0);">
          <i class="fa-solid fa-user-circle text-4xl text-white/30 mb-2"></i>
          <p class="text-sm font-medium text-white/90">No se encontraron perfiles en tu cuenta de Nuvio</p>
          <p class="text-xs text-white/50 mt-1 mb-4">Crea tu primer perfil para comenzar a configurar tus colecciones.</p>
          <button type="button" onclick="window.appController.openNewProfileModal()" class="lat-capsule-btn solid text-xs">
            <i class="fa-solid fa-plus"></i>
            <span>Crear mi primer perfil</span>
          </button>
        </div>
      `;
      this.updateProfileWarning(null, '');
    }
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
    const tmdbInput = document.getElementById('keyTmdb') || document.getElementById('tmdbApiKey');
    const tvdbInput = document.getElementById('keyTvdb') || document.getElementById('tvdbApiKey');
    const mdblistInput = document.getElementById('keyMdblist') || document.getElementById('mdblistApiKey');
    const rpdbInput = document.getElementById('keyRpdb') || document.getElementById('rpdbApiKey');

    const toggleAi = document.getElementById('toggleSearchAi');
    const aiContainer = document.getElementById('aiKeysContainer');
    const geminiInput = document.getElementById('keyGemini') || document.getElementById('geminiApiKey');
    const openrouterInput = document.getElementById('keyOpenrouter') || document.getElementById('openrouterApiKey');

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
      if (badge) {
        badge.className = 'text-[10px] px-2 py-0.5 rounded font-mono hidden';
        badge.innerText = '';
      }
      this.updateNavigationButtons();
    };

    // 1. Vincular campos base con sincronización bidireccional segura
    const bindInput = (el, key, isDefault = null) => {
      if (!el) return;
      if (!state.apiKeys[key] && isDefault) {
        state.apiKeys[key] = isDefault;
      }
      el.value = state.apiKeys[key] || '';
      
      const onValueChange = (e) => {
        state.apiKeys[key] = e.target.value.trim() || (isDefault || '');
        invalidateValidation(key);
      };

      el.addEventListener('input', onValueChange);
      el.addEventListener('change', onValueChange);
    };

    bindInput(tmdbInput, 'tmdb');
    bindInput(tvdbInput, 'tvdb');
    bindInput(mdblistInput, 'mdblist');
    bindInput(rpdbInput, 'rpdb', 't0-free-rpdb');

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

        // Sincronizar directamente los valores actuales de los inputs con state.apiKeys
        if (tmdbInput) state.apiKeys.tmdb = tmdbInput.value.trim();
        if (tvdbInput) state.apiKeys.tvdb = tvdbInput.value.trim();
        if (mdblistInput) state.apiKeys.mdblist = mdblistInput.value.trim();
        if (rpdbInput) state.apiKeys.rpdb = rpdbInput.value.trim() || 't0-free-rpdb';
        if (geminiInput) state.apiKeys.gemini = geminiInput.value.trim();
        if (openrouterInput) state.apiKeys.openrouter = openrouterInput.value.trim();

        let allValid = true;
        const validationMap = {};

        // Validar TMDB (Obligatoria)
        const tmdbKey = (state.apiKeys.tmdb || '').trim();
        const tmdbBadge = document.getElementById('badge-tmdb');
        if (!tmdbKey || tmdbKey.length < 8) {
          allValid = false;
          if (tmdbBadge) {
            tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
            tmdbBadge.innerText = '✗ Obligatoria';
          }
          if (tmdbInput) {
            tmdbInput.classList.add('border-red-500/60');
          }
        } else {
          try {
            const res = await fetch(`https://api.themoviedb.org/3/authentication?api_key=${encodeURIComponent(tmdbKey)}`);
            if (res.ok) {
              validationMap.tmdb = true;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                tmdbBadge.innerText = '✓ Válida';
              }
              if (tmdbInput) {
                tmdbInput.classList.remove('border-red-500/60');
                tmdbInput.classList.add('border-emerald-500/50');
              }
            } else if (res.status === 401) {
              allValid = false;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
                tmdbBadge.innerText = '✗ Clave inválida (401)';
              }
              if (tmdbInput) {
                tmdbInput.classList.add('border-red-500/60');
              }
            } else {
              const isHex32 = /^[a-f0-9]{32}$/i.test(tmdbKey);
              if (isHex32) {
                validationMap.tmdb = true;
                if (tmdbBadge) {
                  tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                  tmdbBadge.innerText = '✓ Válida';
                }
                if (tmdbInput) {
                  tmdbInput.classList.remove('border-red-500/60');
                  tmdbInput.classList.add('border-emerald-500/50');
                }
              } else {
                allValid = false;
                if (tmdbBadge) {
                  tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
                  tmdbBadge.innerText = `✗ Error (${res.status})`;
                }
                if (tmdbInput) {
                  tmdbInput.classList.add('border-red-500/60');
                }
              }
            }
          } catch (_) {
            const isHex32 = /^[a-f0-9]{32}$/i.test(tmdbKey);
            if (isHex32 || tmdbKey.length >= 20) {
              validationMap.tmdb = true;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                tmdbBadge.innerText = '✓ Formato Válido (Offline)';
              }
              if (tmdbInput) {
                tmdbInput.classList.remove('border-red-500/60');
                tmdbInput.classList.add('border-emerald-500/50');
              }
            } else {
              allValid = false;
              if (tmdbBadge) {
                tmdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
                tmdbBadge.innerText = '✗ Formato incorrecto';
              }
              if (tmdbInput) {
                tmdbInput.classList.add('border-red-500/60');
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
                  geminiBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                  geminiBadge.innerText = '✓ Válida';
                }
              } else {
                allValid = false;
                if (geminiBadge) {
                  geminiBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                  geminiBadge.innerText = '✗ Inválida';
                }
              }
            } catch (_) {
              if (geminiKey.startsWith('AIzaSy') && geminiKey.length >= 30 && geminiBadge) {
                geminiBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                geminiBadge.innerText = '✓ Válida';
              }
            }
          } else if (geminiBadge) {
            geminiBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono hidden';
            geminiBadge.innerText = '';
          }

          if (openrouterKey) {
            try {
              const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
                headers: { 'Authorization': `Bearer ${openrouterKey}` }
              });
              if (res.ok) {
                if (openrouterBadge) {
                  openrouterBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                  openrouterBadge.innerText = '✓ Válida';
                }
              } else {
                allValid = false;
                if (openrouterBadge) {
                  openrouterBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono';
                  openrouterBadge.innerText = '✗ Inválida';
                }
              }
            } catch (_) {
              if ((openrouterKey.startsWith('sk-or-v1-') || openrouterKey.length >= 20) && openrouterBadge) {
                openrouterBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono';
                openrouterBadge.innerText = '✓ Válida';
              }
            }
          } else if (openrouterBadge) {
            openrouterBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono hidden';
            openrouterBadge.innerText = '';
          }
        }

        // Validar MDBList (Obligatoria)
        const mdblistKey = (state.apiKeys.mdblist || '').trim();
        const mdblistBadge = document.getElementById('badge-mdblist');
        if (!mdblistKey || mdblistKey.length < 8) {
          allValid = false;
          if (mdblistBadge) {
            mdblistBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
            mdblistBadge.innerText = '✗ Obligatoria';
          }
          if (mdblistInput) {
            mdblistInput.classList.add('border-red-500/60');
          }
        } else {
          try {
            const res = await fetch(`https://mdblist.com/api/?apikey=${encodeURIComponent(mdblistKey)}&s=avatar`);
            if (res.ok) {
              validationMap.mdblist = true;
              if (mdblistBadge) {
                mdblistBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                mdblistBadge.innerText = '✓ Válida';
              }
              if (mdblistInput) {
                mdblistInput.classList.remove('border-red-500/60');
                mdblistInput.classList.add('border-emerald-500/50');
              }
            } else {
              allValid = false;
              if (mdblistBadge) {
                mdblistBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
                mdblistBadge.innerText = '✗ Inválida';
              }
              if (mdblistInput) {
                mdblistInput.classList.add('border-red-500/60');
              }
            }
          } catch (_) {
            if (mdblistKey.length >= 8) {
              validationMap.mdblist = true;
              if (mdblistBadge) {
                mdblistBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                mdblistBadge.innerText = '✓ Válida (Offline)';
              }
              if (mdblistInput) {
                mdblistInput.classList.remove('border-red-500/60');
                mdblistInput.classList.add('border-emerald-500/50');
              }
            } else {
              allValid = false;
              if (mdblistBadge) {
                mdblistBadge.className = 'text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
                mdblistBadge.innerText = '✗ Inválida';
              }
              if (mdblistInput) {
                mdblistInput.classList.add('border-red-500/60');
              }
            }
          }
        }

        const rpdbKey = (state.apiKeys.rpdb || 't0-free-rpdb').trim();
        const rpdbBadge = document.getElementById('badge-rpdb');
        if (rpdbKey) {
          try {
            const res = await fetch(`https://api.ratingposterdb.com/${encodeURIComponent(rpdbKey)}/isValid`);
            const text = await res.text();
            if (res.ok && text.includes('"valid":true')) {
              validationMap.rpdb = true;
              if (rpdbBadge) {
                rpdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                rpdbBadge.innerText = '✓ Válida';
              }
              if (rpdbInput) {
                rpdbInput.classList.remove('border-red-500/60');
                rpdbInput.classList.add('border-emerald-500/50');
              }
            } else {
              allValid = false;
              if (rpdbBadge) {
                rpdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-mono shrink-0 whitespace-nowrap';
                rpdbBadge.innerText = '✗ Inválida';
              }
              if (rpdbInput) {
                rpdbInput.classList.add('border-red-500/60');
              }
            }
          } catch (_) {
            if (rpdbKey === 't0-free-rpdb' || rpdbKey.length >= 6) {
              validationMap.rpdb = true;
              if (rpdbBadge) {
                rpdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
                rpdbBadge.innerText = '✓ Válida';
              }
              if (rpdbInput) {
                rpdbInput.classList.remove('border-red-500/60');
                rpdbInput.classList.add('border-emerald-500/50');
              }
            }
          }
        } else if (rpdbBadge) {
          rpdbBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono hidden';
          rpdbBadge.innerText = '';
        }

        const tvdbKey = (state.apiKeys.tvdb || '').trim();
        const tvdbBadge = document.getElementById('badge-tvdb');
        if (tvdbKey) {
          validationMap.tvdb = true;
          if (tvdbBadge) {
            tvdbBadge.className = 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0 whitespace-nowrap';
            tvdbBadge.innerText = '✓ Configurada';
          }
        } else if (tvdbBadge) {
          tvdbBadge.className = 'text-[10px] px-2 py-0.5 rounded font-mono hidden';
          tvdbBadge.innerText = '';
        }


        // Resultado Final
        if (allValid) {
          state.setApiKeysValidation(true, validationMap);
          state.unlockStep(5);
          if (overallBadge) {
            overallBadge.classList.remove('hidden');
            overallBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1.5';
          }
          if (statusMsg) {
            statusMsg.innerText = '✓ Todas las claves han sido comprobadas con éxito. Ya puedes avanzar al siguiente paso.';
            statusMsg.className = 'text-[11px] text-emerald-400 mt-0.5 font-medium';
          }
          this.showToast('✓ Claves API verificadas exitosamente', 'success');
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
        this.updateUI();
        this.updateNavigationButtons();
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

  setupStep5Preferences() {
    const toggleEnrichment = document.getElementById('toggleTmdbEnrichment');
    const toggleRatings = document.getElementById('toggleMdblistRatings');
    const labelEnrichment = document.getElementById('labelTmdbEnrichment');
    const labelRatings = document.getElementById('labelMdblistRatings');
    const customBetterInput = document.getElementById('customUrlBetterposter');
    const customPlusInput = document.getElementById('customUrlPostersplus');

    const updateToggleLabels = () => {
      if (toggleEnrichment && labelEnrichment) {
        if (toggleEnrichment.checked) {
          labelEnrichment.textContent = 'Activado';
          labelEnrichment.className = 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider';
        } else {
          labelEnrichment.textContent = 'Desactivado';
          labelEnrichment.className = 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
        }
      }
      if (toggleRatings && labelRatings) {
        if (toggleRatings.checked) {
          labelRatings.textContent = 'Activado';
          labelRatings.className = 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider';
        } else {
          labelRatings.textContent = 'Desactivado';
          labelRatings.className = 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
        }
      }
    };

    if (toggleEnrichment) {
      toggleEnrichment.checked = Boolean(state.preferences.tmdbEnrichment);
      toggleEnrichment.addEventListener('change', (e) => {
        state.preferences.tmdbEnrichment = e.target.checked;
        updateToggleLabels();
        this.updateNavigationButtons();
      });
    }

    if (toggleRatings) {
      toggleRatings.checked = Boolean(state.preferences.mdblistRatings);
      toggleRatings.addEventListener('change', (e) => {
        state.preferences.mdblistRatings = e.target.checked;
        updateToggleLabels();
        this.updateNavigationButtons();
      });
    }
    updateToggleLabels();

    if (customBetterInput) {
      customBetterInput.addEventListener('input', (e) => {
        if (state.preferences.posterEngine === 'betterposter') {
          state.preferences.customPosterUrl = e.target.value.trim();
        }
        this.updateStep5PosterPreviews();
      });
    }

    if (customPlusInput) {
      customPlusInput.addEventListener('input', (e) => {
        if (state.preferences.posterEngine === 'postersplus') {
          state.preferences.customPosterUrl = e.target.value.trim();
        }
        this.updateStep5PosterPreviews();
      });
    }

    // Métodos accesibles desde window.appController para llamadas onclick en HTML
    this.selectPosterEngine = (engine) => {
      state.preferences.posterEngine = engine;
      if (engine === 'default') {
        state.preferences.customPosterUrl = '';
      } else if (engine === 'betterposter' && customBetterInput) {
        state.preferences.customPosterUrl = customBetterInput.value.trim();
      } else if (engine === 'postersplus' && customPlusInput) {
        state.preferences.customPosterUrl = customPlusInput.value.trim();
      }
      this.updatePosterCardsUI();
      this.updateNavigationButtons();
    };

    this.toggleCustomUrlInput = (engine) => {
      const container = document.getElementById(`customUrlContainer-${engine}`);
      if (container) {
        container.classList.toggle('hidden');
        if (!container.classList.contains('hidden')) {
          const input = container.querySelector('input');
          if (input) input.focus();
        }
      }
    };

    // Alternar Personalización de Fusion Badges
    const toggleBadges = document.getElementById('toggleBadgesCustomization');
    const labelBadges = document.getElementById('labelBadgesCustomization');
    const galleryBadges = document.getElementById('badgesGalleryContainer');

    this.renderBadgeModulesUI = () => {
      const containerCheckboxes = document.getElementById('badgeModulesCheckboxes');
      const containerOrderBar = document.getElementById('badgeModulesOrderBar');
      const activeIds = state.preferences.activeBadgeModules || [];
      const orderIds = state.preferences.badgeModulesOrder || [];
      const activeSet = new Set(activeIds);
      const selectedPackId = state.preferences.selectedBadgePack || 'tinted';
      const currentPack = getBadgePackById(selectedPackId);

      // Combinar módulos base con cualquier módulo adicional presente en el pack actual
      const allModulesMap = new Map();
      BADGE_MODULE_DEFINITIONS.forEach(def => allModulesMap.set(def.id, def));
      if (currentPack && currentPack.sections) {
        currentPack.sections.forEach(sec => {
          const canonId = getCanonicalModuleId(sec.id);
          if (!allModulesMap.has(canonId) && !allModulesMap.has(sec.id)) {
            allModulesMap.set(sec.id, {
              id: sec.id,
              labelEs: getBadgeModuleLabel(sec.id, sec.name),
              defaultActive: true
            });
          }
        });
      }
      const moduleDefs = Array.from(allModulesMap.values());

      if (containerCheckboxes) {
        containerCheckboxes.innerHTML = moduleDefs.map(def => {
          const isChecked = isSectionActive(def.id, activeSet);
          return `
            <label class="badge-module-pill flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 cursor-pointer text-xs text-white/70 hover:text-white transition-all select-none">
              <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.appController.toggleBadgeModule('${def.id}', this.checked)" class="sr-only">
              <div class="w-4 h-4 rounded-md border border-white/30 flex items-center justify-center transition-all check-indicator">
                <i class="fa-solid fa-check text-[10px] text-[#08090c] ${isChecked ? 'opacity-100' : 'opacity-0'} transition-opacity"></i>
              </div>
              <span class="font-medium">+ ${def.labelEs}</span>
            </label>
          `;
        }).join('');
      }

      if (containerOrderBar) {
        // Mostrar exclusivamente los módulos activos en el orden actual
        const activeOrdered = orderIds.filter(id => isSectionActive(id, activeSet));
        if (activeOrdered.length === 0) {
          containerOrderBar.innerHTML = `<span class="text-[11px] text-white/40 italic">Ningún módulo activado. Marca categorías arriba para incluirlas y ordenarlas.</span>`;
        } else {
          containerOrderBar.innerHTML = activeOrdered.map((id, idx) => {
            const isFirst = (idx === 0);
            const isLast = (idx === activeOrdered.length - 1);
            const label = getBadgeModuleLabel(id);
            return `
              <div class="badge-order-chip">
                <span class="font-mono text-[10px] text-[#ffd479]">${idx + 1}.</span>
                <span>${label}</span>
                <div class="flex items-center gap-1 ml-1">
                  <button type="button" ${isFirst ? 'disabled' : ''} onclick="window.appController.moveBadgeModule('${id}', -1)" class="badge-order-btn" title="Mover a la izquierda / antes">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <button type="button" ${isLast ? 'disabled' : ''} onclick="window.appController.moveBadgeModule('${id}', 1)" class="badge-order-btn" title="Mover a la derecha / después">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    };

    const updateBadgesCustomizationUI = () => {
      const isBadgesActive = Boolean(state.preferences.badgesEnabled);
      if (toggleBadges) {
        toggleBadges.checked = isBadgesActive;
      }
      if (labelBadges) {
        labelBadges.textContent = isBadgesActive ? 'Activado' : 'Desactivado';
        labelBadges.className = isBadgesActive
          ? 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider'
          : 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
      }
      if (galleryBadges) {
        if (isBadgesActive) {
          galleryBadges.classList.add('is-open');
          this.renderBadgeModulesUI();
          this.renderBadgesGrid();
          setTimeout(() => this.fitBadgesDynamically(), 350);
        } else {
          galleryBadges.classList.remove('is-open');
        }
      }
      this.updateManualModeButtons();
      this.refreshStep6Summary();
    };

    if (toggleBadges) {
      toggleBadges.checked = Boolean(state.preferences.badgesEnabled);
      toggleBadges.addEventListener('change', (e) => {
        state.preferences.badgesEnabled = e.target.checked;
        updateBadgesCustomizationUI();
        this.updateNavigationButtons();
      });
    }
    updateBadgesCustomizationUI();

    this.toggleBadgeModule = (id, isChecked) => {
      if (!state.preferences.activeBadgeModules) {
        state.preferences.activeBadgeModules = ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
      }
      const canon = getCanonicalModuleId(id);
      if (isChecked) {
        if (!state.preferences.activeBadgeModules.includes(id)) {
          state.preferences.activeBadgeModules.push(id);
        }
        if (canon && canon !== id && !state.preferences.activeBadgeModules.includes(canon)) {
          state.preferences.activeBadgeModules.push(canon);
        }
      } else {
        state.preferences.activeBadgeModules = state.preferences.activeBadgeModules.filter(
          x => x !== id && getCanonicalModuleId(x) !== canon
        );
      }
      this.renderBadgeModulesUI();
      this.renderBadgesGrid();
      this.refreshStep6Summary();
      const label = getBadgeModuleLabel(id);
      this.showToast(isChecked ? `Módulo "${label}" activado` : `Módulo "${label}" desactivado`, 'info');
    };

    this.moveBadgeModule = (id, delta) => {
      const activeIds = state.preferences.activeBadgeModules || [];
      const order = [...(state.preferences.badgeModulesOrder || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'])];
      const activeSet = new Set(activeIds);
      const activeOrdered = order.filter(x => isSectionActive(x, activeSet));
      const curIdx = activeOrdered.indexOf(id);
      const targetIdx = curIdx + delta;

      if (curIdx < 0 || targetIdx < 0 || targetIdx >= activeOrdered.length) return;

      const targetId = activeOrdered[targetIdx];
      const globalCurIdx = order.indexOf(id);
      const globalTargetIdx = order.indexOf(targetId);

      if (globalCurIdx >= 0 && globalTargetIdx >= 0) {
        order[globalCurIdx] = targetId;
        order[globalTargetIdx] = id;
        state.preferences.badgeModulesOrder = order;
        this.renderBadgeModulesUI();
        this.renderBadgesGrid();
      }
    };

    this.selectBadgePack = (packId) => {
      state.preferences.selectedBadgePack = packId;
      const pack = getBadgePackById(packId);
      if (pack && pack.sections) {
        pack.sections.forEach(sec => {
          const canon = getCanonicalModuleId(sec.id);
          if (!state.preferences.badgeModulesOrder.includes(sec.id) && !state.preferences.badgeModulesOrder.includes(canon)) {
            state.preferences.badgeModulesOrder.push(sec.id);
          }
        });
      }
      this.renderBadgeModulesUI();
      this.renderBadgesGrid();
      this.refreshStep6Summary();
      this.updateNavigationButtons();
    };

    this.copyBadgeJsonUrl = async (packId) => {
      const id = packId || state.preferences.selectedBadgePack || 'tinted';
      const pack = getBadgePackById(id);

      if (pack.isCustom && !pack.rawV2 && pack.customJson) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(pack.customJson, null, 2));
          this.showToast(`✓ Código JSON de "${pack.name}" copiado al portapapeles`, 'success');
        } catch (_) {
          this.showToast('No se pudo copiar automáticamente al portapapeles.', 'warning');
        }
        return;
      }

      const url = getBadgePackUrl(id);
      try {
        await navigator.clipboard.writeText(url);
        this.showToast(`✓ Enlace JSON de "${pack.name}" copiado al portapapeles`, 'success');
      } catch (_) {
        this.showToast('No se pudo copiar automáticamente al portapapeles.', 'warning');
      }
    };

    this.getCompiledBadgeRulesJson = async (packId) => {
      const id = packId || state.preferences.selectedBadgePack || 'tinted';
      const activeIds = state.preferences.activeBadgeModules || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
      const orderIds = state.preferences.badgeModulesOrder || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
      const rules = await compileUniversalBadgeRules(id, activeIds, orderIds);
      return JSON.stringify(rules, null, 2);
    };

    this.copyCompiledBadgeJson = async (packId) => {
      try {
        const id = packId || state.preferences.selectedBadgePack || 'tinted';
        const pack = getBadgePackById(id);
        const jsonStr = await this.getCompiledBadgeRulesJson(id);
        await navigator.clipboard.writeText(jsonStr);
        this.showToast(`✓ JSON de Badges ("${pack ? pack.name : id}") copiado con tu orden y módulos activos`, 'success');
      } catch (err) {
        console.error('[Badges] Error al copiar JSON compilado:', err);
        this.showToast('No se pudo copiar automáticamente al portapapeles.', 'warning');
      }
    };

    this.downloadCompiledBadgeJson = async (packId) => {
      try {
        const id = packId || state.preferences.selectedBadgePack || 'tinted';
        const pack = getBadgePackById(id);
        const jsonStr = await this.getCompiledBadgeRulesJson(id);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (pack ? pack.name : id).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        a.download = `nuvio-badges-${cleanName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast(`✓ Archivo de badges ("${pack ? pack.name : id}") descargado con éxito`, 'success');
      } catch (err) {
        console.error('[Badges] Error al descargar JSON compilado:', err);
        this.showToast('No se pudo descargar el archivo de badges.', 'error');
      }
    };

    this.handleImportCustomBadge = async () => {
      const sourceInput = document.getElementById('inputCustomBadgeSource');
      const nameInput = document.getElementById('inputCustomBadgeName');
      const errorBox = document.getElementById('customBadgeError');
      const errorText = document.getElementById('customBadgeErrorText');

      if (errorBox) errorBox.classList.add('hidden');

      const source = (sourceInput?.value || '').trim();
      const customName = (nameInput?.value || '').trim();

      if (!source) {
        if (errorBox && errorText) {
          errorText.textContent = 'Por favor ingresa una URL válida o pega el código JSON de tu pack de badges.';
          errorBox.classList.remove('hidden');
        }
        sourceInput?.focus();
        return;
      }

      let parsedData = null;
      let isUrl = false;
      let rawUrl = '';

      if (/^https?:\/\//i.test(source)) {
        isUrl = true;
        rawUrl = source;
        let fetchUrl = source;

        // Auto-corregir enlaces comunes para acceder directamente al RAW
        if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
          fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        } else if (fetchUrl.includes('gist.github.com/') && !fetchUrl.includes('/raw')) {
          fetchUrl = fetchUrl.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
        } else if (fetchUrl.includes('pastebin.com/') && !fetchUrl.includes('/raw/')) {
          fetchUrl = fetchUrl.replace('pastebin.com/', 'pastebin.com/raw/');
        }

        // Función de auto-reparación para JSONs comunitarios con errores menores (comas faltantes o trailing commas)
        const tryRepairJson = (jsonStr) => {
          try {
            return JSON.parse(jsonStr);
          } catch (err) {
            let repaired = jsonStr;
            // 1. Eliminar comas finales antes de } o ]
            repaired = repaired.replace(/,\s*([\]}])/g, '$1');
            // 2. Insertar comas faltantes entre propiedades ("valor"\n"propiedad":)
            repaired = repaired.replace(/(["\dtruefalsenull\]}])\s*\n\s*("[a-zA-Z0-9_$-]+"\s*:)/g, '$1,\n$2');
            return JSON.parse(repaired);
          }
        };

        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          const rawText = await res.text();
          parsedData = tryRepairJson(rawText);
        } catch (fetchErr) {
          console.warn('[Badges] Descarga directa falló, intentando con proxy CORS:', fetchErr.message);
          try {
            const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`);
            if (!proxyRes.ok) throw new Error(`Proxy HTTP ${proxyRes.status}`);
            const rawText = await proxyRes.text();
            parsedData = tryRepairJson(rawText);
          } catch (proxyErr) {
            console.error('[Badges] No se pudo descargar el JSON:', proxyErr.message);
            if (errorBox && errorText) {
              errorText.textContent = `No se pudo descargar el archivo JSON (${fetchErr.message}). Verifica que el enlace sea público o pega el código JSON directamente.`;
              errorBox.classList.remove('hidden');
            }
            return;
          }
        }
      } else {
        const tryRepairJson = (jsonStr) => {
          try {
            return JSON.parse(jsonStr);
          } catch (err) {
            let repaired = jsonStr;
            repaired = repaired.replace(/,\s*([\]}])/g, '$1');
            repaired = repaired.replace(/(["\dtruefalsenull\]}])\s*\n\s*("[a-zA-Z0-9_$-]+"\s*:)/g, '$1,\n$2');
            return JSON.parse(repaired);
          }
        };

        try {
          parsedData = tryRepairJson(source);
        } catch (jsonErr) {
          if (errorBox && errorText) {
            errorText.textContent = 'El texto ingresado no es un JSON válido: ' + jsonErr.message;
            errorBox.classList.remove('hidden');
          }
          return;
        }
      }

      // Normalizador de identificadores de grupo para Badger y Nuvio
      const normalizeGid = (rawGid) => {
        const id = (rawGid || 'gr').trim();
        return getCanonicalModuleId(id) || id;
      };

      // Convertir Badger groups / filters a sections para visualización fiel y completa
      let sections = [];
      const groups = parsedData.groups || [];
      const filters = parsedData.filters || (Array.isArray(parsedData) ? parsedData : []);

      if (groups.length > 0 || filters.length > 0) {
        const groupMap = new Map();
        groups.forEach(g => {
          const gid = normalizeGid(g.id);
          groupMap.set(gid, {
            id: gid,
            name: g.name || getBadgeModuleLabel(gid),
            items: [],
            total: 0
          });
        });

        filters.forEach(f => {
          if (f.isEnabled === false) return; // Omitir distintivos desactivados
          const gid = normalizeGid(f.groupId);
          let g = groupMap.get(gid);
          if (!g) {
            const groupName = f.groupName || getBadgeModuleLabel(gid, gid.toUpperCase());
            g = { id: gid, name: groupName, items: [], total: 0 };
            groupMap.set(gid, g);
          }
          g.total++;
          // Permitir hasta 24 items para que fitBadgesDynamically() aproveche todo el ancho dinámico
          if (g.items.length < 24) {
            g.items.push({
              name: f.name || 'Badge',
              img: f.imageURL || null,
              text: normalizeBadgeColor(f.textColor, '#ffffff'),
              border: normalizeBadgeColor(f.borderColor, 'rgba(255,255,255,0.2)'),
              bg: normalizeBadgeColor(f.tagColor, 'rgba(255,255,255,0.08)'),
              style: f.tagStyle || 'filled'
            });
          }
        });

        sections = Array.from(groupMap.values()).map(g => ({
          id: g.id,
          name: g.name,
          total: g.total,
          hiddenCount: Math.max(0, g.total - g.items.length),
          items: g.items
        })).filter(g => g.items.length > 0);
      }

      if (sections.length === 0) {
        sections = [
          {
            id: 'custom',
            name: 'Personalizado',
            total: 3,
            hiddenCount: 0,
            items: [
              { name: '4K', text: '#FFD500', border: '#FFD500', bg: 'rgba(255,213,0,0.15)' },
              { name: 'HDR', text: '#BBDEFB', border: '#BBDEFB', bg: 'rgba(187,222,251,0.15)' },
              { name: 'Atmos', text: '#E040FB', border: '#E040FB', bg: 'rgba(224,64,251,0.15)' }
            ]
          }
        ];
      }

      // Detección automática del autor desde metadatos o URL
      let authorName = (parsedData.author || parsedData.creator || '').trim();
      if (!authorName && isUrl) {
        const ghMatch = rawUrl.match(/(?:githubusercontent\.com|github\.com)\/([^/]+)/i);
        if (ghMatch && ghMatch[1] && !['raw', 'gist'].includes(ghMatch[1])) {
          authorName = ghMatch[1];
        }
      }
      if (!authorName) authorName = 'Personalizado';

      let authorUrl = (parsedData.authorUrl || '').trim();
      if (!authorUrl && authorName !== 'Personalizado') {
        authorUrl = `https://github.com/${authorName}`;
      } else if (!authorUrl && isUrl) {
        authorUrl = rawUrl;
      }

      // Nombre del paquete
      let finalName = (customName || parsedData.name || parsedData.title || '').trim();
      if (!finalName && isUrl) {
        const fileMatch = rawUrl.split('/').pop().replace(/\.json$/i, '').replace(/[-_]/g, ' ');
        if (fileMatch) {
          finalName = fileMatch.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
      if (!finalName) {
        finalName = `Estilo Personalizado #${BADGE_PACKS.filter(p => p.isCustom).length + 1}`;
      }

      const customId = `custom-${Date.now()}`;

      const newPack = {
        id: customId,
        name: finalName,
        author: authorName,
        authorUrl: authorUrl,
        description: isUrl ? `Estilo importado desde URL: ${rawUrl}` : 'Estilo personalizado cargado mediante código JSON directo.',
        rawV2: isUrl ? rawUrl : null,
        rawV1: isUrl ? rawUrl : null,
        customJson: isUrl ? null : parsedData,
        isCustom: true,
        tags: ['Personalizado', 'Importado'],
        accentColor: '#10b981',
        sections
      };

      addCustomBadgePack(newPack);

      // Activar automáticamente todas las secciones que trae el pack en las preferencias
      sections.forEach(sec => {
        if (!state.preferences.activeBadgeModules.includes(sec.id)) {
          state.preferences.activeBadgeModules.push(sec.id);
        }
        if (!state.preferences.badgeModulesOrder.includes(sec.id)) {
          state.preferences.badgeModulesOrder.push(sec.id);
        }
      });

      state.preferences.selectedBadgePack = customId;
      this.renderBadgeModulesUI();
      this.renderBadgesGrid();
      this.refreshStep6Summary();

      if (sourceInput) sourceInput.value = '';
      if (nameInput) nameInput.value = '';
      if (errorBox) errorBox.classList.remove('hidden'); // reset error display
      if (errorBox) errorBox.classList.add('hidden');

      this.showToast(`¡Estilo "${finalName}" importado y seleccionado con éxito!`, 'success');

      // Scroll suave hacia la nueva tarjeta
      const targetCard = document.querySelector(`[onclick*="${customId}"]`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    this.updatePosterCardsUI();
    this.updateStep5PosterPreviews();
  }

  renderBadgesGrid() {
    const container = document.getElementById('badgesGrid');
    if (!container) return;

    const selectedPackId = state.preferences.selectedBadgePack || 'tinted';
    const activeIds = state.preferences.activeBadgeModules || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
    const orderIds = state.preferences.badgeModulesOrder || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];

    container.innerHTML = BADGE_PACKS.map(pack => {
      const isSelected = (pack.id === selectedPackId);
      const borderClass = isSelected
        ? 'border-[#ffd479] bg-white/[0.07] shadow-[0_0_25px_rgba(255,212,121,0.22)]'
        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20';

      const checkIcon = isSelected
        ? `<div class="w-5 h-5 rounded-full border-2 border-[#ffd479] bg-[#ffd479] flex items-center justify-center text-[10px] text-[#08090c] font-bold shadow-sm"><i class="fa-solid fa-check"></i></div>`
        : `<div class="w-5 h-5 rounded-full border-2 border-white/20 bg-transparent flex items-center justify-center text-[10px] text-transparent"><i class="fa-solid fa-check"></i></div>`;

      // Secciones filtradas y ordenadas de acuerdo a la configuración activa del usuario
      const visibleSections = getPackSectionsOrdered(pack, activeIds, orderIds);

      // Renderizado de secciones con nombres traducidos al español
      const sectionsHtml = visibleSections.map(sec => {
        const titleEs = getBadgeModuleLabel(sec.id, sec.name).toUpperCase();
        const totalItemsCount = sec.total || (sec.items ? sec.items.length : 0);
        const badgesHtml = (sec.items || []).map(b => {
          const isFlag = (sec.id === 'glang' || sec.id === 'gl' || sec.id === 'lang');
          const isSub = (sec.id === 'gsub' || sec.id === 'sub');
          const imgClass = isFlag
            ? 'badge-flag-img h-3.5 max-h-[15px] w-[21px] object-contain block shrink-0'
            : (isSub ? 'badge-sub-img h-3.5 max-h-[15px] min-w-[28px] w-auto object-contain block shrink-0' : 'h-3.5 max-h-[15px] w-auto object-contain block shrink-0');
          const widthAttr = isFlag ? 'width="21"' : '';
          const heightAttr = 'height="14"';

          return `
            <span class="badge-chip inline-flex items-center justify-center px-2 py-1 rounded-md text-[10.5px] font-bold font-mono tracking-wide border shadow-sm transition-transform hover:scale-105 shrink-0"
                  style="background-color: ${b.bg}; border-color: ${b.border}; color: ${b.text};"
                  title="${b.name}">
              ${b.img ? `<img src="${b.img}" alt="${b.name}" ${widthAttr} ${heightAttr} class="${imgClass}" loading="eager" decoding="async" onload="window.appController && window.appController.handleBadgeImgLoaded(this)" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'; window.appController && window.appController.handleBadgeImgLoaded(this);"><span style="display:none;">${b.name}</span>` : `<span>${b.name}</span>`}
            </span>
          `;
        }).join('');

        return `
          <div class="badge-section-box bg-black/50 border border-white/[0.06] rounded-xl p-2.5 flex flex-col justify-start gap-1.5 flex-1 min-w-[190px] sm:min-w-[210px]">
            <div class="flex items-center justify-between text-[10px] font-mono uppercase text-white/50 font-semibold shrink-0">
              <span class="truncate">${titleEs}</span>
              <span class="badge-hidden-counter text-[9px] text-[#ffd479] font-bold font-mono shrink-0 ml-1" data-total="${totalItemsCount}">${sec.hiddenCount > 0 ? `+${sec.hiddenCount}` : ''}</span>
            </div>
            <div class="badges-flow-container relative flex flex-wrap items-center gap-1.5 content-start">
              ${badgesHtml}
            </div>
          </div>
        `;
      }).join('');

      const copyBtnLabel = (pack.isCustom && !pack.rawV2) ? 'Copiar Código JSON' : 'Copiar Enlace JSON';

      return `
        <div onclick="window.appController.selectBadgePack('${pack.id}')" class="badge-pack-card relative p-5 rounded-[24px] border-2 ${borderClass} cursor-pointer transition-all flex flex-col justify-between gap-3.5 group shadow-[var(--shadow-lift)]">
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-white tracking-wide">${pack.name}</h4>
                  ${isSelected ? '<span class="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#ffd479]/20 text-[#ffd479] border border-[#ffd479]/30">Activo</span>' : ''}
                  ${pack.isCustom ? '<span class="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Personalizado</span>' : ''}
                </div>
                <div class="flex items-center gap-1.5 text-[11px] text-white/50 pt-0.5">
                  <i class="fa-brands fa-github text-[#ffd479]"></i>
                  <span>Hecho por ${pack.authorUrl && pack.authorUrl !== '#' ? `<a href="${pack.authorUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-[#ffd479] hover:underline font-medium">${pack.author}</a>` : `<span class="text-[#ffd479] font-medium">${pack.author}</span>`}</span>
                </div>
              </div>
              ${checkIcon}
            </div>

            <!-- Distribución flexible de secciones auto-equilibradas para aprovechar el 100% del ancho -->
            <div class="flex flex-wrap gap-2 pt-0.5">
              ${sectionsHtml}
            </div>
          </div>

          <!-- Acciones del Pack: Descargar JSON, Copiar JSON Adaptado y Enlace URL -->
          <div class="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2 flex-wrap">
            ${pack.rawV2 ? `
              <button type="button" onclick="event.stopPropagation(); window.appController.copyBadgeJsonUrl('${pack.id}')" class="py-1.5 px-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white/80 text-[11px] border border-white/[0.06] flex items-center justify-center gap-1.5 transition-all cursor-pointer" title="Copiar URL directa original">
                <i class="fa-solid fa-link text-[10px]"></i>
                <span>Enlace</span>
              </button>
            ` : ''}
            <button type="button" onclick="event.stopPropagation(); window.appController.downloadCompiledBadgeJson('${pack.id}')" class="py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all cursor-pointer" title="Descargar archivo JSON optimizado con tu orden y módulos activos">
              <i class="fa-solid fa-download text-[11px]"></i>
              <span>Descargar</span>
            </button>
            <button type="button" onclick="event.stopPropagation(); window.appController.copyCompiledBadgeJson('${pack.id}')" class="py-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white hover:text-white text-xs border border-white/[0.12] flex items-center justify-center gap-1.5 transition-all font-medium cursor-pointer" title="Copiar código JSON sanitizado con tu orden y módulos activos">
              <i class="fa-solid fa-copy text-[11px]"></i>
              <span>Copiar JSON</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Ajuste dinámico inteligente: llena el ancho de las filas y oculta desbordes
    requestAnimationFrame(() => this.fitBadgesDynamically());
    setTimeout(() => this.fitBadgesDynamically(), 100);
    setTimeout(() => this.fitBadgesDynamically(), 300);

    // Observer para recalcular ante cambios de tamaño de pantalla o contenedor
    if (!this.badgesResizeObserver && window.ResizeObserver) {
      this.badgesResizeObserver = new ResizeObserver(() => {
        this.fitBadgesDynamically();
      });
      const grid = document.getElementById('badgesGrid');
      if (grid) this.badgesResizeObserver.observe(grid);
    }
    if (!this._windowResizeListenerAdded) {
      this._windowResizeListenerAdded = true;
      window.addEventListener('resize', () => {
        if (this._badgeResizeDebounce) clearTimeout(this._badgeResizeDebounce);
        this._badgeResizeDebounce = setTimeout(() => this.fitBadgesDynamically(), 50);
      });
    }
  }

  /**
   * Recálculo debounced cuando una imagen termina de cargar en el navegador
   */
  handleBadgeImgLoaded(img) {
    if (this._badgeFitDebounce) clearTimeout(this._badgeFitDebounce);
    this._badgeFitDebounce = setTimeout(() => {
      this.fitBadgesDynamically();
    }, 40);
  }

  /**
   * Adapta dinámicamente los badges en cada caja para ocupar el espacio horizontal disponible:
   * - Muestra todos los distintivos posibles que quepan en las primeras 2 líneas completas
   * - Si un distintivo cae a una 3ª línea o desborda horizontalmente, se oculta limpiamente
   * - Actualiza el contador dinámico "+N" reflejando la cantidad exacta que no pudo ser mostrada
   */
  fitBadgesDynamically() {
    const boxes = document.querySelectorAll('.badge-section-box');
    if (!boxes || boxes.length === 0) return;

    boxes.forEach(box => {
      const flow = box.querySelector('.badges-flow-container');
      const counterEl = box.querySelector('.badge-hidden-counter');
      if (!flow) return;

      const chips = Array.from(flow.querySelectorAll('.badge-chip'));
      if (chips.length === 0) return;

      // 1. Mostrar temporalmente todos los chips para medir geometría real
      chips.forEach(c => {
        c.style.display = '';
      });

      const flowRect = flow.getBoundingClientRect();
      if (!flowRect || flowRect.width <= 0) return;

      // 2. Medir alturas de línea y límites horizontales (máximo 2 líneas completas)
      const firstTop = chips[0].offsetTop;
      let secondTop = null;
      let reachedLimit = false;

      for (let i = 0; i < chips.length; i++) {
        const c = chips[i];
        if (reachedLimit) {
          c.style.display = 'none';
          continue;
        }

        const top = c.offsetTop;
        if (top > firstTop + 4 && secondTop === null) {
          secondTop = top;
        }

        // Si salta a una 3ª línea (o posterior): alcanzamos el límite
        if (secondTop !== null && top > secondTop + 4) {
          reachedLimit = true;
          c.style.display = 'none';
          continue;
        }

        // Comprobación horizontal independiente de la columna usando coordenadas de la caja
        const chipRect = c.getBoundingClientRect();
        if (chipRect.right > flowRect.right + 2) {
          reachedLimit = true;
          c.style.display = 'none';
          continue;
        }
      }

      // 3. Calcular cantidad de chips ocultos por desborde
      const hiddenInDom = chips.filter(c => c.style.display === 'none').length;
      const visibleCount = chips.length - hiddenInDom;
      const totalCount = counterEl ? (parseInt(counterEl.dataset.total, 10) || chips.length) : chips.length;

      // REGLA FUNDAMENTAL: Solo mostrar "+N" si realmente se desbordaron elementos (hiddenInDom > 0).
      // Si todos los elementos caben en las 2 líneas, no hay nada oculto y NUNCA se muestra un "+N" fantasma.
      const hiddenCount = (hiddenInDom > 0) ? Math.max(hiddenInDom, totalCount - visibleCount) : 0;

      if (counterEl) {
        if (hiddenCount > 0) {
          counterEl.innerText = `+${hiddenCount}`;
          counterEl.style.display = '';
        } else {
          counterEl.innerText = '';
          counterEl.style.display = 'none';
        }
      }
    });
  }

  /**
   * Precarga una imagen en memoria con timeout de seguridad.
   * Rechaza si tarda más de timeoutMs o si no tiene dimensiones válidas.
   */
  preloadImage(url, timeoutMs = 4500) {
    return new Promise((resolve, reject) => {
      if (!url) return reject(new Error('URL vacía'));
      const img = new Image();
      let timer = setTimeout(() => {
        img.onload = img.onerror = null;
        reject(new Error(`Timeout (${timeoutMs}ms) precargando: ${url}`));
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timer);
        if (img.naturalWidth > 10 && img.naturalHeight > 10) {
          resolve({ url, img });
        } else {
          reject(new Error(`Dimensiones inválidas para: ${url}`));
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error(`Fallo al cargar imagen: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Baraja la baraja de pósters (Fisher-Yates) excluyendo el título actualmente visible
   */
  refillPosterDeck() {
    const currentImdb = this.currentDemoItem ? this.currentDemoItem.imdbId : null;
    const pool = DEMO_POSTERS.filter(p => p.imdbId !== currentImdb);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.posterDeck = pool;
  }

  /**
   * Obtiene el siguiente candidato a mostrar sin repeticiones inmediatas
   */
  drawNextCandidate() {
    if (!this.posterDeck || this.posterDeck.length === 0) {
      this.refillPosterDeck();
    }
    return this.posterDeck.shift() || DEMO_POSTERS[0];
  }

  /**
   * Resuelve las 3 URLs correspondientes a un candidato de demostración
   */
  async resolveCandidateUrls(item) {
    const tmdbKey = encodeURIComponent((state.apiKeys.tmdb || '').trim());
    const mdblistKey = encodeURIComponent((state.apiKeys.mdblist || '').trim());

    // 1. BetterPoster URL
    const customBetterInput = document.getElementById('customUrlBetterposter');
    const customBetterUrl = (customBetterInput && customBetterInput.value.trim()) || '';
    let betterUrl = customBetterUrl || 'https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM';
    betterUrl = betterUrl
      .replace(/\{imdb_id\??\}/g, item.imdbId)
      .replace(/\{id\??\}/g, item.imdbId)
      .replace(/\{tmdb_id\??\}/g, item.tmdbId)
      .replace(/\{type\??\}/g, item.type);

    // 2. PostersPlus URL con logo_priority
    const customPlusInput = document.getElementById('customUrlPostersplus');
    const customPlusUrl = (customPlusInput && customPlusInput.value.trim()) || '';
    const defaultPlusPattern = `https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&primary_client=stremio_tv_nuvio&tmdb_key=${tmdbKey}&mdblist_key=${mdblistKey}&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0`;

    let plusUrl = customPlusUrl || defaultPlusPattern;
    plusUrl = plusUrl
      .replace(/\{tmdb_id\??\}/g, item.tmdbId)
      .replace(/\{imdb_id\??\}/g, item.imdbId)
      .replace(/\{id\??\}/g, item.imdbId)
      .replace(/\{type\??\}/g, item.type)
      .replace(/\{tmdb_key\??\}/g, tmdbKey)
      .replace(/\{mdblist_key\??\}/g, mdblistKey);

    // 3. Default / Nativo TMDB
    let defaultUrl = item.fallbackPoster;
    if (state.apiKeys.tmdb && state.apiKeys.tmdb.trim()) {
      try {
        const endpoint = (item.type === 'series') ? 'tv' : 'movie';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${item.tmdbId}?api_key=${encodeURIComponent(state.apiKeys.tmdb.trim())}&language=es-MX`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.poster_path) {
            defaultUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
          }
        }
      } catch (_) {
        defaultUrl = item.fallbackPoster;
      }
    }

    return { item, betterUrl, plusUrl, defaultUrl };
  }

  /**
   * Intenta precargar y verificar los 3 pósters al 100%.
   * Devuelve el objeto verificado si los 3 cargaron, o null si alguno falló.
   */
  async verifyAndPreloadTriple(item) {
    try {
      const resolved = await this.resolveCandidateUrls(item);
      await Promise.all([
        this.preloadImage(resolved.defaultUrl, 4500),
        this.preloadImage(resolved.betterUrl, 4500),
        this.preloadImage(resolved.plusUrl, 4500)
      ]);
      return resolved;
    } catch (err) {
      console.warn(`[PosterRotation] Título "${item.title}" descartado por carátula no disponible:`, err.message);
      return null;
    }
  }

  /**
   * Ejecuta la rotación hacia el siguiente título válido.
   * Busca hasta 6 candidatos hasta encontrar uno donde carguen las 3 carátulas al 100%.
   */
  async rotateToNextValidPoster(withTransition = true) {
    if (this.isTransitioningPoster) return;

    let verified = null;
    for (let i = 0; i < 6; i++) {
      const candidate = this.drawNextCandidate();
      verified = await this.verifyAndPreloadTriple(candidate);
      if (verified) break;
    }

    if (!verified) return;

    await this.displayVerifiedDemoItem(verified, withTransition);
  }

  /**
   * Muestra el candidato verificado con desvanecimiento simultáneo sincronizado
   */
  async displayVerifiedDemoItem(verified, withTransition = true) {
    const { item, defaultUrl, betterUrl, plusUrl } = verified;
    const titleEl = document.getElementById('posterDemoTitle');
    const imgDefault = document.getElementById('posterPreviewDefault');
    const imgBetter = document.getElementById('posterPreviewBetter');
    const imgPlus = document.getElementById('posterPreviewPostersPlus');
    const imgs = [imgDefault, imgBetter, imgPlus].filter(Boolean);

    const updateContent = () => {
      if (titleEl) {
        titleEl.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono text-[9px] uppercase font-bold mr-1.5">${item.category}</span><span title="${item.title}">${item.title}</span>`;
      }

      if (imgBetter) imgBetter.src = betterUrl;
      if (imgPlus) imgPlus.src = plusUrl;
      if (imgDefault) imgDefault.src = defaultUrl;

      this.currentDemoItem = item;
      this.currentDemoIndex = DEMO_POSTERS.findIndex(p => p.imdbId === item.imdbId);
      if (this.currentDemoIndex === -1) this.currentDemoIndex = 0;
    };

    if (withTransition) {
      this.isTransitioningPoster = true;
      imgs.forEach(img => { img.style.opacity = '0'; });
      if (titleEl) titleEl.style.opacity = '0';

      await new Promise(r => setTimeout(r, 300));

      updateContent();

      imgs.forEach(img => { img.style.opacity = '1'; });
      if (titleEl) titleEl.style.opacity = '1';
      this.isTransitioningPoster = false;
    } else {
      updateContent();
      imgs.forEach(img => { img.style.opacity = '1'; });
      if (titleEl) titleEl.style.opacity = '1';
    }
  }

  async updateStep5PosterPreviews() {
    const current = this.currentDemoItem || DEMO_POSTERS[this.currentDemoIndex] || DEMO_POSTERS[0];
    const verified = await this.verifyAndPreloadTriple(current);
    if (verified) {
      await this.displayVerifiedDemoItem(verified, false);
    }
  }

  startPosterRotation() {
    this.stopPosterRotation();
    this.posterRotationTimer = setInterval(() => {
      this.rotateToNextValidPoster(true);
    }, 5500);
  }

  stopPosterRotation() {
    if (this.posterRotationTimer) {
      clearInterval(this.posterRotationTimer);
      this.posterRotationTimer = null;
    }
  }

  async nextDemoPoster() {
    this.stopPosterRotation();
    await this.rotateToNextValidPoster(true);
    this.startPosterRotation();
  }

  async prevDemoPoster() {
    this.stopPosterRotation();
    let prevIdx = (this.currentDemoIndex - 1 + DEMO_POSTERS.length) % DEMO_POSTERS.length;
    let verified = null;
    for (let i = 0; i < 6; i++) {
      const candidate = DEMO_POSTERS[prevIdx];
      verified = await this.verifyAndPreloadTriple(candidate);
      if (verified) break;
      prevIdx = (prevIdx - 1 + DEMO_POSTERS.length) % DEMO_POSTERS.length;
    }
    if (verified) {
      await this.displayVerifiedDemoItem(verified, true);
    }
    this.startPosterRotation();
  }

  updatePosterCardsUI() {
    const currentEngine = (state.preferences && state.preferences.posterEngine) || 'default';
    const cards = [
      { id: 'cardPosterDefault', engine: 'default' },
      { id: 'cardPosterBetter', engine: 'betterposter' },
      { id: 'cardPosterPlus', engine: 'postersplus' }
    ];

    cards.forEach(({ id, engine }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const isSelected = (currentEngine === engine);
      const checkIcon = el.querySelector('.card-check-icon');

      if (isSelected) {
        el.className = "poster-option-card relative p-5 rounded-[24px] bg-white/[0.08] border-2 border-[#ffd479] shadow-[0_0_25px_rgba(255,212,121,0.2)] cursor-pointer transition-all flex flex-col justify-between gap-3 group";
        if (checkIcon) {
          checkIcon.className = "w-5 h-5 rounded-full border-2 border-[#ffd479] bg-[#ffd479] flex items-center justify-center text-[10px] text-[#08090c] card-check-icon font-bold shadow-sm";
        }
      } else {
        el.className = "poster-option-card relative p-5 rounded-[24px] bg-white/[0.03] border-2 border-white/[0.08] hover:border-white/20 cursor-pointer transition-all flex flex-col justify-between gap-3 group shadow-[var(--shadow-lift)]";
        if (checkIcon) {
          checkIcon.className = "w-5 h-5 rounded-full border-2 border-white/20 bg-transparent flex items-center justify-center text-[10px] text-transparent card-check-icon";
        }
      }
    });
  }

  updatePreferencesUI() {
    const toggleEnrichment = document.getElementById('toggleTmdbEnrichment');
    const toggleRatings = document.getElementById('toggleMdblistRatings');
    const labelEnrichment = document.getElementById('labelTmdbEnrichment');
    const labelRatings = document.getElementById('labelMdblistRatings');
    if (toggleEnrichment) {
      toggleEnrichment.checked = Boolean(state.preferences.tmdbEnrichment);
      if (labelEnrichment) {
        labelEnrichment.textContent = toggleEnrichment.checked ? 'Activado' : 'Desactivado';
        labelEnrichment.className = toggleEnrichment.checked
          ? 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider'
          : 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
      }
    }
    if (toggleRatings) {
      toggleRatings.checked = Boolean(state.preferences.mdblistRatings);
      if (labelRatings) {
        labelRatings.textContent = toggleRatings.checked ? 'Activado' : 'Desactivado';
        labelRatings.className = toggleRatings.checked
          ? 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider'
          : 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
      }
    }

    const toggleBadges = document.getElementById('toggleBadgesCustomization');
    const labelBadges = document.getElementById('labelBadgesCustomization');
    const galleryBadges = document.getElementById('badgesGalleryContainer');
    if (toggleBadges) {
      const isBadgesEnabled = Boolean(state.preferences.badgesEnabled);
      toggleBadges.checked = isBadgesEnabled;
      if (labelBadges) {
        labelBadges.textContent = isBadgesEnabled ? 'Activado' : 'Desactivado';
        labelBadges.className = isBadgesEnabled
          ? 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider'
          : 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
      }
      if (galleryBadges) {
        if (isBadgesEnabled) {
          galleryBadges.classList.add('is-open');
          this.renderBadgeModulesUI();
          this.renderBadgesGrid();
          setTimeout(() => this.fitBadgesDynamically(), 450);
        } else {
          galleryBadges.classList.remove('is-open');
        }
      }
    }

    this.updatePosterCardsUI();
    this.updateStep5PosterPreviews();
  }

  setupStep6AddonsManager() {
    const btnOpenModal = document.getElementById('btnOpenAddAddonModal');
    const modal = document.getElementById('modalAddAddon');
    const btnCloseModal = document.getElementById('btnCloseAddAddonModal');
    const btnCancelModal = document.getElementById('btnCancelAddAddon');
    const btnConfirmModal = document.getElementById('btnConfirmAddAddon');
    const urlInput = document.getElementById('inputAddonManifestUrl');
    const nameInput = document.getElementById('inputAddonCustomName');

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
    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddAddonConfirm();
        }
      });
    }
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
  }

  renderAddonsList() {
    const container = document.getElementById('addonsManagerContainer');
    if (!container) return;

    const addons = state.profileAddons || [];

    // Tarjeta Anclada de AIOMetadata en posición #1
    let html = `
      <div class="p-4 sm:p-4.5 rounded-[20px] bg-white/[0.05] border-2 border-[#ffd479]/40 shadow-[0_0_20px_rgba(255,212,121,0.12)] flex items-center justify-between gap-3 select-none transition-all">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-[#ffd479]/15 border border-[#ffd479]/30 text-[#ffd479] flex items-center justify-center text-base shrink-0 shadow-sm">
            <i class="fa-solid fa-sparkles"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-white tracking-wide">AIOMetadata Latino</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ffd479]/15 text-[#ffd479] border border-[#ffd479]/30 font-semibold">Posición #1</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Anclado Arriba</span>
            </div>
            <p class="text-[11px] text-white/60 truncate mt-0.5">
              Addon Principal de Metadatos: catálogos, sinopsis, calificaciones y pósters personalizados en español latino.
            </p>
          </div>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <span class="text-xs text-[#ffd479]/80 font-mono hidden sm:inline-block pr-1 font-semibold">Prioridad #1</span>
          <div class="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 text-white/40 flex items-center justify-center text-xs" title="AIOMetadata siempre permanece en la posición #1">
            <i class="fa-solid fa-lock text-[10px]"></i>
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
        const name = addon.name || `Addon ${pos}`;
        const url = addon.manifest_url || addon.url || '';

        html += `
          <div class="p-3.5 sm:p-4 rounded-[18px] bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] flex items-center justify-between gap-3 transition-all duration-150">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 text-white/70 flex items-center justify-center text-sm shrink-0">
                <i class="fa-solid fa-puzzle-piece"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-xs sm:text-sm text-white">${name}</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70 border border-white/10">Posición #${pos}</span>
                  ${addon.isCustomAdded ? '<span class="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">Nuevo</span>' : ''}
                </div>
                <p class="text-[10px] font-mono text-white/40 truncate max-w-md mt-0.5 select-all" title="${url}">
                  ${url || 'Sin URL de manifiesto'}
                </p>
              </div>
            </div>
            
            <div class="shrink-0 flex items-center gap-1.5">
              <!-- Subir orden (▲) -->
              <button type="button" 
                      onclick="window.appController.moveAddon(${idx}, -1)" 
                      ${isFirstSecondary ? 'disabled' : ''} 
                      class="w-7 h-7 rounded-lg ${isFirstSecondary ? 'opacity-20 cursor-not-allowed text-white/20' : 'text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95'} border border-white/[0.08] flex items-center justify-center transition-all" 
                      title="${isFirstSecondary ? 'No puede subir por encima de AIOMetadata' : 'Subir prioridad'}">
                <i class="fa-solid fa-chevron-up text-[10px]"></i>
              </button>

              <!-- Bajar orden (▼) -->
              <button type="button" 
                      onclick="window.appController.moveAddon(${idx}, 1)" 
                      ${isLastSecondary ? 'disabled' : ''} 
                      class="w-7 h-7 rounded-lg ${isLastSecondary ? 'opacity-20 cursor-not-allowed text-white/20' : 'text-white/60 hover:text-white hover:bg-white/[0.1] active:scale-95'} border border-white/[0.08] flex items-center justify-center transition-all" 
                      title="${isLastSecondary ? 'Último elemento de la lista' : 'Bajar prioridad'}">
                <i class="fa-solid fa-chevron-down text-[10px]"></i>
              </button>

              <!-- Eliminar Addon (🗑️) -->
              <button type="button" 
                      onclick="window.appController.removeAddon(${idx})" 
                      class="w-7 h-7 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/15 active:scale-95 border border-white/[0.08] flex items-center justify-center transition-all ml-1" 
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
            Puedes agregar tus addons de streaming (AIOStreams, Torrentio, Torbox, etc.) pulsando el botón <strong class="text-white">"Agregar Addon"</strong> o usando las sugerencias de arriba.
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
    const name = addon?.name || 'este addon';
    if (confirm(`¿Deseas remover el addon "${name}" de este perfil?`)) {
      state.removeAddon(index);
      this.renderAddonsList();
      this.showToast(`Addon "${name}" removido de la lista.`, 'info');
    }
  }

  quickAddSuggestion(key) {
    const suggestions = {
      aiostreams: {
        name: 'AIOStreams',
        url: 'https://aiostreams.viren070.me/manifest.json'
      },
      addlat: {
        name: 'ADD-LAT (Latino)',
        url: 'https://lat-add.midnightignite.me/manifest.json'
      },
      torbox: {
        name: 'Torbox Stremio',
        url: 'https://stremio.torbox.app/manifest.json'
      },
      torrentio: {
        name: 'Torrentio Lite',
        url: 'https://torrentio.strem.fun/manifest.json'
      },
      cinetorrent: {
        name: 'CineTorrent',
        url: 'https://cinetorrent.midnightignite.me/manifest.json'
      }
    };

    const item = suggestions[key];
    if (!item) return;

    this.openAddAddonModal(item.url, item.name);
  }

  openAddAddonModal(defaultUrl = '', defaultName = '') {
    const modal = document.getElementById('modalAddAddon');
    const urlInput = document.getElementById('inputAddonManifestUrl');
    const nameInput = document.getElementById('inputAddonCustomName');

    if (urlInput) urlInput.value = defaultUrl;
    if (nameInput) nameInput.value = defaultName;

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

  handleAddAddonConfirm() {
    const urlInput = document.getElementById('inputAddonManifestUrl');
    const nameInput = document.getElementById('inputAddonCustomName');
    const url = (urlInput ? urlInput.value : '').trim();
    let name = (nameInput ? nameInput.value : '').trim();

    if (!url) {
      this.showToast('Por favor ingresa la URL del manifest del addon.', 'warning');
      if (urlInput) urlInput.focus();
      return;
    }

    if (!name) {
      try {
        const u = new URL(url);
        name = u.hostname.replace(/^(www\.|stremio\.)/, '').split('.')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      } catch (_) {
        name = 'Nuevo Addon';
      }
    }

    state.addCustomAddon(url, name);
    this.closeAddAddonModal();
    this.renderAddonsList();
    this.showToast(`✓ Addon "${name}" agregado exitosamente a la lista.`, 'success');
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
      passwordInput.value = state.aiometadata.password || '';
      passwordInput.addEventListener('input', (e) => {
        state.aiometadata.password = e.target.value;
        this.updateStep6ExecuteButton();
        this.updateManualModeButtons();
        this.updateNavigationButtons();
      });
    }

    if (btnGenPass && passwordInput) {
      btnGenPass.addEventListener('click', () => {
        const randomPass = 'Latino-' + Math.random().toString(36).substring(2, 8) + '-' + Math.floor(1000 + Math.random() * 9000);
        passwordInput.value = randomPass;
        state.aiometadata.password = randomPass;
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
        // Validar todos los pasos (1 a 6) antes de ejecutar
        for (let i = 1; i <= 6; i++) {
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

        PipelineInjector.execute();
      });
    }

    if (btnDownloadCol) {
      btnDownloadCol.addEventListener('click', () => {
        PipelineInjector.downloadCollectionsJson();
        recordSuccessfulCompletion().catch(err => {
          console.warn('[Counter] Error actualizando contador tras descargar colecciones:', err);
        });
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
      if (extraCount > 0) {
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

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  appController.init();
});
