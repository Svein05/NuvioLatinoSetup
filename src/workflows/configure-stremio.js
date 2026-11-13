import { assertRealSetup } from '../shared/demo/setup.js';
import { prepareStremioMetadata } from './prepare-stremio-metadata.js';
import { stremioAddonSnapshot, matchesStremioInstallation } from '../features/stremio-setup/index.js';

function verifyCatalogs(manifest, catalogs) {
  if (!manifest?.id || !Array.isArray(manifest.catalogs)) throw new Error('No se pudo verificar el manifiesto de AIOMetadata. No se modificó Stremio.');
  const keys = new Set(manifest.catalogs.map(item => `${item.type}:${item.id}`));
  if (catalogs.some(item => !keys.has(`${item.type}:${item.id}`))) throw new Error('El addon no contiene todos los catálogos seleccionados. Revisa tu selección.');
}

async function metadataDescriptor(state, services) {
  const payload = prepareStremioMetadata(state);
  const saved = await services.provisionMetadata({
    instances: Object.keys(state.connections.accounts).length ? [state.connections.instance] : services.instances,
    payload,
  });
  const inspection = await services.inspectManifest({ manifestUrl: saved.manifestUrl });
  verifyCatalogs(inspection.manifest, payload.config.catalogs);
  return { transportUrl: saved.manifestUrl, manifest: inspection.manifest, flags: { official: false, protected: false } };
}

async function addonDescriptor(addon, services, state) {
  let url = addon.manifest_url || addon.url;
  if (addon.isAioStreams && !url) {
    const saved = await services.createStreams(state);
    url = saved.manifestUrl;
    state.aiostreams.manifestUrl = url;
  }
  const original = state.stremio.originalAddons.find(item => item.transportUrl === url);
  if (original) return structuredClone(original);
  const inspection = await services.inspectManifest({ manifestUrl: url });
  if (!inspection.manifest?.id) throw new Error('No se pudo verificar uno de los addons. No se modificó Stremio.');
  return { transportUrl: url, manifest: inspection.manifest, flags: { official: false, protected: false } };
}

async function assembleAddons(state, services) {
  const metadata = await metadataDescriptor(state, services);
  const addons = [metadata];
  for (const addon of state.profileAddons) addons.push(await addonDescriptor(addon, services, state));
  for (const original of state.stremio.originalAddons) {
    if (original.flags?.protected && !addons.some(item => item.transportUrl === original.transportUrl)) addons.push(structuredClone(original));
  }
  const urls = new Set();
  return addons.filter(item => {
    if (urls.has(item.transportUrl)) return false;
    urls.add(item.transportUrl);
    return true;
  });
}

/** Stremio replaces its addon collection as a whole. Never silently overwrite a newer snapshot. */
async function applyPrepared(state, services, progress) {
  const setup = state.stremio;
  const fresh = await services.readAddons(setup.session);
  if (setup.pendingWrite) {
    if (!matchesStremioInstallation(fresh, setup.pendingWrite)) {
      throw new Error('El guardado anterior quedó sin confirmar. Vuelve a conectar Stremio para revisar su estado antes de hacer cambios.');
    }
    return fresh;
  }
  if (stremioAddonSnapshot(fresh) !== stremioAddonSnapshot(setup.originalAddons)) {
    throw new Error('Los addons de tu cuenta cambiaron desde que iniciaste. Vuelve a conectar Stremio antes de continuar.');
  }
  progress('Preparando AIOMetadata y verificando tus catálogos…');
  const addons = await assembleAddons(state, services);
  const latest = await services.readAddons(setup.session);
  if (stremioAddonSnapshot(latest) !== stremioAddonSnapshot(fresh)) throw new Error('La cuenta cambió durante la preparación. Vuelve a conectarla.');
  setup.pendingWrite = addons;
  progress('Guardando el orden y los addons en Stremio…');
  try { await services.writeAddons(setup.session, addons); }
  catch (error) {
    if (error.outcome === 'rejected') {
      setup.pendingWrite = null;
      throw new Error('Stremio rechazó la configuración. Revisa los addons o reduce los catálogos antes de reintentar.', { cause: error });
    }
    throw new Error('No se pudo confirmar el guardado en Stremio. Puedes comprobar su estado sin repetir la escritura.', { cause: error });
  }
  const confirmed = await services.readAddons(setup.session);
  if (!matchesStremioInstallation(confirmed, addons)) throw new Error('Stremio respondió, pero los addons guardados no coinciden. Vuelve a conectar para revisarlos.');
  return confirmed;
}

export async function configureStremio(state, services, progress = () => {}) {
  assertRealSetup(state);
  if (!state.stremio.session || state.targetApplication !== 'stremio') throw new Error('Conecta Stremio antes de configurar.');
  for (const step of [1, 3, 4, 5, 6, 7]) {
    const verdict = state.validateStep(step);
    if (!verdict.valid) throw new Error(verdict.error);
  }
  if (state.stremio.completed) throw new Error('Esta configuración ya fue aplicada. Reconecta tu cuenta para iniciar otra.');
  state.stremio.completionId ||= crypto.randomUUID();
  progress('Comprobando el estado de tu cuenta…');
  const confirmed = await applyPrepared(state, services, progress);
  state.stremio.originalAddons = structuredClone(confirmed);
  state.stremio.pendingWrite = null;
  state.stremio.completed = true;
  progress('Tu configuración está lista. Abre Stremio o sincroniza sus addons.');
  await services.recordCompletion?.(state.stremio.completionId).catch(() => {});
}
