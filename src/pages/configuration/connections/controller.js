import { mountConnectionRemoval } from './remove-modal.js';
import { mountConnectionTracking } from './tracking.js';
import { isDemoCode } from '../../../shared/demo/setup.js';
import { createLifetime } from '../../../shared/ui/lifetime.js';
import { mountConnectionLists } from './lists-modal.js';
import { connectionProviders, availableConnectionCatalogs, synchronizeConnectionCollections } from '../../../features/connections/index.js';
import { composeConnectionCard, connectionStatus, renderConnectionAccount, renderConnectionBusy, toggleConnectionSecret, toggleConnectionEditor, showConnectionWarning } from './view.js';
import { attachConnectionsNavigation } from './navigation.js';

function mountCapabilities({ root, client, instance, lifetime }) {
  const status = root.querySelector('#connectionsCapabilities');
  const retry = root.querySelector('#connectionsRetry');
  let capabilityRequest;
  let capabilities = null;
  const refresh = async () => {
    capabilityRequest?.abort();
    const current = capabilityRequest = new AbortController();
    capabilities = null;
    status.textContent = 'Comprobando disponibilidad de AIOMetadata…'; status.hidden = false;
    retry.hidden = true;
    root.querySelectorAll('[data-connection-authorize]').forEach(link => { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); });
    try {
      const result = await client.capabilities(instance, AbortSignal.any([current.signal, lifetime.signal]));
      if (current.signal.aborted) return;
      capabilities = result;
      status.textContent = ''; status.hidden = true;
    } catch {
      if (current.signal.aborted || lifetime.signal.aborted) return;
      status.textContent = 'No se pudo consultar esta instancia. Reintenta en unos momentos.';
      retry.hidden = false;
    }
    for (const [provider, config] of Object.entries(connectionProviders)) {
      const link = root.querySelector(`[data-connection-provider="${provider}"] [data-connection-authorize]`);
      const unavailable = !capabilities || (provider === 'trakt' && !(capabilities.hasTrakt ?? capabilities.trakt))
        || (provider === 'simkl' && !(capabilities.hasSimkl ?? capabilities.simkl));
      const path = provider === 'simkl' && capabilities?.simklAuthMode === 'pin' ? '/configure' : config.auth;
      if (unavailable) link.removeAttribute('href');
      else link.href = `${instance}${path}`;
      link.setAttribute('aria-disabled', String(unavailable));
    }
  };
  lifetime.on(retry, 'click', refresh);
  lifetime.add(() => capabilityRequest?.abort());
  status.textContent = ''; status.hidden = true;
  return { instance, ready: () => Boolean(capabilities), refresh };
}

const limitationText = code => ({
  premium_only: 'Simkl requiere PRO o VIP para compartir listas personalizadas. Puedes usar las listas por estado.',
  needs_v2: 'Vuelve a conectar Simkl para cargar listas personalizadas. Las listas por estado siguen disponibles.',
}[code] || (code ? 'No se pudieron cargar las listas propias. Reintenta para actualizarlas.' : ''));

