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
            <h3 onclick="window.miniNuvioInstance.openSectionModal('${section.id}')" class="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2 cursor-pointer hover:text-white transition-colors" title="Haz click para personalizar esta sección">
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
            <button onclick="window.miniNuvioInstance.openSectionModal('${section.id}')" class="hover:text-brand-300 text-slate-300 ml-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1 transition-all" title="Personalizar y editar filas de la sección">
              <i class="fa-solid fa-sliders text-[11px] text-brand-400"></i>
              <span class="text-[11px] font-medium hidden sm:inline">Personalizar</span>
            </button>
          </div>
        </div>

        <!-- Carrusel Horizontal de Tarjetas (Rail con items-start para evitar deformaciones) -->
        <div class="flex gap-3 overflow-x-auto items-start pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
          
          <button onclick="window.miniNuvioInstance.openEditModal('${section.id}', '${folder.id}')" class="bg-brand-600 hover:bg-brand-500 text-white p-1.5 rounded-lg shadow" title="Editar detalles de la fila">
            <i class="fa-solid fa-sliders text-xs"></i>
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

  /**
   * Alias para abrir el modal integrado de edición de sección (sin usar prompt)
   */
  renameSection(sectionId) {
    this.openSectionModal(sectionId);
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
                <span class="text-[10px] text-slate-500 font-mono">Reordena o renombra libremente</span>
              </div>

              <div class="space-y-2">
                ${folders.map((f, idx) => {
                  const isFEnabled = f.enabled !== false;
                  const cover = f.coverImageUrl || f.heroBackdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                  return `
                    <div class="flex items-center justify-between gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                      
                      <!-- Orden Controls -->
                      <div class="flex flex-col gap-0.5 shrink-0">
                        <button type="button" onclick="window.miniNuvioInstance.moveFolderInSection('${sec.id}', ${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-25 text-slate-600 cursor-not-allowed"' : 'class="text-slate-400 hover:text-white"'} title="Subir">
                          <i class="fa-solid fa-chevron-up text-[10px]"></i>
                        </button>
                        <button type="button" onclick="window.miniNuvioInstance.moveFolderInSection('${sec.id}', ${idx}, 1)" ${idx === folders.length - 1 ? 'disabled class="opacity-25 text-slate-600 cursor-not-allowed"' : 'class="text-slate-400 hover:text-white"'} title="Bajar">
                          <i class="fa-solid fa-chevron-down text-[10px]"></i>
                        </button>
                      </div>

                      <!-- Mini Preview -->
                      <div class="w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-800 bg-slate-900">
                        <img src="${cover}" alt="${f.title}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'">
                      </div>

                      <!-- Title Input & Shape -->
                      <div class="flex-1 min-w-0 flex items-center gap-2">
                        <input type="text" class="sec-folder-title-input w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:outline-none focus:border-brand-500 text-xs text-slate-200" data-folder-id="${f.id}" value="${(f.title || '').replace(/"/g, '&quot;')}" placeholder="Título de la fila">
                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono shrink-0">${f.tileShape || 'LANDSCAPE'}</span>
                      </div>

                      <!-- Actions: Details & Toggle -->
                      <div class="flex items-center gap-2 shrink-0">
                        <button type="button" onclick="window.miniNuvioInstance.openEditModal('${sec.id}', '${f.id}')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1" title="Personalizar portada, póster y logos">
                          <i class="fa-solid fa-sliders text-[10px]"></i>
                          <span class="hidden sm:inline">Detalles</span>
                        </button>

                        <input type="checkbox" ${isFEnabled ? 'checked' : ''} onchange="window.miniNuvioInstance.toggleFolder('${sec.id}', '${f.id}')" class="w-4 h-4 rounded text-brand-600 bg-slate-950 border-slate-700 cursor-pointer" title="${isFEnabled ? 'Desactivar fila' : 'Activar fila'}">
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
              <span>Personalizar Fila: ${folder.title}</span>
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
          <div class="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-800 shrink-0">
            <button type="button" onclick="window.miniNuvioInstance.closeModal()" class="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs">
              Cancelar
            </button>
            <button type="button" onclick="window.miniNuvioInstance.saveEditModal()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition-all shadow-md">
              Guardar Cambios
            </button>
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
