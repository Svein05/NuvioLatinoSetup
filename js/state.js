import { prepareMetadataPayload } from '../src/workflows/prepare-metadata-payload.js';
import { selectedCollections, flattenedCollections } from '../src/features/collections/index.js';
/**
 * Gestión de Estado Reactivo y Sincronización Dinámica
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { CONFIG } from './config.js';

import { isAioMetadataAddon as identifyMetadata, isAioStreamsAddon, isSameManifest } from '../src/features/addons/index.js';
export { isAioStreamsAddon };

export function isAioMetadataAddon(addon) {
  return identifyMetadata(addon, CONFIG.AIOMETADATA_INSTANCES);
}

class WizardState {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 7;
    this.maxUnlockedStep = 1; // Control restrictivo de avance de pasos

    // Preferencias de Perfil y Motor de Pósters (Paso 5)
    this.preferences = {
      tmdbEnrichment: true,
      mdblistRatings: true,
      posterEngine: 'default', // 'default' | 'betterposter' | 'postersplus'
      customPosterUrl: '',
      badgesEnabled: false,
      selectedBadgePack: 'tinted',
      activeBadgeModules: ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'],
      badgeModulesOrder: ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms']
    };

    // Gestor de Addons de Perfil (Paso 6)
    this.profileAddons = []; // Lista de addons secundarios (streaming, catálogos, debrids)
    this.deletedAddonIds = new Set(); // IDs de addons a remover de Nuvio
    this.existingAioAddon = null; // Addon de AIOMetadata previo detectado en la cuenta
    this.hasLoadedAddonsForProfile = null; // ID del perfil para el que se descargaron los addons
    this.isLoadingAddons = false;

    // Autenticación Nuvio (Supabase)
    this.nuvioAuth = {
      email: '',
      password: '',
      accessToken: null,
      userId: null,
      apikey: CONFIG.NUVIO_PUBLIC_ANON_KEY,
      isAuthenticated: false
    };

    // Perfiles
    this.profiles = [];
    this.selectedProfileId = null;
    this.selectedProfileName = '';
    this.newlyCreatedProfileIds = new Set();

    // Credenciales de Proveedores de Metadatos
    this.apiKeys = {
      tmdb: '',
      tvdb: '',
      mdblist: '',
      rpdb: 't0-free-rpdb',
      topPoster: '',
      publicmetadb: '',
      gemini: '',
      openrouter: ''
    };
    this.searchAiEnabled = false;
    this.apiKeysValidated = false;
    this.apiKeysValidationStatus = {};
    this.isManualMode = false;
    this.manualCopiedCollections = false;
    this.manualCopiedAio = false;

    // Plantillas en memoria
    this.rawMetadataTemplate = null;
    this.originalCollectionsTemplate = null;
    this.collections = []; // Secciones y carpetas editables

    // Configuración AIOMetadata
    this.aiometadata = {
      instanceUrl: CONFIG.DEFAULT_AIOMETADATA_URL,
      password: ''
    };

    // Configuración AIOStreams
    this.aiostreams = {
      installed: false,
      debrids: {},
      validatedKeys: {},
      manifestUrl: null
    };
    this.rawAioStreamsTemplate = null;

    // Configuración de Ejecución (Siempre Real en producción)
    this.execution = {
      mode: 'real',
      isRunning: false,
      isCompleted: false,
      logs: [],
      result: null
    };

    // Suscriptores para reactividad de UI
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(changeType = 'GENERAL') {
    this.subscribers.forEach(cb => cb(this, changeType));
  }

  isProfileNew(profileId) {
    if (!profileId || this.isManualMode) return false;
    return this.newlyCreatedProfileIds.has(String(profileId));
  }

  enableManualMode() {
    this.isManualMode = true;
    this.selectedProfileId = 'manual-profile';
    this.selectedProfileName = 'Perfil Manual';
    this.manualCopiedCollections = false;
    this.manualCopiedAio = false;
    this.unlockStep(3);
    this.currentStep = 3;
    this.notify('MANUAL_MODE_ENABLED');
  }

  /**
   * Valida si un paso cumple con los requisitos obligatorios para poder avanzar
   * @param {number} stepNumber
   * @returns {{ valid: boolean, error: string | null }}
   */
  validateStep(stepNumber) {
    switch (stepNumber) {
      case 1:
        if (!this.isManualMode && (!this.nuvioAuth.isAuthenticated || !this.nuvioAuth.accessToken)) {
          return {
            valid: false,
            error: 'Debes iniciar sesión con tu cuenta de Nuvio (o pulsar "Continuar sin cuenta") para continuar al siguiente paso.'
          };
        }
        return { valid: true, error: null };

      case 2:
        if (!this.isManualMode && !this.selectedProfileId) {
          return {
            valid: false,
            error: 'Debes seleccionar un perfil de destino para continuar.'
          };
        }
        return { valid: true, error: null };

      case 3: {
        let activeCount = 0;
        this.collections.forEach(sec => {
          if (sec.enabled !== false) {
            (sec.folders || []).forEach(f => {
              if (f.enabled !== false) activeCount++;
            });
          }
        });
        if (activeCount === 0) {
          return {
            valid: false,
            error: 'Debes tener activada al menos una colección en el NUVIO.'
          };
        }
        return { valid: true, error: null };
      }

      case 4:
        if (!this.apiKeys.tmdb || this.apiKeys.tmdb.trim().length < 8) {
          return {
            valid: false,
            error: 'La TMDB API Key es obligatoria (mínimo 8 caracteres).'
          };
        }
        if (!this.apiKeys.mdblist || this.apiKeys.mdblist.trim().length < 8) {
          return {
            valid: false,
            error: 'La MDBList API Key es obligatoria (mínimo 8 caracteres) para calificaciones y personalización de pósters.'
          };
        }
        if (this.searchAiEnabled && !this.apiKeys.gemini && !this.apiKeys.openrouter) {
          return {
            valid: false,
            error: 'Activaste la búsqueda con IA: debes ingresar al menos una clave (Google Gemini u OpenRouter).'
          };
        }
        if (!this.apiKeysValidated) {
          return {
            valid: false,
            error: 'Debes verificar tus claves pulsando el botón "Probar Claves API" antes de continuar al siguiente paso.'
          };
        }
        return { valid: true, error: null };

      case 5:
        // Preferencias de perfil y sistema de pósters siempre cuentan con una opción seleccionada
        return { valid: true, error: null };

      case 6:
        // Gestor de Addons de Perfil: siempre válido, AIOMetadata queda anclado en #1
        return { valid: true, error: null };

      case 7:
        if (!this.aiometadata.password || this.aiometadata.password.trim().length < 6) {
          return {
            valid: false,
            error: 'Debes definir una contraseña de al menos 6 caracteres para tus addons de AIOMetadata y AIOStreams (o pulsar "Generar aleatoria").'
          };
        }
        return { valid: true, error: null };

      default:
        return { valid: true, error: null };
    }
  }

  /**
   * Carga y normaliza los addons recuperados de un perfil de Nuvio.
   * Filtra exhaustivamente TODOS los addons de AIOMetadata para que nunca
   * aparezcan duplicados en la lista de addons secundarios (#2, #3, etc.).
   */
  setProfileAddons(addons, profileId) {
    this.hasLoadedAddonsForProfile = profileId;
    this.deletedAddonIds.clear();

    const rawList = Array.isArray(addons) ? [...addons] : [];
    
    const aioMatches = [];
    const secondaryList = [];

    // Separar estrictamente AIOMetadata de los addons secundarios
    for (const item of rawList) {
      if (isAioMetadataAddon(item)) {
        aioMatches.push(item);
      } else {
        secondaryList.push(item);
      }
    }

    if (aioMatches.length > 0) {
      // El primer AIOMetadata se asocia como el addon principal preexistente a actualizar
      this.existingAioAddon = aioMatches[0];
      // Si el perfil contenía múltiples AIOMetadata duplicados en Nuvio, marcar los demás para eliminarlos
      for (let i = 1; i < aioMatches.length; i++) {
        const extra = aioMatches[i];
        if (extra && extra.id) {
          this.deletedAddonIds.add(extra.id);
        }
      }
    } else {
      this.existingAioAddon = null;
    }

    // Los addons restantes (únicamente secundarios legítimos) se ordenan comenzando en sort_order: 2.
    // Los addons preexistentes se tratan como externos estándar (sin debrids ni privilegios de nuestro template).
    this.profileAddons = secondaryList.map((a, idx) => ({
      id: a.id || null,
      name: a.name || `Addon ${idx + 2}`,
      url: a.url || a.manifest_url || '',
      manifest_url: a.manifest_url || a.url || '',
      logo: a.logo || a.icon || (a.raw && (a.raw.logo || a.raw.icon)) || null,
      enabled: a.enabled !== false,
      sort_order: idx + 2,
      isAioStreams: false,
      isPreexistingAioStreams: isAioStreamsAddon(a),
      raw: a
    }));

    this.notify('ADDONS_UPDATED');
  }

  /**
   * Comprueba si el perfil actual ya cuenta con alguna instancia de AIOStreams
   * (sea preexistente externa o agregada en la sesión actual).
   */
  hasAioStreamsInstance() {
    return this.profileAddons.some(a => Boolean(a.isAioStreams || a.isPreexistingAioStreams || isAioStreamsAddon(a)));
  }

  /**
   * Retorna el índice de la instancia de AIOStreams si existe en profileAddons (-1 si no existe)
   */
  getAioStreamsIndex() {
    return this.profileAddons.findIndex(a => Boolean(a.isAioStreams || a.isPreexistingAioStreams || isAioStreamsAddon(a)));
  }

  /**
   * Comprueba si una URL de manifiesto ya se encuentra en la lista de addons
   */
  hasAddonManifest(manifestUrl) {
    return this.profileAddons.some(addon => isSameManifest(addon.manifest_url || addon.url, manifestUrl));
  }

  /**
   * Mueve un addon relativo (▲ -1 para subir prioridad, ▼ +1 para bajar)
   */
  moveAddon(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.profileAddons.length) return false;

    const [moved] = this.profileAddons.splice(index, 1);
    this.profileAddons.splice(targetIndex, 0, moved);

    // Reindexar sort_order (AIOMetadata siempre ocupa la posición 1)
    this.profileAddons.forEach((a, idx) => {
      a.sort_order = idx + 2;
    });

    this.notify('ADDONS_UPDATED');
    return true;
  }

  /**
   * Remueve un addon de la lista y lo marca para eliminación en Nuvio
   */
  removeAddon(index) {
    if (index < 0 || index >= this.profileAddons.length) return false;

    const [removed] = this.profileAddons.splice(index, 1);
    if (removed && removed.id) {
      this.deletedAddonIds.add(removed.id);
    }
    if (removed && removed.isAioStreams) {
      this.aiostreams.installed = false;
      this.aiostreams.debrids = {};
      this.aiostreams.validatedKeys = {};
      this.aiostreams.manifestUrl = null;
    }

    // Reindexar restantes
    this.profileAddons.forEach((a, idx) => {
      a.sort_order = idx + 2;
    });

    this.notify('ADDONS_UPDATED');
    return true;
  }

  /**
   * Configura o actualiza AIOStreams en la lista de addons del perfil
   */
  setAioStreamsConfig(debridsMap = {}, validatedKeysMap = {}) {
    this.aiostreams.installed = true;
    this.aiostreams.debrids = { ...debridsMap };
    this.aiostreams.validatedKeys = { ...validatedKeysMap };

    // Buscar si ya existe en profileAddons
    const existingIndex = this.profileAddons.findIndex(a => a.isAioStreams);
    if (existingIndex !== -1) {
      this.profileAddons[existingIndex].debrids = { ...debridsMap };
    } else {
      // Agregar al final de los addons secundarios
      const aioStreamsAddon = {
        id: null,
        name: 'AIOStreams',
        url: null,
        manifest_url: null,
        logo: 'https://numb3rs.stream/assets/images/aiostreams.svg',
        enabled: true,
        sort_order: this.profileAddons.length + 2,
        isAioStreams: true,
        isPendingManifest: true,
        debrids: { ...debridsMap },
        description: 'Addon de streaming unificado con priorización full latino (Debrids configurados).'
      };
      this.profileAddons.push(aioStreamsAddon);
    }

    this.notify('ADDONS_UPDATED');
    return true;
  }

  /**
   * Elimina AIOStreams del perfil y del estado
   */
  removeAioStreams() {
    this.aiostreams.installed = false;
    this.aiostreams.debrids = {};
    this.aiostreams.validatedKeys = {};
    this.aiostreams.manifestUrl = null;

    const idx = this.profileAddons.findIndex(a => a.isAioStreams);
    if (idx !== -1) {
      this.removeAddon(idx);
    } else {
      this.notify('ADDONS_UPDATED');
    }
  }

  getAioStreamsDebrids() {
    return this.aiostreams.debrids || {};
  }

  /**
   * Agrega un nuevo addon mediante manifest URL
   */
  addCustomAddon(manifestUrl, name = '', logo = '') {
    const cleanUrl = String(manifestUrl || '').trim();
    if (!cleanUrl) return false;

    // AIOMetadata es exclusivo de la posición #1 anclada y nunca puede agregarse como secundario
    if (isAioMetadataAddon({ url: cleanUrl, name })) {
      return false;
    }

    if (this.hasAddonManifest(cleanUrl)) {
      return false;
    }

    const newAddon = {
      id: null,
      name: (name || '').trim() || 'Nuevo Addon',
      url: cleanUrl,
      manifest_url: cleanUrl,
      logo: (logo || '').trim() || null,
      enabled: true,
      sort_order: this.profileAddons.length + 2,
      isCustomAdded: true
    };

    this.profileAddons.push(newAddon);
    this.notify('ADDONS_UPDATED');
    return true;
  }

  unlockStep(stepNumber) {
    if (stepNumber > this.maxUnlockedStep) {
      this.maxUnlockedStep = Math.min(stepNumber, this.totalSteps);
      this.notify('STEP_UNLOCKED');
    }
  }

  /**
   * Carga las plantillas base desde /templates
   */
  async loadTemplates() {
    try {
      const cacheBuster = `?v=${Date.now()}`;
      const [metaRes, colRes, aioRes] = await Promise.all([
        fetch(`${CONFIG.TEMPLATES.METADATA_LATINO}${cacheBuster}`, { cache: 'no-store' }),
        fetch(`${CONFIG.TEMPLATES.NUVIO_COLLECTIONS}${cacheBuster}`, { cache: 'no-store' }),
        fetch(`${CONFIG.TEMPLATES.AIOSTREAMS}${cacheBuster}`, { cache: 'no-store' }).catch(() => null)
      ]);

      if (!metaRes.ok || !colRes.ok) {
        throw new Error('Error al leer los archivos de plantillas locales.');
      }

      this.rawMetadataTemplate = await metaRes.json();
      if (aioRes && aioRes.ok) {
        this.rawAioStreamsTemplate = await aioRes.json().catch(() => null);
      }
      const collectionsData = await colRes.json();

      // Clonar para permitir reset
      this.originalCollectionsTemplate = JSON.parse(JSON.stringify(collectionsData));
      
      // Inicializar cada carpeta con propiedad `enabled: true` si no viene definida
      this.collections = collectionsData.map(section => ({
        ...section,
        pinToTop: section.pinToTop !== undefined ? section.pinToTop : true,
        enabled: section.enabled !== false,
        folders: (section.folders || []).map(folder => ({
          ...folder,
          enabled: folder.enabled !== false
        }))
      }));

      this.notify('TEMPLATES_LOADED');
      return true;
    } catch (err) {
      console.error('[State] Error cargando plantillas:', err);
      this.notify('TEMPLATES_ERROR');
      return false;
    }
  }

  /**
   * Restaura las colecciones a los valores originales de NuvioCollections.json
   */
  resetCollections() {
    if (!this.originalCollectionsTemplate) return;
    this.collections = JSON.parse(JSON.stringify(this.originalCollectionsTemplate)).map(section => ({
      ...section,
      pinToTop: section.pinToTop !== undefined ? section.pinToTop : true,
      enabled: true,
      folders: (section.folders || []).map(f => ({ ...f, enabled: true }))
    }));
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Activa o desactiva una carpeta/colección
   */
  toggleFolder(sectionId, folderId) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section) return;
    const folder = section.folders.find(f => f.id === folderId);
    if (folder) {
      folder.enabled = !folder.enabled;
      this.notify('COLLECTIONS_UPDATED');
    }
  }

  /**
   * Activa o desactiva toda una sección
   */
  toggleSection(sectionId, forceState = null) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section) return;
    const newState = forceState !== null ? forceState : !section.enabled;
    section.enabled = newState;
    section.folders.forEach(f => { f.enabled = newState; });
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Actualiza propiedades de una sección completa (título, visibilidad, etc.)
   */
  updateSection(sectionId, newProps) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section) return;
    Object.assign(section, newProps);
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Actualiza los datos de una colección existente
   */
  updateFolder(sectionId, folderId, newProps) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section) return;
    const folderIndex = section.folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      section.folders[folderIndex] = {
        ...section.folders[folderIndex],
        ...newProps
      };
      this.notify('COLLECTIONS_UPDATED');
    }
  }

  /**
   * Reordena carpetas dentro de una sección por índice directo (drag and drop)
   */
  reorderFolder(sectionId, fromIndex, toIndex) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return false;
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= section.folders.length || toIndex < 0 || toIndex >= section.folders.length) return false;

    const [moved] = section.folders.splice(fromIndex, 1);
    section.folders.splice(toIndex, 0, moved);
    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Reordena carpetas dentro de una sección (dirección relativa: -1 o 1)
   */
  moveFolder(sectionId, folderIndex, direction) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return;

    const targetIndex = folderIndex + direction;
    if (targetIndex < 0 || targetIndex >= section.folders.length) return;

    const [moved] = section.folders.splice(folderIndex, 1);
    section.folders.splice(targetIndex, 0, moved);
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Reordena secciones completas por índice directo (drag and drop)
   */
  reorderSection(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= this.collections.length || toIndex < 0 || toIndex >= this.collections.length) return false;

    const [moved] = this.collections.splice(fromIndex, 1);
    this.collections.splice(toIndex, 0, moved);
    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Reordena secciones completas (dirección relativa: -1 o 1)
   */
  moveSection(sectionIndex, direction) {
    const targetIndex = sectionIndex + direction;
    if (targetIndex < 0 || targetIndex >= this.collections.length) return;

    const [moved] = this.collections.splice(sectionIndex, 1);
    this.collections.splice(targetIndex, 0, moved);
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Mueve una sección a los extremos: 'top' (al cielo / posición 0) o 'bottom' (al fondo / última posición)
   */
  moveSectionExtreme(sectionIndex, destination) {
    if (sectionIndex < 0 || sectionIndex >= this.collections.length) return;
    const targetIndex = destination === 'top' ? 0 : this.collections.length - 1;
    if (sectionIndex === targetIndex) return;

    const [moved] = this.collections.splice(sectionIndex, 1);
    this.collections.splice(targetIndex, 0, moved);
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Elimina una carpeta de una sección
   */
  deleteFolder(sectionId, folderId) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section) return;
    section.folders = section.folders.filter(f => f.id !== folderId);
    this.notify('COLLECTIONS_UPDATED');
  }

  /**
   * Reordena un catálogo dentro de una carpeta por índice directo (drag and drop)
   */
  reorderCatalogInFolder(sectionId, folderId, fromIndex, toIndex) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return false;
    const folder = section.folders.find(f => f.id === folderId);
    if (!folder || !folder.sources) return false;

    const sources = folder.sources || [];
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= sources.length || toIndex < 0 || toIndex >= sources.length) return false;

    const [movedSource] = sources.splice(fromIndex, 1);
    sources.splice(toIndex, 0, movedSource);
    folder.sources = sources;

    if (Array.isArray(folder.catalogSources) && folder.catalogSources.length > fromIndex) {
      const [movedCat] = folder.catalogSources.splice(fromIndex, 1);
      folder.catalogSources.splice(toIndex, 0, movedCat);
    }

    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Reordena un catálogo dentro de una carpeta (subir o bajar relativo: -1 o 1)
   */
  moveCatalogInFolder(sectionId, folderId, catalogIndex, direction) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return false;
    const folder = section.folders.find(f => f.id === folderId);
    if (!folder) return false;

    const sources = folder.sources || [];
    const targetIndex = catalogIndex + direction;
    if (targetIndex < 0 || targetIndex >= sources.length) return false;

    // Mover en sources
    const [movedSource] = sources.splice(catalogIndex, 1);
    sources.splice(targetIndex, 0, movedSource);
    folder.sources = sources;

    // Mover en catalogSources si existe
    if (Array.isArray(folder.catalogSources) && folder.catalogSources.length === sources.length) {
      const [movedCat] = folder.catalogSources.splice(catalogIndex, 1);
      folder.catalogSources.splice(targetIndex, 0, movedCat);
    }

    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Mueve un catálogo a los extremos: 'top' (al cielo / posición 0) o 'bottom' (al fondo / última posición)
   */
  moveCatalogExtreme(sectionId, folderId, catalogIndex, destination) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return false;
    const folder = section.folders.find(f => f.id === folderId);
    if (!folder || !folder.sources) return false;

    const sources = folder.sources || [];
    if (catalogIndex < 0 || catalogIndex >= sources.length) return false;

    const targetIndex = destination === 'top' ? 0 : sources.length - 1;
    if (catalogIndex === targetIndex) return false;

    const [movedSource] = sources.splice(catalogIndex, 1);
    sources.splice(targetIndex, 0, movedSource);
    folder.sources = sources;

    if (Array.isArray(folder.catalogSources) && folder.catalogSources.length > catalogIndex) {
      const [movedCat] = folder.catalogSources.splice(catalogIndex, 1);
      folder.catalogSources.splice(targetIndex, 0, movedCat);
    }

    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Renombra un catálogo dentro de una carpeta y en la plantilla de AIOMetadata
   */
  renameCatalogInFolder(sectionId, folderId, catalogIndex, newTitle) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return false;
    const folder = section.folders.find(f => f.id === folderId);
    if (!folder || !folder.sources || !folder.sources[catalogIndex]) return false;

    const trimmed = (newTitle || '').trim();
    if (!trimmed) return false;

    const source = folder.sources[catalogIndex];
    source.title = trimmed;

    if (Array.isArray(folder.catalogSources) && folder.catalogSources[catalogIndex]) {
      folder.catalogSources[catalogIndex].title = trimmed;
    }

    // Actualizar en el manifest de AIOMetadata si coincide con el catalogId
    const catId = source.catalogId || source.id;
    if (catId && this.rawMetadataTemplate) {
      const cats = this.rawMetadataTemplate.config?.catalogs || this.rawMetadataTemplate.catalogs || [];
      const match = cats.find(c => c.id === catId);
      if (match) {
        match.name = trimmed;
      }
    }

    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Elimina un catálogo de una carpeta
   */
  removeCatalogFromFolder(sectionId, folderId, catalogIndex) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return false;
    const folder = section.folders.find(f => f.id === folderId);
    if (!folder || !folder.sources || catalogIndex < 0 || catalogIndex >= folder.sources.length) return false;

    folder.sources.splice(catalogIndex, 1);
    if (Array.isArray(folder.catalogSources) && folder.catalogSources.length > catalogIndex) {
      folder.catalogSources.splice(catalogIndex, 1);
    }

    this.notify('COLLECTIONS_UPDATED');
    return true;
  }

  /**
   * Añade un catálogo a una carpeta
   */
  addCatalogToFolder(sectionId, folderId, catalogMeta) {
    const section = this.collections.find(s => s.id === sectionId);
    if (!section || !section.folders) return { success: false, error: 'Sección no encontrada.' };
    const folder = section.folders.find(f => f.id === folderId);
    if (!folder) return { success: false, error: 'Carpeta no encontrada.' };

    if (!Array.isArray(folder.sources)) folder.sources = [];
    if (!Array.isArray(folder.catalogSources)) folder.catalogSources = [];

    const catId = catalogMeta.id || '';
    const exists = folder.sources.some(s => (s.catalogId || s.id) === catId);
    if (exists) {
      return { success: false, error: 'El catálogo ya está presente en esta fila.' };
    }

    const newSource = {
      type: catalogMeta.type || 'movie',
      genre: null,
      title: catalogMeta.name || catId,
      sortBy: null,
      tmdbId: null,
      addonId: 'aio-metadata',
      filters: null,
      sortHow: null,
      provider: 'addon',
      catalogId: catId,
      mediaType: null,
      traktListId: null,
      tmdbSourceType: null
    };

    const newCatSource = {
      type: catalogMeta.type || 'movie',
      genre: null,
      addonId: 'aio-metadata',
      catalogId: catId,
      title: catalogMeta.name || catId
    };

    folder.sources.push(newSource);
    folder.catalogSources.push(newCatSource);

    this.notify('COLLECTIONS_UPDATED');
    return { success: true };
  }

  /**
   * Métodos para validación de API Keys
   */
  setApiKeysValidation(isValid, statusMap = {}) {
    this.apiKeysValidated = isValid;
    this.apiKeysValidationStatus = statusMap;
    if (isValid) {
      this.unlockStep(5);
    }
    this.notify('API_KEYS_VALIDATED');
  }

  invalidateApiKeysValidation() {
    this.apiKeysValidated = false;
    this.apiKeysValidationStatus = {};
    this.notify('API_KEYS_INVALIDATED');
  }

  /**
   * Genera el payload sincronizado para AIOMetadata:
   * Solo incluye los catálogos vinculados a colecciones que estén activas (`enabled !== false`)
   * e inyecta las API keys configuradas en el Paso 3.
   */
  getSynchronizedMetadataPayload() {
    return prepareMetadataPayload({ rawTemplate: this.rawMetadataTemplate, collections: this.collections,
      preferences: this.preferences, apiKeys: this.apiKeys, searchAiEnabled: this.searchAiEnabled,
      password: this.aiometadata.password || 'NuvioSetupMaster2026' });
  }

  /**
   * Obtiene la estructura nativa completa de colecciones Nuvio lista para inyección
   * (filtrando carpetas o secciones deshabilitadas)
   */
  getSynchronizedNuvioCollections() { return selectedCollections(this.collections); }

  /**
   * Obtiene la lista aplanada para inyección compatible en /rest/v1/collections
   */
  getFlattenedCollectionsForApi(profileId, addonId) {
    return flattenedCollections(this.collections, { profileId, addonId });
  }

  /**
   * Agrega un mensaje a la consola de logs
   */
  addLog(message, type = 'info') {
    const entry = {
      timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
      message,
      type // 'info' | 'success' | 'warning' | 'error'
    };
    this.execution.logs.push(entry);
    this.notify('LOG_ADDED');
  }

  clearLogs() {
    this.execution.logs = [];
    this.notify('LOGS_CLEARED');
  }
}

// Instancia única (Singleton)
export const state = new WizardState();
