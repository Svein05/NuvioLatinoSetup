export async function runCollectionsStep({ state, config, services, isSimulation, targetProfileId, log }) {
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
