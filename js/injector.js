/**
 * Orquestador del Pipeline de Inyección y Sincronización
 * Coordina AIOMetadataClient, NuvioClient y WizardState con logs en tiempo real.
 */
import { state } from './state.js';
import { AIOMetadataClient } from './aiometadata-client.js';
import { NuvioClient } from './nuvio-client.js';
import { CONFIG } from './config.js';

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

        // Leer manifest generado para obtener ID y Nombre oficial
        state.addLog('Inspeccionando manifest generado...', 'info');
        const manifest = await AIOMetadataClient.fetchManifest(manifestUrl);
        addonId = manifest.id || addonId;
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
      // FASE 3: Limpieza de Addons y Configuración de Perfil (es-MX)
      // ========================================================
      state.addLog('[3/5] Limpiando addons preexistentes del perfil...', 'info');
      if (isSimulation) {
        await this.delay(500);
        state.addLog('✓ [Simulado] Addons preexistentes ("nuvio catalog addon", "opensubtitles") eliminados.', 'success');
      } else {
        await NuvioClient.cleanProfileAddons({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken,
          userId: state.nuvioAuth.userId,
          profileId: targetProfileId
        });
        state.addLog('✓ Perfil limpio: catálogo previo removido para evitar duplicados.', 'success');
      }

      state.addLog('Configurando perfil: TMDB Enrichment y MDBList Ratings en es-MX (TV y Mobile)...', 'info');
      const profileSettingsPayload = {
        language: 'es-MX',
        tmdb_language: 'es-MX',
        enrichment_enabled: true,
        ratings_enabled: true,
        tmdb_api_key: state.apiKeys.tmdb || '',
        mdblist_api_key: state.apiKeys.mdblist || '',
        auto_translate: true
      };

      if (isSimulation) {
        await this.delay(500);
        state.addLog('✓ [Simulado] Configuración aplicada para TV y Mobile en español latino (es-MX).', 'success');
      } else {
        for (const platform of ['tv', 'mobile']) {
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
        state.addLog('✓ TMDB Enrichment y MDBList Ratings configurados exitosamente en es-MX.', 'success');
      }

      // ========================================================
      // FASE 4: Registro del Addon AIOMetadata en Nuvio
      // ========================================================
      state.addLog('[4/5] Registrando Addon AIOMetadata Latino en Nuvio (/rest/v1/addons)...', 'info');
      const addonPayload = {
        profile_id: targetProfileId,
        addon_id: addonId,
        manifest_url: manifestUrl,
        transport_url: manifestUrl,
        name: addonName,
        enabled: true
      };

      if (isSimulation) {
        await this.delay(600);
        state.addLog('✓ [Simulado] Addon registrado correctamente en el perfil.', 'success');
      } else {
        await NuvioClient.installAddon({
          apiUrl: CONFIG.NUVIO_API_URL,
          apikey: state.nuvioAuth.apikey || CONFIG.NUVIO_PUBLIC_ANON_KEY,
          accessToken,
          userId: state.nuvioAuth.userId,
          addonData: addonPayload
        });
        state.addLog('✓ Addon instalado exitosamente en el perfil de Nuvio.', 'success');
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
