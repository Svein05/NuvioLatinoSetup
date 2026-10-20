function resolvePosterDescription(engine) {
  if (engine === 'betterposter') return 'BetterPoster (btttr.cc - es-MX)';
  if (engine === 'postersplus') return 'PostersPlus (stremio.ru - badges & ratings)';
  return 'Nativo / Limpio (TMDB es-MX sin custom art)';
}

async function simulateAiometadata(state, services, log) {
  await (services.delay ? services.delay(700) : Promise.resolve());
  const rand = services.randomId ? services.randomId() : Math.random().toString(36).substring(2, 10);
  const mockUuid = `lat-${rand}`;
  const base = (state.aiometadata?.instanceUrl || 'https://aiometadata.com').replace(/\/+$/, '');
  const manifestUrl = `${base}/stremio/${mockUuid}/manifest.json`;
  log(`✓ [Simulado] UUID generado: ${mockUuid}`, 'success');
  log(`✓ [Simulado] Manifest URL: ${manifestUrl}`, 'success');
  return { manifestUrl, addonName: 'AIOMetadata Latino' };
}

async function provisionRemoteAiometadata({ state, config, services, payload, log }) {
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

export async function runAiometadataStep({ state, config, services, isSimulation, log }) {
  log('[1/5] Compilando configuración de AIOMetadata (Español Latino)...', 'info');
  const payload = state.getSynchronizedMetadataPayload ? state.getSynchronizedMetadataPayload() : (state.metaPayload || {});
  const catalogCount = (payload.config?.catalogs || payload.catalogs || []).length;
  log(`✓ ${catalogCount} catálogos sincronizados en modo Ghost (inHome: false).`, 'info');
  log(`✓ Sistema de pósters configurado: ${resolvePosterDescription(state.preferences?.posterEngine)}`, 'success');

  if (isSimulation) return simulateAiometadata(state, services, log);
  return provisionRemoteAiometadata({ state, config, services, payload, log });
}
