/**
 * Gestión de Estado Reactivo y Sincronización Dinámica
 * Nuvio & AIOMetadata Auto-Setup Wizard
 */
import { CONFIG } from './config.js';

class WizardState {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.maxUnlockedStep = 1; // Control restrictivo de avance de pasos

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

    // Credenciales de Proveedores de Metadatos
    this.apiKeys = {
      tmdb: '',
      mdblist: '',
      trakt: '',
      gemini: '',
      rpdb: ''
    };

    // Plantillas en memoria
    this.rawMetadataTemplate = null;
    this.originalCollectionsTemplate = null;
    this.collections = []; // Secciones y carpetas editables

    // Configuración AIOMetadata
    this.aiometadata = {
      instanceUrl: CONFIG.DEFAULT_AIOMETADATA_URL,
      password: ''
    };

    // Configuración de Ejecución
    this.execution = {
      mode: 'real', // 'simulation' | 'real'
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

  /**
   * Valida si un paso cumple con los requisitos obligatorios para poder avanzar
   * @param {number} stepNumber
   * @returns {{ valid: boolean, error: string | null }}
   */
  validateStep(stepNumber) {
    switch (stepNumber) {
      case 1:
        if (!this.nuvioAuth.isAuthenticated || !this.nuvioAuth.accessToken) {
          return {
            valid: false,
            error: 'Debes iniciar sesión con tu cuenta de Nuvio (pulsa "Conectar Cuenta") para continuar al siguiente paso.'
          };
        }
        return { valid: true, error: null };

      case 2:
        if (!this.selectedProfileId) {
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
            error: 'Debes tener activada al menos una colección en el Mini NUVIO.'
          };
        }
        return { valid: true, error: null };
      }

      case 4:
        if (!this.apiKeys.tmdb || this.apiKeys.tmdb.trim().length < 8) {
          return {
            valid: false,
            error: 'La TMDB API Key es obligatoria para obtener la información de películas y series.'
          };
        }
        return { valid: true, error: null };

      case 5:
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
      const [metaRes, colRes] = await Promise.all([
        fetch(CONFIG.TEMPLATES.METADATA_LATINO),
        fetch(CONFIG.TEMPLATES.NUVIO_COLLECTIONS)
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
   * Reordena carpetas dentro de una sección
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
   * Reordena secciones completas
   */
  moveSection(sectionIndex, direction) {
    const targetIndex = sectionIndex + direction;
    if (targetIndex < 0 || targetIndex >= this.collections.length) return;

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
            if (cs && cs.catalogId) activeCatalogIds.add(cs.catalogId);
          });
        }
        // Extraer de sources
        if (Array.isArray(folder.sources)) {
          folder.sources.forEach(s => {
            if (s && s.catalogId) activeCatalogIds.add(s.catalogId);
          });
        }
      });
    });

    // 2. Filtrar catálogos en el payload de AIOMetadata
    const filterCatList = (list) => {
      if (!Array.isArray(list)) return [];
      return list.filter(cat => {
        const isIncluded = activeCatalogIds.has(cat.id);
        cat.showInHome = false;
        return isIncluded;
      });
    };

    if (Array.isArray(configObj.catalogs)) {
      configObj.catalogs = filterCatList(configObj.catalogs);
    }
    if (Array.isArray(template.catalogs)) {
      template.catalogs = filterCatList(template.catalogs);
    }

    // 3. Inyectar API Keys en config
    if (!configObj.apiKeys) configObj.apiKeys = {};

    if (this.apiKeys.tmdb) {
      configObj.apiKeys.tmdb = this.apiKeys.tmdb.trim();
    }
    if (this.apiKeys.mdblist) {
      configObj.apiKeys.mdblist = this.apiKeys.mdblist.trim();
    }
    if (this.apiKeys.trakt) {
      configObj.apiKeys.traktTokenId = this.apiKeys.trakt.trim();
    }
    if (this.apiKeys.gemini) {
      configObj.apiKeys.gemini = this.apiKeys.gemini.trim();
    }

    // 4. Inyectar contraseña de edición
    const password = this.aiometadata.password || 'NuvioSetupMaster2026';

    return {
      password,
      ...configObj,
      config: configObj,
      catalogs: configObj.catalogs || template.catalogs || []
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
