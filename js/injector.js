/**
 * Orquestador del Pipeline de Inyección y Sincronización
 * Coordina AIOMetadataClient, NuvioClient y WizardState con logs en tiempo real.
 */
import { state } from './state.js';
import { AIOMetadataClient } from './aiometadata-client.js';
import { NuvioClient } from './nuvio-client.js';
import { CONFIG } from './config.js';
import { 
  getBadgePackById, 
  getBadgePackUrl,
  isSectionActive,
  getCanonicalModuleId,
  compileUniversalBadgeRules
} from './badge-packs.js';
import { recordSuccessfulCompletion } from './counter.js';

export class PipelineInjector {
  /**
   * Ejecuta el pipeline completo (Simulado o Real)
   */
  static async execute() {
    if (state.execution.isRunning) return;

    state.execution.isRunning = true;
    state.execution.isCompleted = false;
    state.execution.result = null;
    state.clearLogs();

    const isSimulation = state.execution.mode === 'simulation';

    state.addLog(`🚀 Iniciando proceso en modo: ${isSimulation ? 'SIMULACIÓN (Testing sin API)' : 'REAL (Llamadas a producción)'}`, 'info');

    try {
      // ========================================================
      // FASE 1: Filtrado y Guardado en AIOMetadata
      // ========================================================
      state.addLog('[1/5] Compilando configuración de AIOMetadata (Español Latino)...', 'info');
      const metaPayload = state.getSynchronizedMetadataPayload();
      const activeCatalogsCount = (metaPayload.config?.catalogs || metaPayload.catalogs || []).length;
      state.addLog(`✓ ${activeCatalogsCount} catálogos sincronizados en modo Ghost (inHome: false).`, 'info');
      const activeEngine = state.preferences?.posterEngine || 'default';
      const engineDesc = activeEngine === 'betterposter' ? 'BetterPoster (btttr.cc - es-MX)' : (activeEngine === 'postersplus' ? 'PostersPlus (stremio.ru - badges & ratings)' : 'Nativo / Limpio (TMDB es-MX sin custom art)');
      state.addLog(`✓ Sistema de pósters configurado: ${engineDesc}`, 'success');

      let manifestUrl = '';
      let addonId = 'aio-metadata';
      let addonName = 'AIOMetadata Latino';

      if (isSimulation) {
        await this.delay(700);
        const mockUuid = 'lat-' + Math.random().toString(36).substring(2, 10);
        manifestUrl = `${state.aiometadata.instanceUrl.replace(/\/+$/, '')}/stremio/${mockUuid}/manifest.json`;
        state.addLog(`✓ [Simulado] UUID generado: ${mockUuid}`, 'success');
        state.addLog(`✓ [Simulado] Manifest URL: ${manifestUrl}`, 'success');
      } else {
        state.addLog('[1/5] Guardando configuración en AIOMetadata con pool de instancias...', 'info');
        const saveRes = await AIOMetadataClient.saveWithFallbacks(
          CONFIG.AIOMETADATA_INSTANCES,
          metaPayload,
          (instance, current, total) => {
            state.addLog(`[1/5] Conectando con AIOMetadata (${current}/${total}): ${instance}...`, 'info');
          }
        );
        manifestUrl = saveRes.manifestUrl;
        state.aiometadata.instanceUrl = saveRes.instanceUrl;
        state.addLog(`✓ Configuración guardada en ${saveRes.instanceUrl}`, 'success');
        state.addLog(`✓ UUID generado: ${saveRes.uuid}`, 'success');
        state.addLog(`✓ Manifest generado: ${manifestUrl}`, 'success');

        // Leer manifest generado para obtener Nombre oficial sin alterar el addonId canónico 'aio-metadata'
        state.addLog('Inspeccionando manifest generado...', 'info');
        const manifest = await AIOMetadataClient.fetchManifest(manifestUrl);
        addonName = manifest.name || addonName;
        state.addLog(`✓ Addon verificado: "${addonName}" (ID: ${addonId})`, 'success');
      }

      // ========================================================
      // FASE 2: Verificación de Sesión y Perfil en Nuvio
      // ========================================================
      state.addLog('[2/5] Verificando autenticación y perfil de Nuvio...', 'info');
      let accessToken = state.nuvioAuth.accessToken;
      let targetProfileId = state.selectedProfileId;
      let targetProfileName = state.selectedProfileName || 'Perfil Principal';

      if (isSimulation) {
        await this.delay(600);
        targetProfileId = targetProfileId || 'mock-profile-uuid-001';
        state.addLog(`✓ [Simulado] Sesión confirmada. Perfil objetivo: "${targetProfileName}"`, 'success');
      } else {
        // Si no se inició sesión en el paso 1, intentar con los inputs actuales
        if (!accessToken) {
          if (!state.nuvioAuth.email || !state.nuvioAuth.password) {
            throw new Error('Faltan credenciales de Nuvio. Ingresa tu correo y contraseña en el Paso 1.');
          }
          state.addLog(`Iniciando sesión con ${state.nuvioAuth.email}...`, 'info');
          const loginData = await NuvioClient.login({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            email: state.nuvioAuth.email,
            password: state.nuvioAuth.password
          });
          accessToken = loginData.accessToken;
          state.nuvioAuth.accessToken = accessToken;
          state.nuvioAuth.userId = loginData.userId;
          state.nuvioAuth.isAuthenticated = true;
          state.addLog('✓ Sesión iniciada con éxito en Nuvio API.', 'success');

          // Obtener perfiles si aún no estaban cargados
          const profiles = await NuvioClient.getProfiles({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken,
            userId: loginData.userId
          });
          state.profiles = profiles;
          if (!targetProfileId && profiles.length > 0) {
            targetProfileId = profiles[0].id;
            targetProfileName = profiles[0].name || profiles[0].title || 'Perfil Principal';
            state.selectedProfileId = targetProfileId;
            state.selectedProfileName = targetProfileName;
          }
        }

        if (!targetProfileId) {
          throw new Error('No se ha seleccionado ningún perfil de destino en el Paso 2.');
        }

        state.addLog(`✓ Perfil seleccionado: "${targetProfileName}" (ID: ${targetProfileId})`, 'success');
      }

      // ========================================================
      // FASE 3: Saneamiento de Addons y Configuración de Perfil (es-MX)
      // ========================================================
      state.addLog('[3/5] Verificando y saneando addons del perfil...', 'info');
      if (isSimulation) {
        await this.delay(400);
        state.addLog('✓ [Simulado] Addons del perfil listos para actualización.', 'success');
      } else {
        if (state.deletedAddonIds && state.deletedAddonIds.size > 0) {
          state.addLog(`Eliminando ${state.deletedAddonIds.size} addon(s) descartados del perfil...`, 'info');
          for (const delId of state.deletedAddonIds) {
            try {
              await NuvioClient.deleteAddon({
                apiUrl: CONFIG.NUVIO_API_URL,
                apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
                accessToken,
                addonId: delId,
                profileId: targetProfileId
              });
            } catch (_) {}
          }
          state.addLog(`✓ ${state.deletedAddonIds.size} addon(s) descartados eliminados correctamente.`, 'success');
        } else {
          state.addLog('✓ Addons preexistentes conservados intactos.', 'success');
        }
      }

      // Sincronizar credenciales de proveedores (TMDB y MDBList)
      const credentialsToPush = [];
      if (state.apiKeys.tmdb && state.apiKeys.tmdb.trim()) {
        credentialsToPush.push({
          provider: 'tmdb',
          credential_json: { api_key: state.apiKeys.tmdb.trim() }
        });
      }
      if (state.apiKeys.mdblist && state.apiKeys.mdblist.trim()) {
        credentialsToPush.push({
          provider: 'mdblist',
          credential_json: { api_key: state.apiKeys.mdblist.trim() }
        });
      }

      if (credentialsToPush.length > 0) {
        state.addLog(`Guardando credenciales oficiales de proveedores (${credentialsToPush.map(c => c.provider.toUpperCase()).join(', ')})...`, 'info');
        if (isSimulation) {
          await this.delay(300);
          state.addLog(`✓ [Simulado] Credenciales de ${credentialsToPush.map(c => c.provider.toUpperCase()).join(', ')} vinculadas al perfil.`, 'success');
        } else {
          try {
            await NuvioClient.pushProviderCredentials({
              apiUrl: CONFIG.NUVIO_API_URL,
              apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
              accessToken,
              profileId: targetProfileId,
              credentials: credentialsToPush
            });
            state.addLog(`✓ Credenciales de ${credentialsToPush.map(c => c.provider.toUpperCase()).join(', ')} guardadas en Nuvio.`, 'success');
          } catch (credErr) {
            console.warn('[Injector] No se pudieron guardar credenciales:', credErr);
            state.addLog(`⚠️ Advertencia al guardar credenciales: ${credErr.message}`, 'warning');
          }
        }
      }

      const isEnrichmentActive = Boolean(state.preferences?.tmdbEnrichment);
      const hasMdblistKey = Boolean(state.apiKeys.mdblist && state.apiKeys.mdblist.trim());
      const hasTmdbKey = Boolean(state.apiKeys.tmdb && state.apiKeys.tmdb.trim());
      const isRatingsActive = Boolean(state.preferences?.mdblistRatings && hasMdblistKey);
      const posterEngine = state.preferences?.posterEngine || 'default';
      const posterEngineLabel = posterEngine === 'betterposter' ? 'BetterPoster (btttr.cc)' : (posterEngine === 'postersplus' ? 'PostersPlus (stremio.ru)' : 'Default (Limpio)');

      const isBadgesActive = Boolean(state.preferences?.badgesEnabled);
      let selectedBadgePack = null;
      let badgePackUrl = '';
      if (isBadgesActive) {
        selectedBadgePack = getBadgePackById(state.preferences.selectedBadgePack);
        badgePackUrl = getBadgePackUrl(state.preferences.selectedBadgePack);
      }

      state.addLog(`Configurando perfil Nuvio: TMDB Enrichment = ${isEnrichmentActive ? 'ACTIVADO' : 'DESACTIVADO'}, Calificaciones MDBList = ${isRatingsActive ? 'ACTIVADO' : 'DESACTIVADO'} (Pósters: ${posterEngineLabel}${isBadgesActive && selectedBadgePack ? `, Badges: ${selectedBadgePack.name}` : ''})...`, 'info');

      const profileSettingsPayload = {
        language: 'es-MX',
        tmdb_language: 'es-MX',
        enrichment_enabled: isEnrichmentActive,
        ratings_enabled: isRatingsActive,
        tmdb_api_key: isEnrichmentActive && hasTmdbKey ? state.apiKeys.tmdb.trim() : '',
        mdblist_api_key: isRatingsActive && hasMdblistKey ? state.apiKeys.mdblist.trim() : ''
      };

      if (isBadgesActive && selectedBadgePack) {
        state.addLog(`Compilando reglas universales e híbridas de badges: "${selectedBadgePack.name}"...`, 'info');

        const activeIds = state.preferences.activeBadgeModules || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
        const orderIds = state.preferences.badgeModulesOrder || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];

        let compiled = { groups: [], filters: [] };
        try {
          compiled = await compileUniversalBadgeRules(selectedBadgePack, activeIds, orderIds);
        } catch (compileErr) {
          console.warn('[Injector] Error en compilación universal de badges:', compileErr);
        }

        const badgeRulesJson = {
          imports: [
            {
              sourceUrl: 'custom://nuvio-badges-latino',
              filters: compiled.filters,
              groups: compiled.groups,
              isActive: true
            }
          ]
        };

        const showFileSize = Boolean(activeIds.includes('size'));

        profileSettingsPayload.stream_badge_settings = {
          stream_badge_rules: {
            type: 'string',
            value: JSON.stringify(badgeRulesJson)
          },
          show_file_size_badges: {
            type: 'boolean',
            value: showFileSize
          },
          stream_badge_placement: {
            type: 'string',
            value: 'BOTTOM'
          },
          show_addon_logo: {
            type: 'boolean',
            value: false
          }
        };
      }

      if (isSimulation) {
        await this.delay(400);
        state.addLog(`✓ [Simulado] TMDB Enrichment ${isEnrichmentActive ? 'activado' : 'desactivado'} en TV, Mobile y Desktop (es-MX).`, isEnrichmentActive ? 'success' : 'info');
        state.addLog(`✓ [Simulado] Calificaciones de MDBList ${isRatingsActive ? 'activadas con tu clave' : 'desactivadas'} para TV, Mobile y Desktop.`, isRatingsActive ? 'success' : 'info');
        if (isBadgesActive && selectedBadgePack) {
          state.addLog(`✓ [Simulado] Fusion Badges configurados con estilo "${selectedBadgePack.name}" para TV, Mobile y Desktop.`, 'success');
        }
      } else {
        for (const platform of ['tv', 'mobile', 'desktop']) {
          await NuvioClient.pushProfileSettings({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken,
            userId: state.nuvioAuth.userId,
            profileId: targetProfileId,
            platform,
            settings: profileSettingsPayload
          });
        }
        state.addLog(`✓ TMDB Enrichment ${isEnrichmentActive ? 'activado exitosamente' : 'desactivado'} en es-MX (TV, Mobile y Desktop).`, isEnrichmentActive ? 'success' : 'info');
        state.addLog(`✓ Calificaciones de MDBList ${isRatingsActive ? 'activadas exitosamente' : 'desactivadas'} para TV, Mobile y Desktop.`, isRatingsActive ? 'success' : 'info');
        if (isBadgesActive && selectedBadgePack) {
          state.addLog(`✓ Fusion Badges configurados exitosamente con estilo "${selectedBadgePack.name}" para TV, Mobile y Desktop.`, 'success');
        }
      }

      // ========================================================
      // FASE 4: Registro y Ordenamiento de Addons en Nuvio
      // ========================================================
      state.addLog('[4/5] Registrando AIOMetadata (#1) y sincronizando orden de addons...', 'info');

      if (isSimulation) {
        await this.delay(600);
        state.addLog('✓ [Simulado] AIOMetadata anclado en #1 y addons secundarios organizados.', 'success');
      } else {
        // 1. Instalar o actualizar AIOMetadata en posición #1
        const existingAioId = state.existingAioAddon?.id || null;
        await NuvioClient.installOrUpdateAioAddon({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken,
          userId: state.nuvioAuth.userId,
          profileId: targetProfileId,
          manifestUrl,
          existingAioId
        });
        state.addLog('✓ AIOMetadata registrado como addon principal de metadatos (#1).', 'success');

        // 2. Registrar nuevos addons añadidos manualmente en el Paso 6
        const secondaryAddons = state.profileAddons || [];
        for (const secAddon of secondaryAddons) {
          if (!secAddon.id && secAddon.manifest_url) {
            try {
              await NuvioClient.installAddon({
                apiUrl: CONFIG.NUVIO_API_URL,
                apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
                accessToken,
                userId: state.nuvioAuth.userId,
                addonData: {
                  profile_id: targetProfileId,
                  manifest_url: secAddon.manifest_url,
                  url: secAddon.manifest_url,
                  name: secAddon.name,
                  sort_order: secAddon.sort_order
                }
              });
            } catch (instErr) {
              console.warn(`[Pipeline] Falló registro de addon adicional ${secAddon.name}:`, instErr.message);
            }
          }
        }

        // 3. Sincronizar el orden completo en Nuvio
        const allFinalAddons = [
          { id: existingAioId, name: 'AIOMetadata', url: manifestUrl, sort_order: 1 },
          ...secondaryAddons
        ];
        try {
          await NuvioClient.syncAddonsOrder({
            apiUrl: CONFIG.NUVIO_API_URL,
            apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
            accessToken,
            userId: state.nuvioAuth.userId,
            profileId: targetProfileId,
            addons: allFinalAddons
          });
          state.addLog(`✓ ${secondaryAddons.length} addons de streaming/catálogos organizados y sincronizados.`, 'success');
        } catch (_) {}
      }

      // ========================================================
      // FASE 5: Inyección de Colecciones Nativas
      // ========================================================
      state.addLog('[5/5] Inyectando colecciones nativas sincronizadas (sync_push_collections)...', 'info');
      const synchronizedCollections = state.getSynchronizedNuvioCollections();
      const totalCollections = synchronizedCollections.reduce((acc, sec) => acc + (sec.folders?.length || 0), 0);

      if (isSimulation) {
        await this.delay(800);
        state.addLog(`✓ [Simulado] ${totalCollections} colecciones inyectadas con éxito.`, 'success');
      } else {
        await NuvioClient.pushCollections({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken,
          profileId: targetProfileId,
          collectionsJson: synchronizedCollections
        });
        state.addLog(`✓ ${totalCollections} colecciones inyectadas exitosamente en tu perfil de Nuvio.`, 'success');
      }

      // ========================================================
      // RESULTADO FINAL
      // ========================================================
      state.execution.result = {
        uuid: manifestUrl.split('/stremio/')[1]?.replace('/manifest.json', '') || 'ok',
        manifestUrl,
        addonId,
        collectionsCount: totalCollections,
        profileName: targetProfileName
      };

      state.execution.isCompleted = true;
      state.addLog('🎉 ¡Configuración completada con éxito! Tu Nuvio está listo.', 'success');

      // Registrar finalización exitosa en el contador global (solo ejecuciones reales)
      if (!isSimulation) {
        recordSuccessfulCompletion().catch(err => {
          console.warn('[PipelineInjector] Error actualizando contador de configuraciones:', err);
        });
      }
    } catch (err) {
      console.error('[PipelineInjector] Error:', err);
      const errMsg = err?.message || String(err);
      state.execution.error = errMsg;
      state.addLog(`❌ Error en el proceso: ${errMsg}`, 'error');
    } finally {
      state.execution.isRunning = false;
      state.notify('EXECUTION_FINISHED');
    }
  }

  /**
   * Genera y descarga el archivo JSON de colecciones para importación manual en Nuvio
   */
  static downloadCollectionsJson() {
    const data = state.getSynchronizedNuvioCollections();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NuvioCollections_Latino.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Genera y descarga la configuración de AIOMetadata en JSON
   */
  static downloadAioConfigJson() {
    const data = state.getSynchronizedMetadataPayload();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AIOMetadata_Latino.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
