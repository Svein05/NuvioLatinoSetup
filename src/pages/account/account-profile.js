import { loadAccountProfile } from '../../workflows/load-account-profile.js';
import { buildProfileOverview, extractProfileSettings } from '../../features/profiles/index.js';
import { isAioMetadataAddon } from '../../features/addons/index.js';

function applyProfileReads(state, result, notify) {
  state.loadErrors = {};
  for (const key of ['addons', 'settings', 'credentials']) {
    if (result[key].status === 'rejected') {
      state.loadErrors[key] = true;
      notify(`No se pudieron cargar ${key === 'addons' ? 'los addons' : 'los ajustes del perfil'}.`, 'warning');
    }
  }
  if (result.addons.status === 'fulfilled') {
    state.installedAddons = structuredClone(result.addons.value);
    state.originalInstalledAddons = structuredClone(result.addons.value);
    state.aioAddon = state.installedAddons.find(addon => isAioMetadataAddon(addon)) || null;
    const url = state.aioAddon?.manifest_url || state.aioAddon?.url || '';
    state.aioUuid = url.match(/\/stremio\/([^/]+)\/manifest\.json/)?.[1] || null;
  }
  const extracted = extractProfileSettings({
    blob: result.settings.value, credentials: result.credentials.value || [],
  });
  state.settings = extracted.settings;
  state.originalSettings = structuredClone(state.settings);
  state._rawStreamBadgeSettings = extracted.streamBadges;
  if (result.overview.status === 'fulfilled') state.overviewData = buildProfileOverview({
    ...result.overview.value, profileId: state.selectedProfileId, addonsCount: state.installedAddons.length,
  });
}

export function createAccountProfileLoader({ state, client, config, metadata, notify, render, services }) {
  let revision = 0;
  async function load(profileId) {
    const request = ++revision;
    const isCurrent = () => request === revision && profileId === state.selectedProfileId;
    metadata.cancel();
    state.aioConfig = null; state.aioAddon = null; state.aioUuid = null; state.aioProtected = false;
    state.installedAddons = []; state.originalInstalledAddons = []; state.settings = {};
    state.isLoadingProfile = true;
    render();
    try {
      const result = await loadAccountProfile(client, {
        apiUrl: config.NUVIO_API_URL, apikey: config.NUVIO_PUBLIC_ANON_KEY,
        accessToken: state.session.accessToken, userId: state.session.userId, profileId,
      });
      if (!isCurrent()) return;
      applyProfileReads(state, result, notify);
      if (state.aioUuid) await metadata.load(state.aioUuid, state.aioPassword, isCurrent)
        .catch(error => { if (isCurrent()) notify([401, 403].includes(error.status)
          ? 'AIOMetadata requiere su contraseña. Desbloquéalo desde su sección.' : error.message, 'warning'); });
      if (!isCurrent()) return;
      await services.presentOverview?.({
        data: state.overviewData, settings: state.settings,
        addonsCount: state.installedAddons.length, isCurrent,
      });
    } finally {
      if (isCurrent()) { state.isLoadingProfile = false; render(); }
    }
  }
  return { load, cancel: () => { revision++; metadata.cancel(); } };
}
