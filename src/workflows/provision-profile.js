import { runSettingsPhase } from './provision-settings.js';
import { runAddonsPhase } from './provision-addons.js';

function posterDescription(engine) {
  if (engine === 'betterposter') return 'BetterPoster (btttr.cc - es-MX)';
  if (engine === 'postersplus') return 'PostersPlus (stremio.ru - badges & ratings)';
  return 'Nativo / Limpio (TMDB es-MX sin custom art)';
}

async function runAiometadataPhase({ state, config, services, isSimulation, log }) {
  log('[1/5] Compilando configuración de AIOMetadata (Español Latino)...', 'info');
  const payload = state.getSynchronizedMetadataPayload ? state.getSynchronizedMetadataPayload() : (state.metaPayload || {});
  const count = (payload.config?.catalogs || payload.catalogs || []).length;
  log(`✓ ${count} catálogos sincronizados en modo Ghost (inHome: false).`, 'info');
  log(`✓ Sistema de pósters configurado: ${posterDescription(state.preferences?.posterEngine)}`, 'success');

  if (isSimulation) {
    await (services.delay ? services.delay(700) : Promise.resolve());
    const rand = services.randomId ? services.randomId() : Math.random().toString(36).substring(2, 10);
    const mockUuid = `lat-${rand}`;
    const base = (state.aiometadata?.instanceUrl || 'https://aiometadata.com').replace(/\/+$/, '');
    const manifestUrl = `${base}/stremio/${mockUuid}/manifest.json`;
    log(`✓ [Simulado] UUID generado: ${mockUuid}`, 'success');
    log(`✓ [Simulado] Manifest URL: ${manifestUrl}`, 'success');
    return { manifestUrl, addonName: 'AIOMetadata Latino' };
  }

  if (!services.provisionMetadata) throw new Error('Servicio de aprovisionamiento de metadatos no configurado.');
  log('[1/5] Guardando configuración en AIOMetadata con pool de instancias...', 'info');
  const saveRes = await services.provisionMetadata({
    instances: config.aiometadataInstances || [],
    payload,
    onAttempt: (inst, curr, total) => log(`[1/5] Conectando con AIOMetadata (${curr}/${total}): ${inst}...`, 'info'),
  });
  if (state.aiometadata) state.aiometadata.instanceUrl = saveRes.instanceUrl;
  log(`✓ Configuración guardada en ${saveRes.instanceUrl}`, 'success');
  log(`✓ UUID generado: ${saveRes.uuid}`, 'success');
  log(`✓ Manifest generado: ${saveRes.manifestUrl}`, 'success');

  let addonName = 'AIOMetadata Latino';
  if (services.inspectManifest) {
    const inspection = await services.inspectManifest({ manifestUrl: saveRes.manifestUrl });
    addonName = inspection.manifest?.name || addonName;
    if (inspection.verified) log(`✓ Addon verificado: "${addonName}" (ID: aio-metadata)`, 'success');
    (inspection.warnings || []).forEach(w => log(w, 'warning'));
  }
  return { manifestUrl: saveRes.manifestUrl, addonName };
}

async function performLogin({ client, config, auth, log }) {
  if (!auth?.email || !auth?.password) {
    throw new Error('Faltan credenciales de Nuvio. Ingresa tu correo y contraseña en el Paso 1.');
  }
  log(`Iniciando sesión con ${auth.email}...`, 'info');
  const loginData = await client.login({
    apiUrl: config.nuvioApiUrl,
    apikey: auth.apikey || config.nuvioPublicAnonKey,
    email: auth.email,
    password: auth.password,
  });
  auth.accessToken = loginData.accessToken;
  auth.userId = loginData.userId;
  auth.isAuthenticated = true;
  log('✓ Sesión iniciada con éxito en Nuvio API.', 'success');
}

async function resolveProfiles({ client, config, auth, state }) {
  const profiles = await client.getProfiles({
    apiUrl: config.nuvioApiUrl,
    apikey: auth.apikey || config.nuvioPublicAnonKey,
    accessToken: auth.accessToken,
    userId: auth.userId,
  });
  state.profiles = profiles;
  if (!state.selectedProfileId && Array.isArray(profiles) && profiles.length > 0) {
    state.selectedProfileId = profiles[0].id;
    state.selectedProfileName = profiles[0].name || profiles[0].title || 'Perfil Principal';
  }
}

