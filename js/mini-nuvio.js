/**
 * Componente: Mini NUVIO Interactivo
 * Simulador visual del Home de Nuvio con Hero Backdrop, carruseles por sección,
 * controles de reordenación, toggles, explorador de catálogos con pósters en vivo (TMDB)
 * y modal de personalización en Español Latino.
 */
import { state } from './state.js';
import { TmdbService } from './tmdb-service.js';

export class MiniNuvio {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.focusedFolder = null;
    this.editingTarget = null; // { sectionId, folderId }
    this.searchTerm = '';

    // Suscribirse a cambios del estado
    state.subscribe((s, eventType) => {
      if (['COLLECTIONS_UPDATED', 'TEMPLATES_LOADED'].includes(eventType)) {
        this.render();
      }
    });
  }

  /**
   * Garantiza que exista el contenedor global de modales montado en document.body
   * Esto previene que el modal quede anclado a un contenedor con transform/animation
   * y garantiza centrado perfecto respecto al monitor del usuario.
   */
  ensureModalContainer() {
    let container = document.getElementById('miniNuvioModalsContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'miniNuvioModalsContainer';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Inicializa la vista del Mini Nuvio
   */
  init() {
    this.ensureModalContainer();
    this.render();
  }

  /**
   * Renderiza el componente completo
   */
  render() {
    if (!this.container) return;

    if (!state.collections || state.collections.length === 0) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-brand-500 mb-2"></i>
          <p class="text-sm">Cargando colecciones nativas de Nuvio...</p>
        </div>
      `;
      return;
    }

    // Si no hay tarjeta enfocada, enfocar la primera activa disponible
    if (!this.focusedFolder) {
      for (const sec of state.collections) {
        if (sec.folders && sec.folders.length > 0) {
          this.focusedFolder = sec.folders[0];
          break;
        }
      }
    }

    // Contadores globales
    let totalFolders = 0;
    let activeFolders = 0;
    state.collections.forEach(sec => {
      if (sec.enabled !== false) {
        (sec.folders || []).forEach(f => {
          totalFolders++;
          if (f.enabled !== false) activeFolders++;
        });
      }
    });

    this.container.innerHTML = `
      <div class="flex flex-col gap-5">

        <!-- Toolbar Superior del Mini Nuvio -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
          <div class="flex items-center gap-2">
            <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              ${activeFolders}/${totalFolders} activas
            </span>
            ${state.apiKeys.tmdb ? `
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                <i class="fa-solid fa-bolt text-[9px]"></i> TMDB en vivo (es-MX)
              </span>
            ` : ''}
          </div>

          <div class="flex items-center gap-2">
            <button onclick="window.miniNuvioInstance.toggleAll(true)" class="px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all">
              <i class="fa-solid fa-check-double mr-1"></i> Activar Todo
            </button>
            <button onclick="window.miniNuvioInstance.toggleAll(false)" class="px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all">
              <i class="fa-solid fa-ban mr-1"></i> Desactivar Todo
            </button>
            <button onclick="window.miniNuvioInstance.resetDefaults()" class="px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/20 transition-all" title="Restaurar valores de plantilla">
              <i class="fa-solid fa-rotate-left mr-1"></i> Restaurar
            </button>
          </div>
        </div>

        <!-- Hero Header: Live Backdrop Preview -->
        ${this.renderHeroBanner()}

        <!-- Carruseles por Sección con contenedor Sortable -->
        <div id="miniNuvioSectionsList" class="space-y-6">
          ${state.collections.map((section, sIndex) => this.renderSection(section, sIndex)).join('')}
        </div>

      </div>
    `;

    // Inicializar SortableJS para reordenación fluida y animaciones en tiempo real
    this.initSortables();
  }

  /**
   * Renderiza el Hero Header dinámico
   */
  renderHeroBanner() {
    const f = this.focusedFolder;
    if (!f) return '';

    const backdrop = f.heroBackdropUrl || f.coverImageUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200';
    const logo = f.titleLogoUrl;
    const emoji = f.coverEmoji || '🎬';
    const title = f.title || 'Colección';
    const shape = f.tileShape || 'LANDSCAPE';

    // Tipos de catálogo asociados
    const types = new Set();
    (f.catalogSources || f.sources || []).forEach(s => {
      if (s.type) types.add(s.type);
    });
    const typeBadges = Array.from(types).map(t => {
      let label = t === 'movie' ? 'Películas' : t === 'series' ? 'Series' : t === 'anime' ? 'Anime' : t;
      return `<span class="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/80 text-[10px] text-slate-300 font-medium">${label}</span>`;
    }).join(' ');

    return `
      <div class="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 flex flex-col justify-end p-6 transition-all duration-300">
        <!-- Imagen de Fondo con Gradiente Cinematográfico -->
        <img src="${backdrop}" alt="${title}" class="absolute inset-0 w-full h-full object-cover opacity-45 filter blur-[1px] scale-105 transition-all duration-500" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent"></div>

        <!-- Contenido del Hero -->
        <div class="relative z-10 space-y-2 max-w-xl">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono text-[10px]">
              VISTA PREVIA ACTIVA
            </span>
            <span class="text-[10px] text-slate-400 font-mono uppercase">
              Formato: ${shape}
            </span>
          </div>

          <div class="flex items-center gap-3">
            ${logo ? `<img src="${logo}" alt="${title}" class="h-8 max-w-[160px] object-contain drop-shadow-md">` : ''}
            <h2 class="text-xl md:text-2xl font-black text-white tracking-wide drop-shadow-md flex items-center gap-2">
              <span>${emoji}</span>
              <span>${title}</span>
            </h2>
          </div>

          <div class="flex items-center gap-2 pt-1">
            ${typeBadges || '<span class="text-[10px] text-slate-400">Contenido Dinámico</span>'}
            <span class="text-xs text-slate-400">• ${f.enabled !== false ? '<span class="text-emerald-400 font-medium">Activa en Nuvio</span>' : '<span class="text-slate-500">Desactivada</span>'}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza una sección completa con su carrusel
   */
  renderSection(section, sIndex) {
    const isSectionEnabled = section.enabled !== false;
    const folders = section.folders || [];
    const activeCount = folders.filter(f => f.enabled !== false).length;
    const isFirstSection = sIndex === 0;
    const isLastSection = sIndex === state.collections.length - 1;

    return `
      <div 
        id="sectionContainer_${section.id}"
        data-section-index="${sIndex}"
        data-section-id="${section.id}"
        class="section-container bg-slate-950/60 border ${isSectionEnabled ? 'border-slate-800' : 'border-slate-900 opacity-60'} rounded-2xl p-4 transition-all"
      >
        <!-- Cabecera de la Sección con contorno dinámico al hover y agarre para arrastrar -->
        <div 
          class="section-header flex items-center justify-between mb-3 px-1 rounded-lg"
          onmouseenter="window.miniNuvioInstance.onSectionHeaderHover('${section.id}', true)"
          onmouseleave="window.miniNuvioInstance.onSectionHeaderHover('${section.id}', false)"
        >
          <div 
            class="section-drag-handle flex items-center gap-3 cursor-grab select-none"
            title="Arrastra desde aquí para reordenar esta sección verticalmente"
          >
            <span class="text-slate-500 hover:text-brand-400 transition-colors p-1" title="Arrastrar sección">
              <i class="fa-solid fa-grip-vertical text-xs"></i>
            </span>
            <button type="button" onclick="event.stopPropagation(); window.miniNuvioInstance.toggleSection('${section.id}')" class="no-drag text-slate-400 hover:text-brand-400 transition-colors" title="${isSectionEnabled ? 'Desactivar sección' : 'Activar sección'}">
              <i class="fa-solid ${isSectionEnabled ? 'fa-eye text-brand-500' : 'fa-eye-slash text-slate-600'}"></i>
            </button>
            <h3 onclick="event.stopPropagation(); window.miniNuvioInstance.openSectionModal('${section.id}')" class="no-drag text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2 cursor-pointer hover:text-white transition-colors" title="Haz click para personalizar esta sección">
              <span>${section.title || section.id}</span>
              <span class="text-[11px] font-mono text-slate-500 font-normal">(${activeCount}/${folders.length})</span>
            </h3>
          </div>

          <!-- Controles de Sección: Flechas Dobles (Cielo / Fondo) -->
          <div class="flex items-center gap-1.5 text-xs no-drag">
            <button onclick="window.miniNuvioInstance.moveSectionExtreme(${sIndex}, 'top')" ${isFirstSection ? 'disabled class="opacity-30 cursor-not-allowed"' : 'class="hover:text-brand-300 text-slate-400 transition-colors"'} title="Mover sección al cielo (primera posición)">
              <i class="fa-solid fa-angles-up px-1.5 py-1"></i>
            </button>
            <button onclick="window.miniNuvioInstance.moveSectionExtreme(${sIndex}, 'bottom')" ${isLastSection ? 'disabled class="opacity-30 cursor-not-allowed"' : 'class="hover:text-brand-300 text-slate-400 transition-colors"'} title="Tirar sección al fondo (última posición)">
              <i class="fa-solid fa-angles-down px-1.5 py-1"></i>
            </button>
            <button onclick="window.miniNuvioInstance.openSectionModal('${section.id}')" class="hover:text-brand-300 text-slate-300 ml-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1 transition-all" title="Personalizar y editar filas de la sección">
              <i class="fa-solid fa-sliders text-[11px] text-brand-400"></i>
              <span class="text-[11px] font-medium hidden sm:inline">Personalizar</span>
            </button>
          </div>
        </div>

        <!-- Carrusel Horizontal de Tarjetas (Rail Sortable interactivo) -->
        <div 
          id="carouselRail_${section.id}" 
          data-section-id="${section.id}"
          class="flex gap-3 overflow-x-auto items-start pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          ${folders.map((folder, fIndex) => this.renderFolderCard(section, folder, fIndex)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza una tarjeta individual de colección (Landscape o Poster)
   */
  renderFolderCard(section, folder, fIndex) {
    const isEnabled = folder.enabled !== false && section.enabled !== false;
    const isFocused = this.focusedFolder && this.focusedFolder.id === folder.id;
    const shape = folder.tileShape || 'LANDSCAPE';
    const isLandscape = shape === 'LANDSCAPE';
    
    // Dimensiones según tileShape estrictas con aspect ratio
    const sizeClasses = isLandscape 
      ? 'w-48 sm:w-56 shrink-0 aspect-video' 
      : 'w-32 sm:w-36 shrink-0 aspect-[2/3]';

    const imageSrc = folder.coverImageUrl || folder.focusGifUrl || folder.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';

    return `
      <div 
        id="folderCard_${section.id}_${folder.id}"
        data-section-id="${section.id}"
        data-folder-index="${fIndex}"
        data-folder-id="${folder.id}"
        class="draggable-card group relative ${sizeClasses} rounded-xl overflow-hidden border ${isFocused ? 'border-brand-500 ring-2 ring-brand-500/40 shadow-lg shadow-brand-500/20' : isEnabled ? 'border-slate-800' : 'border-slate-900 opacity-40'} bg-slate-900 select-none cursor-grab"
        onmouseenter="window.miniNuvioInstance.focusFolder('${section.id}', '${folder.id}')"
        onclick="window.miniNuvioInstance.openCatalogExplorer('${section.id}', '${folder.id}')"
      >
        <!-- Imagen de Portada -->
        <img src="${imageSrc}" alt="${folder.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none"></div>

        <!-- Checkbox de Activación (Esquina Superior Derecha, aislado de arrastre) -->
        <div 
          class="no-drag absolute top-2 right-2 z-20 cursor-pointer p-1" 
          onclick="event.stopPropagation()" 
          onmousedown="event.stopPropagation()" 
          onpointerdown="event.stopPropagation()"
          title="${isEnabled ? 'Desmarcar colección' : 'Activar colección'}"
        >
          <input 
            type="checkbox" 
            ${isEnabled ? 'checked' : ''} 
            onchange="window.miniNuvioInstance.toggleFolder('${section.id}', '${folder.id}')"
            class="no-drag w-4 h-4 rounded text-brand-600 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer shadow"
          >
        </div>

        <!-- Indicador de Emoji y Título en el Pie de Tarjeta -->
        <div class="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
          <div class="text-xs font-semibold text-white drop-shadow truncate flex items-center gap-1.5">
            <span>${folder.coverEmoji || '🎬'}</span>
            <span class="truncate">${folder.title}</span>
          </div>
        </div>

        <!-- Overlay con Acciones Rápidas (Visible en Hover) -->
        <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 p-2 z-30 transition-opacity" onclick="event.stopPropagation()">
          <button onclick="window.miniNuvioInstance.openCatalogExplorer('${section.id}', '${folder.id}')" class="no-drag px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transform hover:scale-105 transition-all">
            <i class="fa-solid fa-layer-group text-[11px]"></i>
            <span>Ver Catálogos</span>
          </button>

          <button onclick="window.miniNuvioInstance.openEditModal('${section.id}', '${folder.id}')" class="no-drag bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 shadow text-[11px] flex items-center gap-1.5 transition-all" title="Personalizar diseño de fila">
            <i class="fa-solid fa-sliders text-[10px] text-brand-400"></i>
            <span>Diseño</span>
          </button>

          <div class="text-[10px] text-slate-300/80 font-medium flex items-center gap-1 mt-0.5 pointer-events-none">
            <i class="fa-solid fa-arrows-left-right text-[9px] text-brand-400"></i>
            <span>Arrastra para ordenar</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Enfoca una colección y actualiza el Hero Banner
   */
  focusFolder(sectionId, folderId) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec) return;
    const folder = (sec.folders || []).find(f => f.id === folderId);
    if (folder) {
      this.focusedFolder = folder;
      // Actualizar solo el hero banner para no perder scroll del carrusel
      const heroEl = this.container.querySelector('.relative.w-full.h-48');
      if (heroEl) {
        heroEl.outerHTML = this.renderHeroBanner();
      } else {
        this.render();
      }
    }
  }

  toggleFolder(sectionId, folderId) {
    state.toggleFolder(sectionId, folderId);
  }

  toggleSection(sectionId) {
    state.toggleSection(sectionId);
  }

  toggleAll(enable) {
    state.collections.forEach(sec => {
      sec.enabled = enable;
      (sec.folders || []).forEach(f => { f.enabled = enable; });
    });
    state.notify('COLLECTIONS_UPDATED');
  }

  moveFolder(sectionId, fIndex, direction) {
    state.moveFolder(sectionId, fIndex, direction);
  }

  moveSection(sIndex, direction) {
    state.moveSection(sIndex, direction);
  }

  moveSectionExtreme(sIndex, destination) {
    state.moveSectionExtreme(sIndex, destination);
  }

  moveCatalogExtreme(sectionId, folderId, catalogIndex, destination) {
    const success = state.moveCatalogExtreme(sectionId, folderId, catalogIndex, destination);
    if (success) {
      this.refreshCatalogExplorer(sectionId, folderId);
    }
  }

  /* =================================================== */
  /* CONTORNO AZUL Y REORDENACIÓN FLUIDA (SORTABLEJS)    */
  /* =================================================== */
  onSectionHeaderHover(sectionId, isHovered) {
    const el = document.getElementById(`sectionContainer_${sectionId}`);
    if (el) {
      if (isHovered) {
        el.classList.add('header-hovered');
      } else {
        el.classList.remove('header-hovered');
      }
    }
  }

  /**
   * Inicializa las instancias de SortableJS para reordenar secciones y tarjetas
   * con animaciones fluidas en tiempo real donde los elementos se desplazan suavemente.
   */
  initSortables() {
    if (typeof Sortable === 'undefined') return;

    // 1. Sortable para Secciones Completas (Vertical)
    const sectionsEl = document.getElementById('miniNuvioSectionsList');
    if (sectionsEl) {
      if (this.sectionsSortable) {
        try { this.sectionsSortable.destroy(); } catch (e) {}
      }
      this.sectionsSortable = new Sortable(sectionsEl, {
        handle: '.section-drag-handle',
        animation: 250,
        ghostClass: 'section-sortable-ghost',
        chosenClass: 'is-chosen',
        dragClass: 'is-dragging',
        filter: 'input, button, a, .no-drag',
        preventOnFilter: false,
        onEnd: (evt) => {
          if (evt.oldIndex !== evt.newIndex) {
            state.reorderSection(evt.oldIndex, evt.newIndex);
          }
        }
      });
    }

    // 2. Sortable para Carruseles de Colecciones en cada Sección (Horizontal)
    this.folderSortables = this.folderSortables || [];
    this.folderSortables.forEach(s => { try { s.destroy(); } catch (e) {} });
    this.folderSortables = [];

    (state.collections || []).forEach(sec => {
      const railEl = document.getElementById(`carouselRail_${sec.id}`);
      if (railEl) {
        const sortable = new Sortable(railEl, {
          direction: 'horizontal',
          animation: 250,
          filter: 'input, button, a, .no-drag',
          preventOnFilter: false,
          ghostClass: 'card-sortable-ghost',
          chosenClass: 'is-chosen',
          dragClass: 'is-dragging',
          onEnd: (evt) => {
            if (evt.oldIndex !== evt.newIndex) {
              state.reorderFolder(sec.id, evt.oldIndex, evt.newIndex);
            }
          }
        });
        this.folderSortables.push(sortable);
      }
    });
  }

  /**
   * Resuelve el nombre en Español Latino para cualquier catálogo garantizando
   * que nunca aparezcan identificadores internos crudos como 'tmdb.trending_movie'.
   */
  resolveCatalogTitle(source, catalogMap) {
    if (source && source.title && source.title.trim()) {
      return source.title.trim();
    }
    const catId = source?.catalogId || source?.id || '';
    const type = source?.type || '';
    const meta = catalogMap ? catalogMap.get(catId) : null;

    if (meta && meta.name && !meta.name.toLowerCase().startsWith('tmdb.') && !meta.name.toLowerCase().startsWith('mdblist.')) {
      return meta.name;
    }

    // Mapeos canónicos limpios en Español Latino
    if (catId === 'tmdb.trending_movie' || (catId.startsWith('tmdb.trending') && type === 'movie')) {
      return 'Lo que todo el mundo esta viendo según TMDB (Películas) - Day';
    }
    if (catId === 'tmdb.trending_series' || (catId.startsWith('tmdb.trending') && type === 'series')) {
      return 'Lo que todo el mundo esta viendo según TMDB (Series) - Day';
    }
    if (catId === 'tmdb.top_movie' || (catId.startsWith('tmdb.top') && type === 'movie')) {
      return 'Lo más popular de hoy (Películas)';
    }
    if (catId === 'tmdb.top_series' || (catId.startsWith('tmdb.top') && type === 'series')) {
      return 'Lo más popular de hoy (Series)';
    }
    if (catId === 'trakt.recommendations.movies') {
      return 'Recomendaciones de Trakt (Películas)';
    }
    if (catId === 'trakt.recommendations.shows') {
      return 'Recomendaciones de Trakt (Series)';
    }
    if (catId.startsWith('tmdb.discover.movie.streaming.')) {
      const p = catId.replace('tmdb.discover.movie.streaming.', '').replace(/-/g, ' ');
      const pTitle = p.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `🎬 ${pTitle} (Películas)`;
    }
    if (catId.startsWith('tmdb.discover.series.streaming.')) {
      const p = catId.replace('tmdb.discover.series.streaming.', '').replace(/-/g, ' ');
      const pTitle = p.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `🎬 ${pTitle} (Series)`;
    }
    if (catId.startsWith('tmdb.discover.movie.genres.')) {
      const g = catId.replace('tmdb.discover.movie.genres.', '').replace(/-/g, ' ');
      const gTitle = g.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `🎭 ${gTitle} (Películas)`;
    }
    if (catId.startsWith('tmdb.discover.series.genres.')) {
      const g = catId.replace('tmdb.discover.series.genres.', '').replace(/-/g, ' ');
      const gTitle = g.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `🎭 ${gTitle} (Series)`;
    }

    if (meta && meta.name) return meta.name;
    return catId;
  }

  resetDefaults() {
    if (confirm('¿Deseas restaurar todas las colecciones a los valores originales de la plantilla?')) {
      state.resetCollections();
      this.focusedFolder = null;
    }
  }

  /**
   * Alias para abrir el modal integrado de edición de sección (sin usar prompt)
   */
  renameSection(sectionId) {
    this.openSectionModal(sectionId);
  }

  /**
   * Explorador Visual de Catálogos y Pósters Reales en Español Latino
   * Permite ver exactamente qué catálogos componen la colección seleccionada,
   * consumiendo la API de TMDB con la clave ingresada y alertando si requiere Trakt.
   */
  async openCatalogExplorer(sectionId, folderId) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec) return;
    const folder = (sec.folders || []).find(f => f.id === folderId);
    if (!folder) return;

    this.focusFolder(sectionId, folderId);
    const modalContainer = this.ensureModalContainer();

    const sources = folder.sources || folder.catalogSources || [];
    const allCatalogs = state.rawMetadataTemplate?.config?.catalogs || state.rawMetadataTemplate?.catalogs || [];
    const catalogMap = new Map();
    allCatalogs.forEach(cat => {
      if (cat.id) catalogMap.set(cat.id, cat);
    });

    const cover = folder.coverImageUrl || folder.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
    const tmdbKey = state.apiKeys.tmdb || '';

    modalContainer.innerHTML = `
      <div id="catalogExplorerModal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md transition-opacity">
        <div class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] text-slate-200">
          
          <!-- Encabezado de la Colección -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-950">
                <img src="${cover}" alt="${folder.title}" class="w-full h-full object-cover">
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>${folder.coverEmoji || '🎬'}</span>
                  <span>${folder.title}</span>
                </h3>
                <p class="text-[11px] text-slate-400">
                  Sección: <span class="text-slate-300 font-medium">${sec.title || sec.id}</span> • ${sources.length} catálogos en esta fila
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              ${tmdbKey ? `
                <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                  <i class="fa-solid fa-check"></i> TMDB Latino (es-MX)
                </span>
              ` : `
                <span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">
                  <i class="fa-solid fa-bolt"></i> Modo Vista Previa
                </span>
              `}
              <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          <!-- Cuerpo con Lista de Catálogos y Carruseles de Pósters -->
          <div id="catalogExplorerBody" class="overflow-y-auto space-y-6 pr-1.5 scrollbar-thin scrollbar-thumb-slate-700 flex-1">
            <div class="py-16 text-center text-slate-400">
              <i class="fa-solid fa-spinner fa-spin text-3xl text-brand-500 mb-3"></i>
              <p class="text-sm font-medium text-slate-200">Consultando catálogos y pósters de TMDB en español latino...</p>
              <p class="text-xs text-slate-500 mt-1">Cargando portadas en alta definición y puntuaciones oficiales.</p>
            </div>
          </div>

          <!-- Pie del Modal -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-800 shrink-0">
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="window.miniNuvioInstance.openAddCatalogModal('${sec.id}', '${folder.id}')" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-plus text-[11px]"></i>
                <span>Añadir Catálogo a esta fila</span>
              </button>
              <button type="button" onclick="window.miniNuvioInstance.openEditModal('${sec.id}', '${folder.id}')" class="px-3.5 py-2 rounded-xl text-xs font-medium text-brand-400 hover:text-brand-300 hover:bg-slate-800/80 border border-brand-500/30 transition-all flex items-center gap-1.5">
                <i class="fa-solid fa-sliders"></i>
                <span>Personalizar Portadas y Logos</span>
              </button>
            </div>

            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors">
              Cerrar Explorador
            </button>
          </div>

        </div>
      </div>
    `;

    // Cargar asíncronamente cada catálogo y sus pósters
    this.loadCatalogExplorerContent(sectionId, folderId, sources, catalogMap, tmdbKey);
  }

  /**
   * Carga y renderiza el contenido de cada catálogo dentro del Explorador
   * con controles para reordenar (subir/bajar), renombrar y eliminar.
   * Sin estrellas sobre pósters ni textos redundantes de simulación.
   */
  async loadCatalogExplorerContent(sectionId, folderId, sources, catalogMap, tmdbKey) {
    const bodyEl = document.getElementById('catalogExplorerBody');
    if (!bodyEl) return;

    if (sources.length === 0) {
      bodyEl.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <i class="fa-solid fa-film text-3xl text-slate-600 mb-2"></i>
          <p class="text-sm">Esta colección no tiene catálogos activos asignados.</p>
          <button type="button" onclick="window.miniNuvioInstance.openAddCatalogModal('${sectionId}', '${folderId}')" class="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <i class="fa-solid fa-plus"></i> Añadir Catálogo
          </button>
        </div>
      `;
      return;
    }

    const renderedCatalogs = [];

    for (let idx = 0; idx < sources.length; idx++) {
      const s = sources[idx];
      const catId = s.catalogId || s.id || '';
      const catMeta = catalogMap.get(catId) || { name: s.title || catId, type: s.type };
      const resolved = await TmdbService.resolveCatalogPreview(catId, catMeta, tmdbKey);
      
      // Respetar título personalizado o resolver nombre amigable en español latino
      const displayTitle = this.resolveCatalogTitle(s, catalogMap) || resolved.title || catMeta.name || catId;
      renderedCatalogs.push({ ...resolved, title: displayTitle, index: idx, catId });
    }

    bodyEl.innerHTML = renderedCatalogs.map(cat => {
      const idx = cat.index;
      const typeLabel = cat.mediaType === 'series' || cat.mediaType === 'tv' ? 'Series' : cat.mediaType === 'anime' ? 'Anime' : 'Películas';
      const isFirst = idx === 0;
      const isLast = idx === renderedCatalogs.length - 1;

      // Barra de controles de cada catálogo: Asa de arrastre Sortable, Reordenar (Cielo/Fondo), Renombrar y Eliminar
      const controlsBar = `
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div class="flex items-center gap-2">
            <!-- Asa de arrastre Sortable y Botones Extremos (Cielo / Fondo) -->
            <div class="flex items-center gap-1">
              <span class="catalog-drag-handle text-slate-500 hover:text-brand-400 cursor-grab p-1" title="Arrastra para reordenar este catálogo con el mouse">
                <i class="fa-solid fa-grip-vertical text-xs"></i>
              </span>
              <div class="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5 no-drag">
                <button type="button" onclick="window.miniNuvioInstance.moveCatalogExtreme('${sectionId}', '${folderId}', ${idx}, 'top')" ${isFirst ? 'disabled class="w-6 h-6 rounded flex items-center justify-center text-slate-600 cursor-not-allowed"' : 'class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-brand-300 hover:bg-slate-800 transition-colors"'} title="Mover catálogo al cielo (primera posición)">
                  <i class="fa-solid fa-angles-up text-[10px]"></i>
                </button>
                <button type="button" onclick="window.miniNuvioInstance.moveCatalogExtreme('${sectionId}', '${folderId}', ${idx}, 'bottom')" ${isLast ? 'disabled class="w-6 h-6 rounded flex items-center justify-center text-slate-600 cursor-not-allowed"' : 'class="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-brand-300 hover:bg-slate-800 transition-colors"'} title="Tirar catálogo al fondo (última posición)">
                  <i class="fa-solid fa-angles-down text-[10px]"></i>
                </button>
              </div>
            </div>
            
            <h4 class="text-xs font-bold text-white flex items-center gap-2">
              <i class="${cat.isTrakt ? 'fa-solid fa-tv text-amber-400' : 'fa-solid fa-film text-brand-400'}"></i>
              <span>${cat.title}</span>
            </h4>
          </div>

          <div class="flex items-center gap-1.5 no-drag">
            <span class="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">${typeLabel}</span>
            
            <button type="button" onclick="window.miniNuvioInstance.renameCatalogInExplorer('${sectionId}', '${folderId}', ${idx})" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors" title="Renombrar este catálogo">
              <i class="fa-solid fa-pen-to-square text-[9px] text-brand-400"></i>
              <span>Renombrar</span>
            </button>

            <button type="button" onclick="window.miniNuvioInstance.deleteCatalogInExplorer('${sectionId}', '${folderId}', ${idx})" class="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors" title="Quitar de esta colección">
              <i class="fa-solid fa-trash-can text-[9px]"></i>
              <span>Quitar</span>
            </button>
          </div>
        </div>
      `;

      // Caso 1: Catálogo que requiere sincronización de Trakt
      if (cat.isTrakt) {
        return `
          <div 
            class="catalog-explorer-row p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3"
            data-catalog-index="${idx}"
          >
            ${controlsBar}

            <!-- Alerta Sincronización Trakt -->
            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 no-drag">
              <i class="fa-solid fa-lock text-amber-400 text-xs mt-0.5 shrink-0"></i>
              <div class="text-[11px] text-amber-200/90 leading-relaxed">
                <span class="font-bold text-amber-300">(Solo disponible si sincronizas a través de AIOMetadata)</span>:
                Este catálogo conecta con tu cuenta de Trakt.tv para generar recomendaciones basadas en tu historial de reproducción personal.
              </div>
            </div>
          </div>
        `;
      }

      // Caso 2: Catálogo con pósters de TMDB en vivo
      const items = cat.items || [];
      return `
        <div 
          class="catalog-explorer-row p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3"
          data-catalog-index="${idx}"
        >
          ${controlsBar}

          <!-- Carrusel de Pósters Reales en Español Latino -->
          <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent no-drag">
            ${items.map(item => {
              const posterUrl = TmdbService.getPosterUrl(item.poster_path);
              const title = item.title || item.name || 'Título';
              const year = (item.release_date || item.first_air_date || '').split('-')[0] || '';

              return `
                <div class="w-28 sm:w-32 shrink-0 space-y-1.5 group select-none">
                  <div class="aspect-[2/3] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 shadow-md relative">
                    <img src="${posterUrl}" alt="${title}" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 pointer-events-none" loading="lazy">
                  </div>
                  <div class="text-[11px] font-semibold text-slate-200 truncate group-hover:text-white" title="${title}">
                    ${title}
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono">
                    ${year || 'Latino'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Inicializar SortableJS para reordenar los catálogos suavemente en tiempo real
    if (typeof Sortable !== 'undefined') {
      if (this.catalogSortable) {
        try { this.catalogSortable.destroy(); } catch (e) {}
      }
      this.catalogSortable = new Sortable(bodyEl, {
        handle: '.catalog-drag-handle',
        animation: 250,
        filter: 'input, button, a, .no-drag',
        preventOnFilter: false,
        ghostClass: 'catalog-sortable-ghost',
        chosenClass: 'is-chosen',
        dragClass: 'is-dragging',
        onEnd: (evt) => {
          if (evt.oldIndex !== evt.newIndex) {
            state.reorderCatalogInFolder(sectionId, folderId, evt.oldIndex, evt.newIndex);
            this.refreshCatalogExplorer(sectionId, folderId);
          }
        }
      });
    }
  }

  /**
   * Métodos para CRUD interactivo de Catálogos en el Explorador
   */
  moveCatalogInExplorer(sectionId, folderId, catalogIndex, direction) {
    const success = state.moveCatalogInFolder(sectionId, folderId, catalogIndex, direction);
    if (success) {
      this.refreshCatalogExplorer(sectionId, folderId);
    }
  }

  deleteCatalogInExplorer(sectionId, folderId, catalogIndex) {
    const sec = state.collections.find(s => s.id === sectionId);
    const folder = sec?.folders?.find(f => f.id === folderId);
    const cat = folder?.sources?.[catalogIndex];
    const catName = cat?.title || cat?.catalogId || 'este catálogo';

    if (confirm(`¿Quitar "${catName}" de esta colección?`)) {
      state.removeCatalogFromFolder(sectionId, folderId, catalogIndex);
      this.refreshCatalogExplorer(sectionId, folderId);
    }
  }

  renameCatalogInExplorer(sectionId, folderId, catalogIndex) {
    const sec = state.collections.find(s => s.id === sectionId);
    const folder = sec?.folders?.find(f => f.id === folderId);
    const source = folder?.sources?.[catalogIndex];
    if (!source) return;

    // Resolver nombre legible: 1. título personalizado previo, 2. nombre canónico amigable, 3. plantilla AIOMetadata, 4. ID
    const catId = source.catalogId || source.id || '';
    const allCatalogs = state.rawMetadataTemplate?.config?.catalogs || state.rawMetadataTemplate?.catalogs || [];
    const catalogMap = new Map();
    allCatalogs.forEach(c => { if (c.id) catalogMap.set(c.id, c); });
    const catMeta = catalogMap.get(catId);
    const currentTitle = this.resolveCatalogTitle(source, catalogMap) || source.title || catMeta?.name || catId;

    const existing = document.getElementById('renameCatalogModal');
    if (existing) existing.remove();

    const renameEl = document.createElement('div');
    renameEl.id = 'renameCatalogModal';
    renameEl.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm';
    renameEl.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl text-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-pen-to-square text-brand-400"></i>
            <span>Renombrar Catálogo</span>
          </h3>
          <button type="button" onclick="document.getElementById('renameCatalogModal').remove()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
        <div>
          <label class="block text-xs text-slate-300 mb-1 font-medium">Nombre visible en Nuvio y AIOMetadata:</label>
          <input id="renameCatalogInput" type="text" value="${currentTitle.replace(/"/g, '&quot;')}" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:border-brand-500 text-sm text-white font-medium">
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button type="button" onclick="document.getElementById('renameCatalogModal').remove()" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300">
            Cancelar
          </button>
          <button id="btnSaveCatalogRename" type="button" class="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white">
            Guardar Nombre
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(renameEl);
    const input = document.getElementById('renameCatalogInput');
    input.focus();
    input.select();

    const saveAction = () => {
      const val = input.value.trim();
      if (val) {
        state.renameCatalogInFolder(sectionId, folderId, catalogIndex, val);
        renameEl.remove();
        this.refreshCatalogExplorer(sectionId, folderId);
      }
    };

    document.getElementById('btnSaveCatalogRename').onclick = saveAction;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') saveAction();
      if (e.key === 'Escape') renameEl.remove();
    };
  }

  openAddCatalogModal(sectionId, folderId) {
    const sec = state.collections.find(s => s.id === sectionId);
    const folder = sec?.folders?.find(f => f.id === folderId);
    if (!folder) return;

    const allCatalogs = state.rawMetadataTemplate?.config?.catalogs || state.rawMetadataTemplate?.catalogs || [];
    const currentIds = new Set((folder.sources || []).map(s => s.catalogId || s.id));

    const existing = document.getElementById('addCatalogModal');
    if (existing) existing.remove();

    const addEl = document.createElement('div');
    addEl.id = 'addCatalogModal';
    addEl.className = 'fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md';
    addEl.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh] text-slate-200">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <i class="fa-solid fa-plus text-xs"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">Añadir Catálogo a "${folder.title}"</h3>
              <p class="text-[11px] text-slate-400">Selecciona un catálogo disponible de la biblioteca</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('addCatalogModal').remove()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div class="mb-3 shrink-0">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input id="searchAddCatalogInput" type="text" placeholder="Buscar por título, streaming, anime, género..." class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:outline-none focus:border-brand-500 text-xs text-white">
          </div>
        </div>

        <div id="addCatalogList" class="overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700 flex-1">
          <!-- Renderizado dinámico -->
        </div>

        <div class="pt-3 mt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button type="button" onclick="document.getElementById('addCatalogModal').remove()" class="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300">
            Cerrar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(addEl);

    const renderList = (filter = '') => {
      const listEl = document.getElementById('addCatalogList');
      if (!listEl) return;
      const lower = filter.toLowerCase().trim();

      const filtered = allCatalogs.filter(c => {
        if (!c.id) return false;
        if (lower && !(c.name || '').toLowerCase().includes(lower) && !c.id.toLowerCase().includes(lower)) {
          return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No se encontraron catálogos con "${filter}".</div>`;
        return;
      }

      listEl.innerHTML = filtered.slice(0, 80).map(cat => {
        const isAlreadyAdded = currentIds.has(cat.id);
        const typeLabel = cat.type === 'series' || cat.displayType === 'series' ? 'Series' : cat.type === 'anime' ? 'Anime' : 'Películas';
        return `
          <div class="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div class="min-w-0">
              <h4 class="text-xs font-semibold text-white truncate">${cat.name || cat.id}</h4>
              <p class="text-[10px] text-slate-400 font-mono truncate">${cat.id} • ${typeLabel}</p>
            </div>
            <div>
              ${isAlreadyAdded ? `
                <span class="text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-500 font-mono">En uso</span>
              ` : `
                <button type="button" onclick="window.miniNuvioInstance.doAddCatalog('${sectionId}', '${folderId}', '${cat.id}')" class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1">
                  <i class="fa-solid fa-plus text-[10px]"></i>
                  <span>Añadir</span>
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    };

    renderList();

    const searchInput = document.getElementById('searchAddCatalogInput');
    searchInput.oninput = (e) => renderList(e.target.value);
    searchInput.focus();
  }

  doAddCatalog(sectionId, folderId, catalogId) {
    const allCatalogs = state.rawMetadataTemplate?.config?.catalogs || state.rawMetadataTemplate?.catalogs || [];
    const cat = allCatalogs.find(c => c.id === catalogId);
    if (!cat) return;

    const res = state.addCatalogToFolder(sectionId, folderId, cat);
    if (res.success) {
      const modal = document.getElementById('addCatalogModal');
      if (modal) modal.remove();
      this.refreshCatalogExplorer(sectionId, folderId);
    } else {
      alert(res.error || 'No se pudo añadir');
    }
  }

  refreshCatalogExplorer(sectionId, folderId) {
    this.openCatalogExplorer(sectionId, folderId);
  }

  /**
   * Modal Integrado de Edición de Sección Completa
   * Permite renombrar la sección, cambiar visibilidad y reordenar/editar todas las filas que contiene.
   * Montado en document.body para centrado absoluto en el monitor.
   */
  openSectionModal(sectionId) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec) return;

    const modalContainer = this.ensureModalContainer();
    const folders = sec.folders || [];

    modalContainer.innerHTML = `
      <div id="sectionEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity">
        <div class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[88vh] text-slate-200">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
                <i class="fa-solid fa-layer-group"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Personalizar Sección</h3>
                <p class="text-[11px] text-slate-400">Edita el nombre de la sección y el orden o visibilidad de sus filas</p>
              </div>
            </div>
            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- Scrollable Content -->
          <div class="overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700 flex-1">
            
            <!-- Nombre de Sección y Toggle General -->
            <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre de la Sección en Nuvio
                </label>
                <input id="secEditTitle" type="text" value="${(sec.title || sec.id).replace(/"/g, '&quot;')}" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-brand-500 text-sm text-white font-medium">
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="text-xs text-slate-300">Mostrar esta sección en Nuvio</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input id="secEditEnabled" type="checkbox" ${sec.enabled !== false ? 'checked' : ''} class="sr-only peer">
                  <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
            </div>

            <!-- Filas / Colecciones contenidas -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Filas contenidas en esta Sección (${folders.length})
                </label>
                <span class="text-[10px] text-slate-500 font-mono">Reordena, renombra o explora pósters</span>
              </div>

              <div class="space-y-2">
                ${folders.map((f, idx) => {
                  const isFEnabled = f.enabled !== false;
                  const cover = f.coverImageUrl || f.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                  return `
                    <div class="flex items-center justify-between gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                      
                      <!-- Orden Controls: Subir, Bajar y Extremos Cielo / Fondo -->
                      <div class="flex items-center gap-0.5 shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button type="button" onclick="window.miniNuvioInstance.moveFolderInSection('${sec.id}', ${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-25 text-slate-600 cursor-not-allowed p-1"' : 'class="p-1 text-slate-400 hover:text-white transition-colors"'} title="Subir">
                          <i class="fa-solid fa-chevron-up text-[10px]"></i>
                        </button>
                        <button type="button" onclick="window.miniNuvioInstance.moveFolderInSection('${sec.id}', ${idx}, 1)" ${idx === folders.length - 1 ? 'disabled class="opacity-25 text-slate-600 cursor-not-allowed p-1"' : 'class="p-1 text-slate-400 hover:text-white transition-colors"'} title="Bajar">
                          <i class="fa-solid fa-chevron-down text-[10px]"></i>
                        </button>
                        <button type="button" onclick="window.miniNuvioInstance.moveFolderInSectionExtreme('${sec.id}', ${idx}, 'top')" ${idx === 0 ? 'disabled class="opacity-25 text-slate-600 cursor-not-allowed p-1"' : 'class="p-1 text-slate-400 hover:text-brand-300 transition-colors"'} title="Mover al cielo (primera posición)">
                          <i class="fa-solid fa-angles-up text-[10px]"></i>
                        </button>
                        <button type="button" onclick="window.miniNuvioInstance.moveFolderInSectionExtreme('${sec.id}', ${idx}, 'bottom')" ${idx === folders.length - 1 ? 'disabled class="opacity-25 text-slate-600 cursor-not-allowed p-1"' : 'class="p-1 text-slate-400 hover:text-brand-300 transition-colors"'} title="Tirar al fondo (última posición)">
                          <i class="fa-solid fa-angles-down text-[10px]"></i>
                        </button>
                      </div>

                      <!-- Mini Preview -->
                      <div class="w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-800 bg-slate-900 cursor-pointer" onclick="window.miniNuvioInstance.openCatalogExplorer('${sec.id}', '${f.id}')" title="Ver pósters de esta fila">
                        <img src="${cover}" alt="${f.title}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'">
                      </div>

                      <!-- Title Input & Shape -->
                      <div class="flex-1 min-w-0 flex items-center gap-2">
                        <input type="text" class="sec-folder-title-input w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:outline-none focus:border-brand-500 text-xs text-slate-200" data-folder-id="${f.id}" value="${(f.title || '').replace(/"/g, '&quot;')}" placeholder="Título de la fila">
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shrink-0">${f.tileShape || 'LANDSCAPE'}</span>
                      </div>

                      <!-- Actions: Explore, Details & Toggle -->
                      <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" onclick="window.miniNuvioInstance.openCatalogExplorer('${sec.id}', '${f.id}')" class="px-2 py-1 rounded bg-brand-600/20 hover:bg-brand-600/40 border border-brand-500/30 text-[11px] text-brand-300 flex items-center gap-1 transition-colors" title="Explorar catálogos y pósters reales">
                          <i class="fa-solid fa-film text-[10px]"></i>
                          <span class="hidden sm:inline">Pósters</span>
                        </button>

                        <button type="button" onclick="window.miniNuvioInstance.openEditModal('${sec.id}', '${f.id}')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white flex items-center gap-1" title="Personalizar portada, diseño y logos">
                          <i class="fa-solid fa-sliders text-[10px]"></i>
                          <span class="hidden sm:inline">Diseño</span>
                        </button>

                        <input type="checkbox" ${isFEnabled ? 'checked' : ''} onchange="window.miniNuvioInstance.toggleFolder('${sec.id}', '${f.id}')" class="w-4 h-4 rounded text-brand-600 bg-slate-950 border-slate-700 cursor-pointer ml-0.5" title="${isFEnabled ? 'Desactivar fila' : 'Activar fila'}">
                      </div>

                    </div>
                  `;
                }).join('')}
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-800 shrink-0">
            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors">
              Cancelar
            </button>
            <button type="button" onclick="window.miniNuvioInstance.saveSectionModal('${sec.id}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition-all flex items-center gap-1.5">
              <i class="fa-solid fa-check"></i>
              <span>Guardar Sección</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  moveFolderInSection(sectionId, folderIndex, direction) {
    state.moveFolder(sectionId, folderIndex, direction);
    this.openSectionModal(sectionId);
  }

  moveFolderInSectionExtreme(sectionId, folderIndex, destination) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec || !sec.folders) return;
    const targetIndex = destination === 'top' ? 0 : sec.folders.length - 1;
    state.reorderFolder(sectionId, folderIndex, targetIndex);
    this.openSectionModal(sectionId);
  }

  saveSectionModal(sectionId) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec) return;

    const titleInput = document.getElementById('secEditTitle');
    const enabledInput = document.getElementById('secEditEnabled');
    
    if (titleInput && titleInput.value.trim()) {
      sec.title = titleInput.value.trim();
    }
    if (enabledInput) {
      sec.enabled = enabledInput.checked;
    }

    // Actualizar títulos de las filas
    const inputs = document.querySelectorAll('.sec-folder-title-input');
    inputs.forEach(input => {
      const fId = input.getAttribute('data-folder-id');
      const folder = (sec.folders || []).find(f => f.id === fId);
      if (folder && input.value.trim()) {
        folder.title = input.value.trim();
      }
    });

    this.closeModal();
    state.notify('COLLECTIONS_UPDATED');
    if (window.appController) {
      window.appController.showToast('✓ Sección y filas guardadas con éxito', 'success');
    }
  }

  /**
   * Abre el modal de edición de una fila/colección individual
   * Montado en document.body para centrado absoluto en el monitor.
   */
  openEditModal(sectionId, folderId) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec) return;
    const folder = (sec.folders || []).find(f => f.id === folderId);
    if (!folder) return;

    this.editingTarget = { sectionId, folderId };
    const modalContainer = this.ensureModalContainer();

    const currentCover = folder.coverImageUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
    const currentBackdrop = folder.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200';

    modalContainer.innerHTML = `
      <div id="miniNuvioEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity">
        <div class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh] text-slate-200">
          
          <!-- Header -->
          <div class="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-sliders text-brand-500"></i>
              <span>Diseño de Fila: ${folder.title}</span>
            </h3>
            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <!-- Body Scrollable -->
          <div class="overflow-y-auto space-y-3.5 pr-1 text-xs scrollbar-thin scrollbar-thumb-slate-700 flex-1">
            
            <!-- Live Preview Mini Card -->
            <div class="relative w-full h-28 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-end p-3">
              <img id="editPreviewBackdrop" src="${currentBackdrop}" alt="Backdrop" class="absolute inset-0 w-full h-full object-cover opacity-40">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
              <div class="relative z-10 flex items-center gap-2">
                <span id="editPreviewEmoji" class="text-lg">${folder.coverEmoji || '🎬'}</span>
                <span id="editPreviewTitle" class="text-sm font-bold text-white drop-shadow">${folder.title || 'Título'}</span>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Título (Español Latino)</label>
              <input id="editTitle" type="text" value="${(folder.title || '').replace(/"/g, '&quot;')}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Emoji</label>
                <input id="editEmoji" type="text" value="${folder.coverEmoji || '🎬'}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500">
              </div>
              <div>
                <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Formato de Tarjeta</label>
                <select id="editTileShape" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-brand-500">
                  <option value="LANDSCAPE" ${folder.tileShape === 'LANDSCAPE' ? 'selected' : ''}>Horizontal (16:9 Landscape)</option>
                  <option value="POSTER" ${folder.tileShape === 'POSTER' ? 'selected' : ''}>Vertical (2:3 Poster)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Imagen de Portada (Cover URL)</label>
              <input id="editCover" type="text" value="${folder.coverImageUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-brand-500">
            </div>

            <div>
              <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Fondo Cinemático (Backdrop URL)</label>
              <input id="editBackdrop" type="text" value="${folder.heroBackdropUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-brand-500">
            </div>

            <div>
              <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Logo de Título (Logo URL opcional)</label>
              <input id="editLogo" type="text" value="${folder.titleLogoUrl || ''}" placeholder="https://..." class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-brand-500">
            </div>

          </div>

          <!-- Footer -->
          <div class="flex justify-between items-center pt-3 mt-3 border-t border-slate-800 shrink-0">
            <button type="button" onclick="window.miniNuvioInstance.openCatalogExplorer('${sectionId}', '${folderId}')" class="px-3.5 py-2 rounded-xl bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 text-xs font-medium flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-layer-group"></i>
              <span>Ver Catálogos de esta Fila</span>
            </button>

            <div class="flex gap-2">
              <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs">
                Cancelar
              </button>
              <button type="button" onclick="window.miniNuvioInstance.saveEditModal()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition-all shadow-md">
                Guardar Cambios
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Conectar eventos dinámicos para live preview
    const titleInput = document.getElementById('editTitle');
    const emojiInput = document.getElementById('editEmoji');
    const backdropInput = document.getElementById('editBackdrop');
    
    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        const p = document.getElementById('editPreviewTitle');
        if (p) p.innerText = e.target.value || 'Título';
      });
    }
    if (emojiInput) {
      emojiInput.addEventListener('input', (e) => {
        const p = document.getElementById('editPreviewEmoji');
        if (p) p.innerText = e.target.value || '🎬';
      });
    }
    if (backdropInput) {
      backdropInput.addEventListener('input', (e) => {
        const img = document.getElementById('editPreviewBackdrop');
        if (img && e.target.value.trim()) img.src = e.target.value.trim();
      });
    }
  }

  closeModal() {
    const modalContainer = document.getElementById('miniNuvioModalsContainer');
    if (modalContainer) modalContainer.innerHTML = '';
    this.editingTarget = null;
  }

  closeEditModal() {
    this.closeModal();
  }

  saveEditModal() {
    if (!this.editingTarget) return;
    const { sectionId, folderId } = this.editingTarget;

    const title = document.getElementById('editTitle').value.trim();
    const coverEmoji = document.getElementById('editEmoji').value.trim();
    const tileShape = document.getElementById('editTileShape').value;
    const coverImageUrl = document.getElementById('editCover').value.trim();
    const heroBackdropUrl = document.getElementById('editBackdrop').value.trim();
    const titleLogoUrl = document.getElementById('editLogo').value.trim();

    state.updateFolder(sectionId, folderId, {
      title,
      coverEmoji,
      tileShape,
      coverImageUrl,
      heroBackdropUrl,
      titleLogoUrl
    });

    this.closeModal();
    if (window.appController) {
      window.appController.showToast('✓ Fila actualizada con éxito', 'success');
    }
  }
}