function createConnectionActions({ state, client, lifetime, capabilities, synchronize }) {
  const requests = new Map();
  const verify = async card => {
    const provider = card.dataset.connectionProvider;
    const input = card.querySelector('[data-connection-input]');
    const tokenId = input.value.trim() || state.connections.accounts[provider]?.tokenId;
    if (!isDemoCode(tokenId) && !capabilities.ready()) { connectionStatus(card, 'error', 'Primero comprueba la disponibilidad de la instancia.'); return; }
    requests.get(provider)?.abort();
    const request = new AbortController();
    requests.set(provider, request);
    const instance = capabilities.instance;
    const signal = AbortSignal.any([request.signal, lifetime.signal]);
    renderConnectionBusy(card, true);
    connectionStatus(card, '', 'Comprobando conexión y listas…');
    showConnectionWarning(card);
    try {
      const info = await client.verify(instance, provider, tokenId, signal);
      const account = { ...info, tokenId, selected: [], catalogs: [] };
      let result;
      try { result = await client.lists(instance, provider, account, signal); }
      catch { signal.throwIfAborted(); result = { lists: [], limitation: 'unavailable' }; }
      signal.throwIfAborted();
      account.catalogs = result.empty ? [] : availableConnectionCatalogs(provider, result.lists, account.username);
      const previous = state.connections.accounts[provider]; account.trackingEnabled = previous?.trackingEnabled ?? true;
      if (result.limitation && previous?.tokenId === tokenId) account.catalogs = previous.catalogs;
      if (provider === 'trakt') account.selected = account.catalogs.filter(c => c.id.startsWith('trakt.recommendations.')).map(c => `${c.type}:${c.id}`);
      if (previous?.tokenId === tokenId) account.selected = previous.selected.filter(key => account.catalogs.some(c => key === `${c.type}:${c.id}`));
      state.connections.accounts[provider] = account;
      state.connections.instance = instance;
      input.value = ''; card.dataset.editing = 'false';
      renderConnectionAccount(card, account);
      showConnectionWarning(card, limitationText(result.limitation) || (!account.catalogs.length ? 'Esta cuenta no tiene listas disponibles.' : ''));
      synchronize();
    } catch (error) {
      if (!signal.aborted) {
        const message = error.status ? 'No se pudo verificar la conexión. Comprueba el identificador y la instancia, o vuelve a autorizar.' : error.message;
        connectionStatus(card, 'error', `${message}${state.connections.accounts[provider] ? ' Se conserva la conexión anterior.' : ''}`);
      }
    } finally {
      if (requests.get(provider) === request) {
        requests.delete(provider); renderConnectionBusy(card, false);
        if (signal.aborted && !lifetime.signal.aborted) renderConnectionAccount(card, state.connections.accounts[provider]);
      }
    }
  };
  const remove = card => {
    requests.get(card.dataset.connectionProvider)?.abort();
    requests.delete(card.dataset.connectionProvider); renderConnectionBusy(card, false);
    delete state.connections.accounts[card.dataset.connectionProvider];
    delete state.connections.drafts[card.dataset.connectionProvider];
    if (!Object.keys(state.connections.accounts).length) state.connections.instance = null;
    card.querySelector('[data-connection-input]').value = ''; renderConnectionAccount(card, null);
    showConnectionWarning(card);
    synchronize(); capabilities.refresh();
  };
  const cancel = card => { requests.get(card.dataset.connectionProvider)?.abort(); };
  const cancelAll = () => { requests.forEach(request => request.abort()); };
  lifetime.add(() => { requests.forEach(request => request.abort()); state.connections = { instance: null, accounts: {} }; });
  return { verify, remove, cancel, cancelAll };
}

export function mountConnections({ state, client, instance, updateUI, root = document }) {
  const view = root.querySelector('#connectionsStep');
  if (!view) return () => {};
  const lifetime = createLifetime();
  const cards = [...view.querySelectorAll('[data-connection-provider]')];
  const artwork = Object.fromEntries(Object.keys(connectionProviders).map(provider => [provider, {
    local: view.querySelector('[data-connection-provider="' + provider + '"] img').src,
    public: 'https://cdn.jsdelivr.net/gh/Svein05/NuvioLatinoSetup@main/assets/connections/' + (provider === 'mal' ? 'myanimelist' : provider) + '.webp',
  }]));
  cards.forEach(card => {
    composeConnectionCard(card, card.dataset.connectionProvider);
  });
  const synchronize = () => {
    state.collections = synchronizeConnectionCollections(state.collections, state.connections, artwork);
    state.notify('COLLECTIONS_UPDATED');
    updateUI();
  };
  const capabilities = mountCapabilities({ root, state, client, instance, lifetime });
  state.connectionsOpened = () => { if (!capabilities.ready()) capabilities.refresh(); };
  state.connections.artwork = artwork;
  state.connections.drafts = {};
  lifetime.add(() => { delete state.connectionsOpened; });
  const actions = createConnectionActions({ root, state, client, lifetime, capabilities, synchronize });
  state.connectionsCancel = actions.cancelAll;
  lifetime.add(() => { delete state.connectionsCancel; });
  lifetime.on(view, 'submit', event => { event.preventDefault(); actions.verify(event.target.closest('[data-connection-provider]')); });
  lifetime.on(view, 'input', event => {
    if (!event.target.matches('[data-connection-input]')) return;
    const card = event.target.closest('[data-connection-provider]');
    state.connections.drafts[card.dataset.connectionProvider] = event.target.value;
    actions.cancel(card); updateUI();
  });
  lifetime.on(view, 'click', event => {
    if (event.target.closest('[data-connection-edit]')) toggleConnectionEditor(event.target.closest('[data-connection-provider]'));
    if (event.target.closest('[data-connection-visibility]')) toggleConnectionSecret(event.target.closest('[data-connection-provider]'));
  });
  lifetime.add(mountConnectionRemoval({ root, view, remove: actions.remove }));
  lifetime.add(mountConnectionLists({ root, state, view, synchronize }));
  lifetime.add(mountConnectionTracking({ root, state, view, synchronize }));
  attachConnectionsNavigation({ root, state, lifetime, updateUI });
  synchronize();
  return () => lifetime.dispose();
}
