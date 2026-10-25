import { renderReadFeedback } from '../read-feedback.js';
import { renderAioSection } from './aiometadata.js';

function applyMetadata(state, config) {
  state.aioConfig = structuredClone(config);
  state.originalAioConfig = structuredClone(config);
  const value = config.config || config;
  const pattern = value.customPosterUrlPattern || '';
  state.posterEngine = value.posterRatingProvider !== 'custom' ? 'default'
    : pattern.includes('btttr.cc') ? 'betterposter'
      : pattern.includes('postersplus.stremio.ru') ? 'postersplus' : 'custom_external';
  state.customPosterUrl = pattern;
  state.originalPosterEngine = state.posterEngine;
  state.originalCustomPosterUrl = pattern;
  for (const key of ['tmdb', 'mdblist']) {
    if (!state.dirty.settings && !state.settings[`${key}_api_key`] && value.apiKeys?.[key]) {
      state.settings[`${key}_api_key`] = value.apiKeys[key];
      state.originalSettings[`${key}_api_key`] = value.apiKeys[key];
    }
  }
  state.dirty.aiometadata = false;
}

export function createAccountMetadata({ root, state, services, notify, updateUI, setupPasswordToggles }) {
  let revision = 0;
  const render = () => {
    const card = root.getElementById('accountAioCard');
    if (renderReadFeedback(card, { loading: state.isLoadingProfile || state.isLoadingMetadata,
      error: state.metadataError, retry: () => { void load(state.aioUuid).catch(() => {}); } })) return;
    renderAioSection(state, {
    root, setupPasswordToggles,
    onUnlock: (password, errorEl) => load(state.aioUuid, password).catch(error => {
      const currentError = root.getElementById('aioPromptError') || errorEl;
      if (currentError?.isConnected) currentError.textContent = [401, 403].includes(error.status) ? 'La contraseña de AIOMetadata no es correcta.' : error.message;
    }),
    onLoadByUuid: uuid => load(uuid, state.aioPassword).catch(error => notify(error.message, 'error')),
    onPasswordChange: password => { state.aioPassword = password; },
    onCopyManifest: url => services.copyText(url).catch(error => notify(error.message, 'error')),
    onEngineChange: engine => {
      if (!state.aioConfig) { notify('Carga primero la configuración de AIOMetadata.', 'warning'); return; }
      state.posterEngine = engine;
      state.dirty.aiometadata = engine !== state.originalPosterEngine;
      render(); updateUI();
    },
    onCustomUrlChange: (engine, url) => {
      state.posterEngine = engine; state.customPosterUrl = url;
      state.dirty.aiometadata = engine !== state.originalPosterEngine || url !== state.originalCustomPosterUrl;
      if (engine === 'default') render();
      updateUI();
    },
    });
  };
  async function load(uuid, password = state.aioPassword, isCurrent = () => true) {
    const request = ++revision;
    const ownerUrl = state.aioAddon?.manifest_url || state.aioAddon?.url;
    if (!ownerUrl) throw new Error('Selecciona un addon AIOMetadata instalado para identificar su instancia.');
    state.isLoadingMetadata = true; state.metadataError = ''; render(); updateUI();
    try {
      const result = await services.loadMetadata(ownerUrl, uuid, password);
      if (request !== revision || !isCurrent()) return;
      state.aioUuid = uuid; state.aioPassword = password; state.aioProtected = false;
      applyMetadata(state, result.config);
      render(); updateUI();
    } catch (error) {
      if (request !== revision || !isCurrent()) return;
      if ([401, 403].includes(error.status)) state.aioProtected = true;
      else state.metadataError = 'No se pudo cargar la configuración de AIOMetadata.';
      throw error;
    } finally {
      if (request === revision && isCurrent()) { state.isLoadingMetadata = false; render(); updateUI(); }
    }
  }
  return { render, load, cancel: () => { revision++; state.isLoadingMetadata = false; state.metadataError = ''; } };
}
