import { renderCollectionsView } from './collections-view.js';
import { bindCollectionActions } from './actions.js';
import { bindCollectionMedia } from './media-events.js';
import { renderHeroBanner } from './hero-banner.js';
import { renderCatalogExplorerModal } from './catalog-explorer-modal.js';
import { openRenameCatalogModal } from './rename-catalog-modal.js';
import { openAddCatalogModalView } from './add-catalog-modal.js';
import { openSectionModalView } from './section-modal.js';
import { openFolderModalView, readFolderModalData } from './folder-modal.js';
import { initSectionsSortable, initFolderRailsSortables, destroySortables } from './sortables.js';

export class MiniNuvioCore {
  constructor(containerId, { state, notify = () => {} } = {}) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.state = state;
    this.notify = notify;
    this.cleanups = [];
    this.focusedFolder = null;
    this.focusedSectionId = null;
    this.editingTarget = null;
    this.sectionsSortable = null;
    this.folderSortables = [];
    this.catalogSortable = null;

    if (this.state?.subscribe) {
      this.cleanups.push(this.state.subscribe((_, eventType) => {
        if (['COLLECTIONS_UPDATED', 'TEMPLATES_LOADED'].includes(eventType)) {
          this.render();
        }
      }));
    }
  }

  ensureModalContainer() {
    let container = document.getElementById('miniNuvioModalsContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'miniNuvioModalsContainer';
      document.body.appendChild(container);
    }
    return container;
  }

  init() {
    this.cleanups.push(bindCollectionActions(document.body, this));
    this.cleanups.push(bindCollectionMedia(document.body, this));
    this.ensureModalContainer();
    this.render();
  }

  resolveFocus() {
    const collections = this.state?.collections || [];
    if (this.focusedFolder) {
      this.focusedFolder = collections.find(s => s.id === this.focusedSectionId)
        ?.folders?.find(f => f.id === this.focusedFolder.id) || null;
    }
    if (!this.focusedFolder) {
      for (const sec of collections) {
        if (sec.folders && sec.folders.length > 0) {
          this.focusedFolder = sec.folders[0];
          this.focusedSectionId = sec.id;
          break;
        }
      }
    }
  }

  render() {
    if (!this.container) return;
    this.resolveFocus();
    this.container.innerHTML = renderCollectionsView(this.state?.collections || [], this.focusedFolder);
    this.initSortables();
  }

  initSortables() {
    destroySortables([this.sectionsSortable, ...this.folderSortables]);
    this.sectionsSortable = initSectionsSortable({
      sectionsEl: document.getElementById('miniNuvioSectionsList'),
      onReorder: (oldIdx, newIdx) => this.state?.reorderSection(oldIdx, newIdx),
    });
    this.folderSortables = initFolderRailsSortables({
      collections: this.state?.collections || [],
      onReorder: (secId, oldIdx, newIdx) => this.state?.reorderFolder(secId, oldIdx, newIdx),
    });
  }

  focusFolder(sectionId, folderId) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    const folder = (sec?.folders || []).find(f => f.id === folderId);
    if (!folder) return;
    this.focusedFolder = folder;
    this.focusedSectionId = sectionId;
    const heroEl = document.getElementById('miniNuvioHeroBanner');
    if (heroEl) {
      heroEl.outerHTML = renderHeroBanner(this.focusedFolder);
    } else {
      this.render();
    }
  }

  toggleFolder(sectionId, folderId) { this.state?.toggleFolder(sectionId, folderId); }
  toggleSection(sectionId) { this.state?.toggleSection(sectionId); }
  toggleAll(enable) { this.state?.toggleAllCollections(enable); }
  moveFolder(sectionId, fIndex, dir) { this.state?.moveFolder(sectionId, fIndex, dir); }
  moveSection(sIndex, dir) { this.state?.moveSection(sIndex, dir); }
  moveSectionExtreme(sIndex, dest) { this.state?.moveSectionExtreme(sIndex, dest); }

  onSectionHeaderHover(sectionId, isHovered) {
    const el = document.getElementById(`sectionContainer_${sectionId}`);
    if (el) el.classList.toggle('header-hovered', isHovered);
  }

  resetDefaults() {
    if (confirm('¿Deseas restaurar todas las colecciones a los valores originales de la plantilla?')) {
      this.state?.resetCollections();
      this.focusedFolder = null;
    }
  }

  renameSection(sectionId) { this.openSectionModal(sectionId); }

  openCatalogExplorer(sectionId, folderId) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    const folder = (sec?.folders || []).find(f => f.id === folderId);
    if (!folder) return;
    this.focusFolder(sectionId, folderId);
    const modalContainer = this.ensureModalContainer();
    const sources = folder.sources || folder.catalogSources || [];
    const allCatalogs = this.state?.rawMetadataTemplate?.config?.catalogs || this.state?.rawMetadataTemplate?.catalogs || [];
    const catalogMap = new Map();
    allCatalogs.forEach(c => { if (c.id) catalogMap.set(c.id, c); });
    modalContainer.innerHTML = renderCatalogExplorerModal({ section: sec, folder, sources, catalogMap });
  }

  moveCatalog(sectionId, folderId, catIdx, dir) {
    if (this.state?.moveCatalogInFolder(sectionId, folderId, catIdx, dir)) {
      this.openCatalogExplorer(sectionId, folderId);
    }
  }

  moveCatalogExtreme(sectionId, folderId, catIdx, dest) {
    if (this.state?.moveCatalogExtreme(sectionId, folderId, catIdx, dest)) {
      this.openCatalogExplorer(sectionId, folderId);
    }
  }

  moveCatalogInExplorer(secId, fId, idx, dir) { this.moveCatalog(secId, fId, idx, dir); }

  deleteCatalogInExplorer(sectionId, folderId, catalogIndex) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    const folder = sec?.folders?.find(f => f.id === folderId);
    const cat = folder?.sources?.[catalogIndex];
    const catName = cat?.title || cat?.catalogId || 'este catálogo';
    if (confirm(`¿Quitar "${catName}" de esta colección?`)) {
      this.state?.removeCatalogFromFolder(sectionId, folderId, catalogIndex);
      this.openCatalogExplorer(sectionId, folderId);
    }
  }

  renameCatalogInExplorer(sectionId, folderId, catalogIndex) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    const folder = sec?.folders?.find(f => f.id === folderId);
    const source = folder?.sources?.[catalogIndex];
    if (!source) return;
    const catId = source.catalogId || source.id || '';
    const allCatalogs = this.state?.rawMetadataTemplate?.config?.catalogs || this.state?.rawMetadataTemplate?.catalogs || [];
    const catalogMap = new Map();
    allCatalogs.forEach(c => { if (c.id) catalogMap.set(c.id, c); });
    const currentTitle = source.title || catalogMap.get(catId)?.name || catId;
    openRenameCatalogModal({
      currentTitle,
      onSave: (val) => {
        this.state?.renameCatalogInFolder(sectionId, folderId, catalogIndex, val);
        this.openCatalogExplorer(sectionId, folderId);
      },
    });
  }

  openAddCatalogModal(sectionId, folderId) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    const folder = sec?.folders?.find(f => f.id === folderId);
    if (!folder) return;
    const allCatalogs = this.state?.rawMetadataTemplate?.config?.catalogs || this.state?.rawMetadataTemplate?.catalogs || [];
    const currentIds = new Set((folder.sources || []).map(s => s.catalogId || s.id));
    openAddCatalogModalView({
      sectionId,
      folderId,
      folderTitle: folder.title,
      allCatalogs,
      currentIds,
    });
  }

  doAddCatalog(sectionId, folderId, catalogId) {
    const allCatalogs = this.state?.rawMetadataTemplate?.config?.catalogs || this.state?.rawMetadataTemplate?.catalogs || [];
    const cat = allCatalogs.find(c => c.id === catalogId);
    if (!cat) return;
    const res = this.state?.addCatalogToFolder(sectionId, folderId, cat);
    if (res?.success) {
      document.getElementById('addCatalogModal')?.remove();
      this.openCatalogExplorer(sectionId, folderId);
    } else {
      alert(res?.error || 'No se pudo añadir');
    }
  }

  openSectionModal(sectionId) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    if (!sec) return;
    openSectionModalView({ section: sec, modalContainer: this.ensureModalContainer() });
  }

  moveFolderInSection(sectionId, folderIndex, direction) {
    this.state?.moveFolder(sectionId, folderIndex, direction);
    this.openSectionModal(sectionId);
  }

  moveFolderInSectionExtreme(sectionId, folderIndex, destination) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    if (!sec?.folders) return;
    const targetIndex = destination === 'top' ? 0 : sec.folders.length - 1;
    this.state?.reorderFolder(sectionId, folderIndex, targetIndex);
    this.openSectionModal(sectionId);
  }

  saveSectionModal(sectionId) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    if (!sec) return;
    const titleInput = document.getElementById('secEditTitle');
    const enabledInput = document.getElementById('secEditEnabled');
    const titles = new Map([...document.querySelectorAll('.sec-folder-title-input')]
      .map(input => [input.getAttribute('data-folder-id'), input.value.trim()]));
    this.state?.updateSection(sectionId, {
      title: titleInput?.value.trim() || sec.title,
      enabled: enabledInput ? enabledInput.checked : sec.enabled,
      folders: sec.folders.map(folder => ({ ...folder, title: titles.get(folder.id) || folder.title })),
    });
    this.closeModal();
    this.notify('✓ Sección y filas guardadas con éxito', 'success');
  }

  openEditModal(sectionId, folderId) {
    const sec = this.state?.collections?.find(s => s.id === sectionId);
    const folder = (sec?.folders || []).find(f => f.id === folderId);
    if (!folder) return;
    this.editingTarget = { sectionId, folderId };
    openFolderModalView({ sectionId, folder, modalContainer: this.ensureModalContainer() });
  }

  closeModal() {
    const modalContainer = document.getElementById('miniNuvioModalsContainer');
    if (modalContainer) modalContainer.innerHTML = '';
    this.editingTarget = null;
  }

  closeEditModal() { this.closeModal(); }

  dispose() {
    this.cleanups.forEach(cleanup => cleanup?.());
    this.cleanups = [];
    destroySortables([this.sectionsSortable, ...this.folderSortables, this.catalogSortable]);
    this.closeModal();
    document.getElementById('addCatalogModal')?.remove();
    document.getElementById('renameCatalogModal')?.remove();
  }

  saveEditModal() {
    if (!this.editingTarget) return;
    const { sectionId, folderId } = this.editingTarget;
    const data = readFolderModalData(document);
    this.state?.updateFolder(sectionId, folderId, data);
    this.closeModal();
    this.notify('✓ Fila actualizada con éxito', 'success');
  }
}
