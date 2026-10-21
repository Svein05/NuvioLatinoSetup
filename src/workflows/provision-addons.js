import { isAioMetadataAddon } from '../features/addons/index.js';

async function generateAioStreamsConfig({ state, config, services }) {
  let template = state.rawAioStreamsTemplate;
  if (!template && services.fetchTemplate && config.templates?.aiostreams) {
    template = await services.fetchTemplate(`${config.templates.aiostreams}?v=${Date.now()}`);
    state.rawAioStreamsTemplate = template;
  }
  const compile = services.compileStreamingConfig;
  const aioConfig = compile ? compile(template, state.aiostreams?.debrids || {}) : template;
  return services.createStreamingConfiguration(config.aiostreamsInstance, aioConfig, state.aiometadata?.password);
}

async function resolveAioStreamsAddon({ secAddon, state, config, services, log }) {
  if (!secAddon.isAioStreams || secAddon.manifest_url) return;
  if (state.aiostreams?.manifestUrl) {
    secAddon.manifest_url = state.aiostreams.manifestUrl;
    secAddon.url = state.aiostreams.manifestUrl;
    log(`✓ Reutilizando manifiesto de AIOStreams: ${secAddon.manifest_url}`, 'success');
    return;
  }
  log('Compilando y generando AIOStreams Latino...', 'info');

  const res = await generateAioStreamsConfig({ state, config, services });
  secAddon.manifest_url = res.manifestUrl;
  secAddon.url = res.manifestUrl;
  if (state.aiostreams) state.aiostreams.manifestUrl = res.manifestUrl;
  log(`✓ AIOStreams Latino generado exitosamente: ${res.manifestUrl}`, 'success');
}

async function installMissingAddons({ client, config, auth, profileId, addons }) {
  for (const addon of addons) {
    if (addon.id || !addon.manifest_url) continue;

    const res = await client.installAddon({
      apiUrl: config.nuvioApiUrl,
      apikey: auth?.apikey || config.nuvioPublicAnonKey,
      accessToken: auth?.accessToken,
      userId: auth?.userId,
      addonData: { profile_id: profileId, manifest_url: addon.manifest_url, url: addon.manifest_url, name: addon.name, sort_order: addon.sort_order },
    });
    if (res?.addonId) addon.id = res.addonId;
  }
}

export async function runAddonsPhase({ state, config, services, isSimulation, manifestUrl, targetProfileId, log }) {
  log('[4/5] Registrando AIOMetadata (#1) y sincronizando orden de addons...', 'info');
  if (isSimulation) {
    await (services.delay ? services.delay(600) : Promise.resolve());
    for (const addon of (state.profileAddons || [])) {
      if (addon.isAioStreams && !addon.manifest_url) {
        addon.manifest_url = `${config.aiostreamsInstance || 'https://aiostreams.com'}/stremio/mock-uuid/mock-pass/manifest.json`;
        addon.url = addon.manifest_url;
      }
    }
    log('✓ [Simulado] AIOMetadata anclado en #1 y addons secundarios organizados.', 'success');
    return;
  }

  const client = services.nuvioClient;
  const auth = state.nuvioAuth;
  const aioResult = await client.installOrUpdateAioAddon({
    apiUrl: config.nuvioApiUrl,
    apikey: auth?.apikey || config.nuvioPublicAnonKey,
    accessToken: auth?.accessToken,
    userId: auth?.userId,
    profileId: targetProfileId,
    manifestUrl,
    existingAioId: state.existingAioAddon?.id || null,
  });
  const finalAioId = aioResult?.addonId || state.existingAioAddon?.id || null;

  const secondaryAddons = (state.profileAddons || []).filter(a => !isAioMetadataAddon(a));
  for (const addon of secondaryAddons) {
    await resolveAioStreamsAddon({ secAddon: addon, state, config, services, log });
  }
  await installMissingAddons({ client, config, auth, profileId: targetProfileId, addons: secondaryAddons });

  const installedSecondary = secondaryAddons.filter(a => a.id || a.manifest_url);
  const finalAddons = [
    { id: finalAioId, name: 'AIOMetadata', url: manifestUrl, manifest_url: manifestUrl, sort_order: 1 },
    ...installedSecondary.map((sec, idx) => ({ ...sec, sort_order: idx + 2 })),
  ];

  await client.syncAddonsOrder({
    apiUrl: config.nuvioApiUrl,
    apikey: auth?.apikey || config.nuvioPublicAnonKey,
    accessToken: auth?.accessToken,
    userId: auth?.userId,
    profileId: targetProfileId,
    addons: finalAddons,
  });
  log(`✓ ${secondaryAddons.length} addons organizados y sincronizados.`, 'success');
}
