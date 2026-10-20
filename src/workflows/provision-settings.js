async function cleanDiscardedAddons({ client, config, auth, profileId, deletedIds, log }) {
  if (!deletedIds || deletedIds.size === 0) {
    log('✓ Addons preexistentes conservados intactos.', 'success');
    return;
  }
  log(`Eliminando ${deletedIds.size} addon(s) descartados del perfil...`, 'info');
  for (const addonId of deletedIds) {
    try {
      await client.deleteAddon({
        apiUrl: config.nuvioApiUrl,
        apikey: auth?.apikey || config.nuvioPublicAnonKey,
        accessToken: auth?.accessToken,
        addonId,
        profileId,
      });
    } catch {
      // Ignorar fallo de borrado individual
    }
  }
  log(`✓ ${deletedIds.size} addon(s) descartados eliminados correctamente.`, 'success');
}

async function syncCredentials({ client, config, auth, profileId, apiKeys, isSimulation, services, log }) {
  const credentials = [];
  if (apiKeys?.tmdb?.trim()) credentials.push({ provider: 'tmdb', credential_json: { api_key: apiKeys.tmdb.trim() } });
  if (apiKeys?.mdblist?.trim()) credentials.push({ provider: 'mdblist', credential_json: { api_key: apiKeys.mdblist.trim() } });
  if (!credentials.length) return;

  const names = credentials.map(c => c.provider.toUpperCase()).join(', ');
  log(`Guardando credenciales oficiales de proveedores (${names})...`, 'info');
  if (isSimulation) {
    await (services.delay ? services.delay(300) : Promise.resolve());
    log(`✓ [Simulado] Credenciales de ${names} vinculadas al perfil.`, 'success');
    return;
  }
  try {
    await client.pushProviderCredentials({
      apiUrl: config.nuvioApiUrl,
      apikey: auth?.apikey || config.nuvioPublicAnonKey,
      accessToken: auth?.accessToken,
      profileId,
      credentials,
    });
    log(`✓ Credenciales de ${names} guardadas en Nuvio.`, 'success');
  } catch (err) {
    log(`⚠️ Advertencia al guardar credenciales: ${err?.message || err}`, 'warning');
  }
}

async function buildBadgeSettings(preferences, services) {
  if (!preferences?.badgesEnabled || !services.getBadgePackById || !services.compileBadgeRules) return null;
  const pack = services.getBadgePackById(preferences.selectedBadgePack);
  if (!pack) return null;

  const activeIds = preferences.activeBadgeModules || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
  const orderIds = preferences.badgeModulesOrder || ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];
  const compiled = await services.compileBadgeRules(pack, activeIds, orderIds);
  const rules = { imports: [{ sourceUrl: 'custom://nuvio-badges-latino', filters: compiled.filters, groups: compiled.groups, isActive: true }] };

  return {
    stream_badge_rules: { type: 'string', value: JSON.stringify(rules) },
    show_file_size_badges: { type: 'boolean', value: activeIds.includes('size') },
    stream_badge_placement: { type: 'string', value: 'BOTTOM' },
    show_addon_logo: { type: 'boolean', value: false },
  };
}

export async function runSettingsPhase({ state, config, services, isSimulation, targetProfileId, log }) {
  log('[3/5] Verificando y saneando addons del perfil...', 'info');
  const client = services.nuvioClient;

  if (isSimulation) {
    await (services.delay ? services.delay(400) : Promise.resolve());
    log('✓ [Simulado] Addons del perfil listos para actualización.', 'success');
  } else {
    await cleanDiscardedAddons({ client, config, auth: state.nuvioAuth, profileId: targetProfileId, deletedIds: state.deletedAddonIds, log });
  }

  await syncCredentials({ client, config, auth: state.nuvioAuth, profileId: targetProfileId, apiKeys: state.apiKeys, isSimulation, services, log });

  const enrichment = Boolean(state.preferences?.tmdbEnrichment);
  const ratings = Boolean(state.preferences?.mdblistRatings && state.apiKeys?.mdblist?.trim());
  const badges = await buildBadgeSettings(state.preferences, services);

  const payload = {
    language: 'es-MX',
    tmdb_language: 'es-MX',
    enrichment_enabled: enrichment,
    ratings_enabled: ratings,
    tmdb_api_key: enrichment && state.apiKeys?.tmdb ? state.apiKeys.tmdb.trim() : '',
    mdblist_api_key: ratings && state.apiKeys?.mdblist ? state.apiKeys.mdblist.trim() : '',
    ...(badges ? { stream_badge_settings: badges } : {}),
  };

  if (isSimulation) {
    await (services.delay ? services.delay(400) : Promise.resolve());
  } else {
    for (const platform of ['tv', 'mobile', 'desktop']) {
      await client.pushProfileSettings({
        apiUrl: config.nuvioApiUrl,
        apikey: state.nuvioAuth?.apikey || config.nuvioPublicAnonKey,
        accessToken: state.nuvioAuth?.accessToken,
        userId: state.nuvioAuth?.userId,
        profileId: targetProfileId,
        platform,
        settings: payload,
      });
    }
  }
  log(`✓ TMDB Enrichment ${enrichment ? 'activado' : 'desactivado'} en es-MX (TV, Mobile y Desktop).`, enrichment ? 'success' : 'info');
  log(`✓ Calificaciones de MDBList ${ratings ? 'activadas' : 'desactivadas'} para TV, Mobile y Desktop.`, ratings ? 'success' : 'info');
}
