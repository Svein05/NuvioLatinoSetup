/**
 * Gestión de Estado Reactivo y Sincronización Dinámica
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { CONFIG } from './config.js';

class WizardState {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 6;
    this.maxUnlockedStep = 1; // Control restrictivo de avance de pasos

    // Preferencias de Perfil y Motor de Pósters (Paso 5)
    this.preferences = {
      tmdbEnrichment: true,
      mdblistRatings: true,
      posterEngine: 'default', // 'default' | 'betterposter' | 'postersplus'
      customPosterUrl: '',
      badgesEnabled: false,
      selectedBadgePack: 'tinted',
      selectedBadgeVersion: 'v2', // 'v2' | 'v1'
      badgesModules: {
        languages: false,
        streaming: false,
        subtitles: false,
        fileSize: true
      }
    };

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
        if (!this.aiometadata.password || this.aiometadata.password.trim().length < 4) {
          return {
            valid: false,
            error: 'Debes definir una contraseña de al menos 4 caracteres para tu addon de AIOMetadata (o pulsar "Generar aleatoria").'
          };
        }
        return { valid: true, error: null };

      default:
        return { valid: true, error: null };
    }
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
      const [metaRes, colRes] = await Promise.all([
        fetch(`${CONFIG.TEMPLATES.METADATA_LATINO}${cacheBuster}`, { cache: 'no-store' }),
        fetch(`${CONFIG.TEMPLATES.NUVIO_COLLECTIONS}${cacheBuster}`, { cache: 'no-store' })
      ]);

      if (!metaRes.ok || !colRes.ok) {
        throw new Error('Error al leer los archivos de plantillas locales.');
      }

      this.rawMetadataTemplate = await metaRes.json();
      const collectionsData = await colRes.json();

      // Clonar para permitir reset
      this.originalCollectionsTemplate = JSON.parse(JSON.stringify(collectionsData));
      
      // Inicializar cada carpeta con propiedad `enabled: true` si no viene definida
      this.collections = collectionsData.map(section => ({
        ...section,
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
    if (!this.rawMetadataTemplate) {
      throw new Error('Plantilla MetadataLatino no cargada.');
    }

    const template = JSON.parse(JSON.stringify(this.rawMetadataTemplate));
    const configObj = template.config ? template.config : template;

    // 1. Obtener todos los catalogIds referenciados por carpetas ACTIVAS
    const activeCatalogIds = new Set();
    this.collections.forEach(section => {
      if (section.enabled === false) return;
      (section.folders || []).forEach(folder => {
        if (folder.enabled === false) return;

        // Extraer de catalogSources
        if (Array.isArray(folder.catalogSources)) {
          folder.catalogSources.forEach(cs => {
            if (cs && cs.catalogId) {
              activeCatalogIds.add(cs.catalogId);
              if (cs.catalogId.startsWith('tmdb.trending')) activeCatalogIds.add('tmdb.trending');
              if (cs.catalogId.startsWith('tmdb.top')) activeCatalogIds.add('tmdb.top');
            }
          });
        }
        // Extraer de sources
        if (Array.isArray(folder.sources)) {
          folder.sources.forEach(s => {
            if (s && s.catalogId) {
              activeCatalogIds.add(s.catalogId);
              if (s.catalogId.startsWith('tmdb.trending')) activeCatalogIds.add('tmdb.trending');
              if (s.catalogId.startsWith('tmdb.top')) activeCatalogIds.add('tmdb.top');
            }
          });
        }
      });
    });

    // 2. Determinar si se activa Custom Art según la preferencia seleccionada
    const engine = (this.preferences && this.preferences.posterEngine) || 'default';
    const isCustomEngine = engine !== 'default';

    // 2.1 Unificar catálogos de ambas listas (config.catalogs y root catalogs) deduplicando por id:::type
    const combinedCatalogs = [];
    const seenCatKeys = new Set();
    const sourceLists = [configObj.catalogs, template.catalogs].filter(Array.isArray);
    for (const list of sourceLists) {
      for (const cat of list) {
        if (!cat || !cat.id) continue;
        const key = `${cat.id}:::${cat.type || 'movie'}`;
        if (!seenCatKeys.has(key)) {
          seenCatKeys.add(key);
          combinedCatalogs.push(cat);
        }
      }
    }

    const filteredCatalogs = combinedCatalogs.filter(cat => {
      const isIncluded = activeCatalogIds.has(cat.id);
      cat.showInHome = false;
      cat.enableRatingPosters = isCustomEngine;
      return isIncluded;
    });

    configObj.catalogs = filteredCatalogs;
    if (template.catalogs) {
      template.catalogs = filteredCatalogs;
    }

    // 3. Inyectar API Keys en config
    if (!configObj.apiKeys) configObj.apiKeys = {};

    configObj.apiKeys.tmdb = (this.apiKeys.tmdb || '').trim();
    configObj.apiKeys.tvdb = (this.apiKeys.tvdb || '').trim();
    configObj.apiKeys.mdblist = (this.apiKeys.mdblist || '').trim();
    configObj.apiKeys.rpdb = (this.apiKeys.rpdb || 't0-free-rpdb').trim();
    configObj.apiKeys.topPoster = (this.apiKeys.topPoster || '').trim();
    configObj.apiKeys.publicmetadb = (this.apiKeys.publicmetadb || '').trim();
    configObj.apiKeys.gemini = (this.apiKeys.gemini || '').trim();
    configObj.apiKeys.openrouter = (this.apiKeys.openrouter || '').trim();
    configObj.apiKeys.traktTokenId = '';

    // 3.1 Configuración estricta de Custom Art y Motor de Pósters
    if (engine === 'default') {
      // DESACTIVADO ESTRICTO: Carátulas nativas limpias en español latino (evita fallback en inglés)
      configObj.posterRatingProvider = "none";
      configObj.customPosterUrlPattern = "";
      configObj.enableRatingPostersForLibrary = false;
      configObj.usePosterProxy = false;
      if (template.customPosterUrlPattern !== undefined) {
        template.customPosterUrlPattern = "";
      }
    } else if (engine === 'betterposter') {
      // ACTIVADO ESTRICTO: BetterPoster con link oficial es-MX
      configObj.posterRatingProvider = "custom";
      configObj.customPosterUrlPattern = (this.preferences.customPosterUrl || '').trim() ||
        "https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg?lang=es-MX&rs=IM";
      configObj.enableRatingPostersForLibrary = true;
      configObj.usePosterProxy = true;
      if (template.customPosterUrlPattern !== undefined) {
        template.customPosterUrlPattern = configObj.customPosterUrlPattern;
      }
    } else if (engine === 'postersplus') {
      // ACTIVADO ESTRICTO: PostersPlus con credenciales interpoladas
      const tmdbEncoded = encodeURIComponent((this.apiKeys.tmdb || '').trim());
      const mdblistEncoded = encodeURIComponent((this.apiKeys.mdblist || '').trim());
      const defaultPostersPlusPattern = `https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&primary_client=stremio_tv_nuvio&tmdb_key=${tmdbEncoded}&mdblist_key=${mdblistEncoded}&top_gradient=medium&fallback_to_imdb=true&rating_display_mode=3&minimalist_append_mode=3&minimalist_mode_font_size_ratio=0.056&minimalist_mode_font_x_offset=0.065&minimalist_score_out_of_10=true&movie_weights=letterboxd%3A0.99%2Ctrakt%3A0.01&tv_weights=trakt%3A0.80%2Ctomatoes%3A0.20&logo_language=es-mx&logo_priority=native%2Cenglish%2Coriginal%2Cneutral%2Ctext&fallback_bg_style=photoreal&logo_bottom_ratio=0.23&sash_length_ratio=1.20&sash_height_ratio=0.135&badge_display_mode=0`;

      configObj.posterRatingProvider = "custom";
      configObj.customPosterUrlPattern = (this.preferences.customPosterUrl || '').trim() || defaultPostersPlusPattern;
      configObj.enableRatingPostersForLibrary = true;
      configObj.usePosterProxy = true;
      if (template.customPosterUrlPattern !== undefined) {
        template.customPosterUrlPattern = configObj.customPosterUrlPattern;
      }
    }

    // 3.1 Configurar Búsqueda con IA
    if (!configObj.search) configObj.search = {};
    configObj.search.ai_enabled = Boolean(this.searchAiEnabled);
    if (this.searchAiEnabled) {
      if (!configObj.search.engineEnabled) configObj.search.engineEnabled = {};
      configObj.search.engineEnabled["gemini.search"] = true;
      if (this.apiKeys.openrouter) {
        configObj.search.ai_provider = 'openrouter';
      } else if (this.apiKeys.gemini) {
        configObj.search.ai_provider = 'gemini';
      }
    } else {
      if (configObj.search.engineEnabled) {
        configObj.search.engineEnabled["gemini.search"] = false;
      }
    }

    // 4. Inyectar contraseña de edición
    const password = this.aiometadata.password || 'NuvioSetupMaster2026';

    return {
      password,
      config: configObj
    };
  }

  /**
   * Obtiene la estructura nativa completa de colecciones Nuvio lista para inyección
   * (filtrando carpetas o secciones deshabilitadas)
   */
  getSynchronizedNuvioCollections() {
    return this.collections
      .filter(sec => sec.enabled !== false && (sec.folders || []).some(f => f.enabled !== false))
      .map(sec => ({
        ...sec,
        folders: sec.folders.filter(f => f.enabled !== false)
      }));
  }

  /**
   * Obtiene la lista aplanada para inyección compatible en /rest/v1/collections
   */
  getFlattenedCollectionsForApi(profileId, addonId) {
    const list = [];
    let order = 1;

    this.collections.forEach(sec => {
      if (sec.enabled === false) return;
      (sec.folders || []).forEach(folder => {
        if (folder.enabled === false) return;

        const mainCatalog = (folder.catalogSources && folder.catalogSources[0]) ||
                            (folder.sources && folder.sources[0]) || {};

        list.push({
          profile_id: profileId,
          name: folder.title,
          catalog_id: mainCatalog.catalogId || folder.id,
          catalog_type: mainCatalog.type || 'movie',
          addon_id: addonId,
          backdrop_url: folder.heroBackdropUrl || folder.coverImageUrl || '',
          sort_order: order++,
          is_active: true
        });
      });
    });

    return list;
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