async function runAuthPhase({ state, config, services, isSimulation, log }) {
  log('[2/5] Verificando autenticación y perfil de Nuvio...', 'info');
  let targetProfileId = state.selectedProfileId;
  let targetProfileName = state.selectedProfileName || 'Perfil Principal';

  if (isSimulation) {
    await (services.delay ? services.delay(600) : Promise.resolve());
    targetProfileId = targetProfileId || 'mock-profile-uuid-001';
    log(`✓ [Simulado] Sesión confirmada. Perfil objetivo: "${targetProfileName}"`, 'success');
    return { targetProfileId, targetProfileName };
  }

  const client = services.nuvioClient;
  if (!client) throw new Error('Cliente Nuvio no configurado.');

  if (!state.nuvioAuth?.accessToken) {
    await performLogin({ client, config, auth: state.nuvioAuth, log });
    await resolveProfiles({ client, config, auth: state.nuvioAuth, state });
    targetProfileId = state.selectedProfileId;
    targetProfileName = state.selectedProfileName || targetProfileName;
  }

  if (!targetProfileId) throw new Error('No se ha seleccionado ningún perfil de destino en el Paso 2.');
  log(`✓ Perfil seleccionado: "${targetProfileName}" (ID: ${targetProfileId})`, 'success');
  return { targetProfileId, targetProfileName };
}

async function runCollectionsPhase({ state, config, services, isSimulation, targetProfileId, log }) {
  log('[5/5] Inyectando colecciones nativas sincronizadas (sync_push_collections)...', 'info');
  const collections = state.getSynchronizedNuvioCollections ? state.getSynchronizedNuvioCollections() : (state.synchronizedCollections || []);
  const total = collections.reduce((acc, sec) => acc + (sec.folders?.length || 0), 0);

  if (isSimulation) {
    await (services.delay ? services.delay(800) : Promise.resolve());
    log(`✓ [Simulado] ${total} colecciones inyectadas con éxito.`, 'success');
    return total;
  }

  await services.nuvioClient.pushCollections({
    apiUrl: config.nuvioApiUrl,
    apikey: state.nuvioAuth?.apikey || config.nuvioPublicAnonKey,
    accessToken: state.nuvioAuth?.accessToken,
    profileId: targetProfileId,
    collectionsJson: collections,
  });
  log(`✓ ${total} colecciones inyectadas exitosamente en tu perfil de Nuvio.`, 'success');
  return total;
}

function setupExecution(state, log) {
  state.execution.completionId = crypto.randomUUID();
  state.execution.error = null;
  state.execution.isRunning = true;
  state.execution.isCompleted = false;
  state.execution.result = null;
  state.clearLogs?.();
  const isSimulation = state.execution.mode === 'simulation';
  log(`🚀 Iniciando proceso en modo: ${isSimulation ? 'SIMULACIÓN (Testing sin API)' : 'REAL (Llamadas a producción)'}`, 'info');
  return isSimulation;
}

export async function executeProfileProvisioning(state, { config = {}, services = {} } = {}) {
  if (!state?.execution || state.execution.isRunning) return;

  const log = (msg, level = 'info') => state.addLog?.(msg, level);
  const isSimulation = setupExecution(state, log);

  try {
    const { manifestUrl } = await runAiometadataPhase({ state, config, services, isSimulation, log });
    const { targetProfileId, targetProfileName } = await runAuthPhase({ state, config, services, isSimulation, log });
    await runSettingsPhase({ state, config, services, isSimulation, targetProfileId, log });
    await runAddonsPhase({ state, config, services, isSimulation, manifestUrl, targetProfileId, log });
    const collectionsCount = await runCollectionsPhase({ state, config, services, isSimulation, targetProfileId, log });

    const uuid = manifestUrl.split('/stremio/')[1]?.replace('/manifest.json', '') || 'ok';
    state.execution.result = { uuid, manifestUrl, addonId: 'aio-metadata', collectionsCount, profileName: targetProfileName };
    state.execution.isCompleted = true;
    log('🎉 ¡Configuración completada con éxito! Tu Nuvio está listo.', 'success');

    if (!isSimulation && services.recordCompletion) {
      services.recordCompletion(state.execution.completionId).catch(err => console.warn('[Pipeline] Error en contador:', err));
    }
  } catch (err) {
    const errMsg = err?.message || String(err);
    state.execution.error = errMsg;
    log(`❌ Error en el proceso: ${errMsg}`, 'error');
  } finally {
    state.execution.isRunning = false;
    state.notify?.('EXECUTION_FINISHED');
  }
}
