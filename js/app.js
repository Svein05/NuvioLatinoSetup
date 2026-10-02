/**
 * Controlador Principal de la Aplicación (UI y Eventos)
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { state } from './state.js';
import { CONFIG } from './config.js';
import { MiniNuvio } from './mini-nuvio.js';
import { NuvioClient } from './nuvio-client.js';
import { PipelineInjector } from './injector.js';

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
    this.nextDemoPoster = this.nextDemoPoster.bind(this);
    this.prevDemoPoster = this.prevDemoPoster.bind(this);
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
    this.setupStep5Preferences();
    this.setupStep6Injection();

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

    // Si estamos en el paso 2, 3, 5 o 6, refrescar o sincronizar vistas
    if (currentStep === 2) {
      this.renderProfiles();
    } else if (currentStep === 3) {
      state.unlockStep(4);
    } else if (currentStep === 5) {
      state.unlockStep(6);
      this.updatePreferencesUI();
      this.startPosterRotation();
    } else if (currentStep === 6) {
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
      this.refreshStep6Summary();
      this.updateStep6ExecuteButton();
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
      btnNext.className = "px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-brand-500/20 cursor-pointer";
      btnNext.title = "Avanzar al siguiente paso";
    } else {
      btnNext.className = "px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700/60 shadow-none transition-all flex items-center gap-1.5 cursor-not-allowed";
      btnNext.title = val.error || "Completa este paso para continuar";
    }
  }

  updateStep6ExecuteButton() {
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

    const validatePasswordMatch = () => {
      if (authMode !== 'signup' || !confirmInput || !matchBadge) return;
      const p1 = passInput ? passInput.value : '';
      const p2 = confirmInput ? confirmInput.value : '';

      if (!p2) {
        matchBadge.className = 'text-[11px] text-slate-500 mt-1 hidden flex items-center gap-1 font-medium';
        matchBadge.innerHTML = '';
        confirmInput.className = 'w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-brand-500 text-sm text-slate-200 transition-colors';
        return;
      }

      matchBadge.classList.remove('hidden');
      if (p1 === p2) {
        confirmInput.className = 'w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-emerald-500/60 focus:outline-none focus:border-emerald-500 text-sm text-slate-200 transition-colors';
        matchBadge.className = 'text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium';
        matchBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-xs"></i> <span>Las contraseñas coinciden perfectamente.</span>';
      } else {
        confirmInput.className = 'w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-rose-500/60 focus:outline-none focus:border-rose-500 text-sm text-slate-200 transition-colors';
        matchBadge.className = 'text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium';
        matchBadge.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400 text-xs"></i> <span>Las contraseñas no coinciden.</span>';
      }
    };

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
        if (confirmGroup) confirmGroup.classList.add('hidden');
        if (confirmInput) confirmInput.value = '';
        if (matchBadge) matchBadge.classList.add('hidden');
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

  setupStep2Profiles() {
    this.renderProfiles();

    const btnOpenModal = document.getElementById('btnOpenNewProfileModal');
    const modal = document.getElementById('modalNewProfile');
    const btnCloseModal = document.getElementById('btnCloseNewProfileModal');
    const btnCancelModal = document.getElementById('btnCancelNewProfile');
    const btnConfirmModal = document.getElementById('btnConfirmNewProfile') || document.getElementById('btnCreateProfile');
    const nameInput = document.getElementById('inputNewProfileName') || document.getElementById('newProfileName');

    if (btnOpenModal && modal) {
      btnOpenModal.addEventListener('click', () => {
        if (state.profiles && state.profiles.length >= 6) {
          this.showToast('Has alcanzado el límite máximo de 6 perfiles permitidos en Nuvio. Selecciona uno existente.', 'warning');
          return;
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (nameInput) {
          nameInput.value = '';
          nameInput.focus();
        }
      });
    }

    const closeModal = () => {
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    };

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (btnConfirmModal && nameInput) {
      const handleCreate = async () => {
        if (state.profiles && state.profiles.length >= 6) {
          this.showToast('Has alcanzado el límite máximo de 6 perfiles permitidos en Nuvio. Selecciona uno existente.', 'warning');
          closeModal();
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

          closeModal();
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
    const container = document.getElementById('profilesList') || document.getElementById('profilesContainer');
    if (!container) return;

    const btnOpenModal = document.getElementById('btnOpenNewProfileModal');
    if (btnOpenModal) {
      if (state.profiles && state.profiles.length >= 6) {
        btnOpenModal.classList.add('opacity-50', 'cursor-not-allowed');
        btnOpenModal.setAttribute('title', 'Límite máximo de 6 perfiles alcanzado en tu cuenta de Nuvio');
      } else {
        btnOpenModal.classList.remove('opacity-50', 'cursor-not-allowed');
        btnOpenModal.removeAttribute('title');
      }
    }

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
               class="group relative cursor-pointer p-4 rounded-2xl flex flex-col items-center gap-2.5 transition-all duration-200 select-none ${
                 isSelected 
                   ? 'border-2 border-[#ffd479] bg-white/[0.08] shadow-[0_0_20px_rgba(255,212,121,0.2)] transform -translate-y-0.5 backdrop-blur-[24px]' 
                   : 'border border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] hover:-translate-y-0.5 backdrop-blur-[16px]'
               }">
            ${isSelected ? `
              <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ffd479] text-[#08090c] flex items-center justify-center text-[10px] shadow-md font-bold">
                <i class="fa-solid fa-check"></i>
              </div>
            ` : `
              <div class="absolute top-2 right-2 w-4 h-4 rounded-full border border-white/20 bg-white/[0.05] flex items-center justify-center text-[8px] text-transparent group-hover:border-white/40">
                <i class="fa-solid fa-check text-white/40"></i>
              </div>
            `}
            <div class="relative">
              <img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full object-cover transition-all ${
                isSelected ? 'ring-2 ring-[#ffd479] shadow-md scale-105' : 'ring-1 ring-white/20 group-hover:ring-white/40'
              }">
            </div>
            <div class="text-center w-full">
              <div class="text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white'}">${name}</div>
              <div class="text-[10px] mt-0.5 ${isSelected ? 'text-[#ffd479] font-mono font-bold uppercase tracking-wider' : 'text-white/40 group-hover:text-white/60'}">
                ${isSelected ? '✓ Seleccionado' : 'Click para elegir'}
              </div>
            </div>
          </div>
        `;
      }).join('');

      this.updateProfileWarning(state.selectedProfileId, state.selectedProfileName);
    } else {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-[24px]">
          <i class="fa-solid fa-user-circle text-4xl text-white/30 mb-2"></i>
          <p class="text-sm font-medium text-white/90">No se encontraron perfiles en tu cuenta de Nuvio</p>
          <p class="text-xs text-white/50 mt-1 mb-4">Crea tu primer perfil para comenzar a configurar tus colecciones.</p>
          <button type="button" onclick="document.getElementById('btnOpenNewProfileModal')?.click()" class="lat-capsule-btn solid text-xs">
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

    this.updatePosterCardsUI();
    this.updateStep5PosterPreviews();
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
    this.updatePosterCardsUI();
    this.updateStep5PosterPreviews();
  }

  setupStep6Injection() {
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
            if (i < 6) window.goToStep(i);
            if (i === 6 && passwordInput) passwordInput.focus();
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

  refreshStep6Summary() {
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
    if (countEl) countEl.innerText = `${activeFolders} carruseles seleccionados`;
    if (catalogsEl) catalogsEl.innerText = `${catalogsCount} catálogos sincronizados`;

    if (posterEngineEl) {
      const engine = state.preferences?.posterEngine || 'default';
      if (engine === 'betterposter') {
        posterEngineEl.innerText = 'BetterPoster (es-MX)';
        posterEngineEl.className = 'text-brand-400 font-bold block truncate';
      } else if (engine === 'postersplus') {
        posterEngineEl.innerText = 'PostersPlus (Badges)';
        posterEngineEl.className = 'text-indigo-400 font-bold block truncate';
      } else {
        posterEngineEl.innerText = 'Nativo / Limpio';
        posterEngineEl.className = 'text-emerald-400 font-bold block truncate';
      }
    }

    if (enrichmentEl) {
      const enr = Boolean(state.preferences?.tmdbEnrichment);
      const rat = Boolean(state.preferences?.mdblistRatings && state.apiKeys.mdblist);
      if (enr && rat) {
        enrichmentEl.innerText = 'TMDB + MDBList (Activos)';
        enrichmentEl.className = 'text-slate-200 font-bold block truncate';
      } else if (enr) {
        enrichmentEl.innerText = 'Solo TMDB (Activo)';
        enrichmentEl.className = 'text-slate-200 font-bold block truncate';
      } else if (rat) {
        enrichmentEl.innerText = 'Solo MDBList (Activo)';
        enrichmentEl.className = 'text-slate-200 font-bold block truncate';
      } else {
        enrichmentEl.innerText = 'Desactivados';
        enrichmentEl.className = 'text-slate-500 font-bold block truncate';
      }
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
