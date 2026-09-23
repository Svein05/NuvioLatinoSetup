/**
 * Componente: Mini NUVIO Interactivo
 * Simulador visual del Home de Nuvio con Hero Backdrop, carruseles por sección,
 * controles de reordenación, toggles y modal de personalización en Español Latino.
 */
import { state } from './state.js';

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
   * Inicializa la vista del Mini Nuvio
   */
  init() {
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
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Simulador de Home</span>
            <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              ${activeFolders}/${totalFolders} activas
            </span>
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

        <!-- Carruseles por Sección -->
        <div class="space-y-6">
          ${state.collections.map((section, sIndex) => this.renderSection(section, sIndex)).join('')}
        </div>

      </div>

      <!-- Modal de Edición de Colección -->
      <div id="miniNuvioEditModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <i class="fa-solid fa-pen-to-square text-brand-500"></i>
              <span>Personalizar Colección</span>
            </h3>
            <button onclick="window.miniNuvioInstance.closeEditModal()" class="text-slate-400 hover:text-slate-200">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <div id="miniNuvioEditModalBody" class="space-y-3 text-xs">
            <!-- Rellenado dinámicamente -->
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button onclick="window.miniNuvioInstance.closeEditModal()" class="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs">
              Cancelar
            </button>
            <button onclick="window.miniNuvioInstance.saveEditModal()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition-all shadow-md">
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    `;
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

    return `
      <div class="bg-slate-950/60 border ${isSectionEnabled ? 'border-slate-800' : 'border-slate-900 opacity-60'} rounded-2xl p-4 transition-all">
        <!-- Cabecera de la Sección -->
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="flex items-center gap-3">
            <button onclick="window.miniNuvioInstance.toggleSection('${section.id}')" class="text-slate-400 hover:text-brand-400 transition-colors" title="${isSectionEnabled ? 'Desactivar sección' : 'Activar sección'}">
              <i class="fa-solid ${isSectionEnabled ? 'fa-eye text-brand-500' : 'fa-eye-slash text-slate-600'}"></i>
            </button>
            <h3 class="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
              <span>${section.title || section.id}</span>
              <span class="text-[11px] font-mono text-slate-500 font-normal">(${activeCount}/${folders.length})</span>
            </h3>
          </div>

          <!-- Controles de Sección -->
          <div class="flex items-center gap-1.5 text-xs">
            <button onclick="window.miniNuvioInstance.moveSection(${sIndex}, -1)" ${sIndex === 0 ? 'disabled class="opacity-30 cursor-not-allowed"' : 'class="hover:text-slate-200 text-slate-400"'} title="Mover sección arriba">
              <i class="fa-solid fa-arrow-up px-1.5 py-1"></i>
            </button>
            <button onclick="window.miniNuvioInstance.moveSection(${sIndex}, 1)" ${sIndex === state.collections.length - 1 ? 'disabled class="opacity-30 cursor-not-allowed"' : 'class="hover:text-slate-200 text-slate-400"'} title="Mover sección abajo">
              <i class="fa-solid fa-arrow-down px-1.5 py-1"></i>
            </button>
            <button onclick="window.miniNuvioInstance.renameSection('${section.id}', '${(section.title || '').replace(/'/g, "\\'")}')" class="hover:text-brand-400 text-slate-400 ml-1" title="Renombrar sección">
              <i class="fa-solid fa-pen text-[11px] px-1 py-1"></i>
            </button>
          </div>
        </div>

        <!-- Carrusel Horizontal de Tarjetas (Rail) -->
        <div class="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
    
    // Dimensiones según tileShape
    const sizeClasses = isLandscape 
      ? 'w-48 sm:w-56 shrink-0 aspect-video' 
      : 'w-32 sm:w-36 shrink-0 aspect-[2/3]';

    const imageSrc = folder.coverImageUrl || folder.focusGifUrl || folder.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';

    return `
      <div 
        class="group relative ${sizeClasses} rounded-xl overflow-hidden border ${isFocused ? 'border-brand-500 ring-2 ring-brand-500/30' : isEnabled ? 'border-slate-800 hover:border-slate-700' : 'border-slate-900 opacity-40'} bg-slate-900 cursor-pointer select-none transition-all duration-200"
        onmouseenter="window.miniNuvioInstance.focusFolder('${section.id}', '${folder.id}')"
        onclick="window.miniNuvioInstance.focusFolder('${section.id}', '${folder.id}')"
      >
        <!-- Imagen de Portada -->
        <img src="${imageSrc}" alt="${folder.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

        <!-- Checkbox de Activación (Esquina Superior Derecha) -->
        <div class="absolute top-2 right-2 z-20" onclick="event.stopPropagation()">
          <input 
            type="checkbox" 
            ${isEnabled ? 'checked' : ''} 
            onchange="window.miniNuvioInstance.toggleFolder('${section.id}', '${folder.id}')"
            class="w-4 h-4 rounded text-brand-600 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer shadow"
          >
        </div>

        <!-- Indicador de Emoji y Título en el Pie de Tarjeta -->
        <div class="absolute bottom-2 left-2 right-2 z-10">
          <div class="text-xs font-semibold text-white drop-shadow truncate flex items-center gap-1.5">
            <span>${folder.coverEmoji || '🎬'}</span>
            <span class="truncate">${folder.title}</span>
          </div>
        </div>

        <!-- Overlay con Acciones Rápidas (Visible en Hover) -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 z-30 transition-opacity" onclick="event.stopPropagation()">
          <button onclick="window.miniNuvioInstance.moveFolder('${section.id}', ${fIndex}, -1)" ${fIndex === 0 ? 'disabled class="opacity-30"' : 'class="hover:text-white"'} title="Mover izquierda">
            <i class="fa-solid fa-chevron-left text-xs bg-slate-800 p-1.5 rounded-lg"></i>
          </button>
          
          <button onclick="window.miniNuvioInstance.openEditModal('${section.id}', '${folder.id}')" class="bg-brand-600 hover:bg-brand-500 text-white p-1.5 rounded-lg shadow" title="Editar detalles">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>

          <button onclick="window.miniNuvioInstance.moveFolder('${section.id}', ${fIndex}, 1)" ${fIndex === section.folders.length - 1 ? 'disabled class="opacity-30"' : 'class="hover:text-white"'} title="Mover derecha">
            <i class="fa-solid fa-chevron-right text-xs bg-slate-800 p-1.5 rounded-lg"></i>
          </button>
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

  resetDefaults() {
    if (confirm('¿Deseas restaurar todas las colecciones a los valores originales de la plantilla?')) {
      state.resetCollections();
      this.focusedFolder = null;
    }
  }

  renameSection(sectionId, currentTitle) {
    const newTitle = prompt('Nuevo nombre para la sección:', currentTitle);
    if (newTitle && newTitle.trim()) {
      const sec = state.collections.find(s => s.id === sectionId);
      if (sec) {
        sec.title = newTitle.trim();
        state.notify('COLLECTIONS_UPDATED');
      }
    }
  }

  /**
   * Abre el modal de edición de una colección
   */
  openEditModal(sectionId, folderId) {
    const sec = state.collections.find(s => s.id === sectionId);
    if (!sec) return;
    const folder = (sec.folders || []).find(f => f.id === folderId);
    if (!folder) return;

    this.editingTarget = { sectionId, folderId };
    const modal = document.getElementById('miniNuvioEditModal');
    const body = document.getElementById('miniNuvioEditModalBody');

    body.innerHTML = `
      <div>
        <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Título (Español Latino)</label>
        <input id="editTitle" type="text" value="${folder.title || ''}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Emoji</label>
          <input id="editEmoji" type="text" value="${folder.coverEmoji || '🎬'}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
        </div>
        <div>
          <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Formato de Tarjeta</label>
          <select id="editTileShape" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
            <option value="LANDSCAPE" ${folder.tileShape === 'LANDSCAPE' ? 'selected' : ''}>Horizontal (16:9 Landscape)</option>
            <option value="POSTER" ${folder.tileShape === 'POSTER' ? 'selected' : ''}>Vertical (2:3 Poster)</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Imagen de Portada (Cover URL)</label>
        <input id="editCover" type="text" value="${folder.coverImageUrl || ''}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]">
      </div>

      <div>
        <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Fondo Cinemático (Backdrop URL)</label>
        <input id="editBackdrop" type="text" value="${folder.heroBackdropUrl || ''}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]">
      </div>

      <div>
        <label class="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">Logo de Título (Logo URL opcional)</label>
        <input id="editLogo" type="text" value="${folder.titleLogoUrl || ''}" class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]">
      </div>
    `;

    modal.classList.remove('hidden');
  }

  closeEditModal() {
    const modal = document.getElementById('miniNuvioEditModal');
    if (modal) modal.classList.add('hidden');
    this.editingTarget = null;
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

    this.closeEditModal();
  }
}
