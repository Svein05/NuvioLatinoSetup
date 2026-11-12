import { createLifetime } from '../../../shared/ui/lifetime.js';
import { mountDisclosure } from '../../../shared/ui/disclosure/mount.js';
import { connectionProviders, availableConnectionCatalogs, synchronizeConnectionCollections } from '../../../features/connections/index.js';
import { composeConnectionCard, connectionStatus, renderConnectionAccount, showConnectionWarning } from './view.js';
import { attachConnectionsNavigation } from './navigation.js';

function mountCapabilities({ root, state, client, instances, lifetime }) {
  const select = root.querySelector('#connectionsInstance');
  const status = root.querySelector('#connectionsCapabilities');
  const retry = root.querySelector('#connectionsRetry');
  let capabilityRequest;
  let capabilities = null;
  instances.forEach(instance => select.add(new Option(new URL(instance).hostname, instance)));
  const refresh = async () => {
    capabilityRequest?.abort();
    const current = capabilityRequest = new AbortController();
    capabilities = null;
    status.textContent = 'Comprobando disponibilidad de AIOMetadata…';
    retry.hidden = true;
    root.querySelectorAll('[data-connection-authorize]').forEach(link => { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); });
    try {
      const result = await client.capabilities(select.value, AbortSignal.any([current.signal, lifetime.signal]));
      if (current.signal.aborted) return;
      capabilities = result;
      status.textContent = Object.keys(state.connections.accounts).length
        ? 'Instancia fijada para tus conexiones. Quita las conexiones antes de cambiarla.' : 'Instancia disponible. Elige un servicio para conectar.';
    } catch {
      if (current.signal.aborted || lifetime.signal.aborted) return;
      status.textContent = 'No se pudo consultar esta instancia. Reintenta o elige otra si aún no tienes conexiones.';
      retry.hidden = false;
    }
    for (const [provider, config] of Object.entries(connectionProviders)) {
      const link = root.querySelector(`[data-connection-provider="${provider}"] [data-connection-authorize]`);
      const unavailable = !capabilities || (provider === 'trakt' && !(capabilities.hasTrakt ?? capabilities.trakt))
        || (provider === 'simkl' && !(capabilities.hasSimkl ?? capabilities.simkl));
      const path = provider === 'simkl' && capabilities?.simklAuthMode === 'pin' ? '/configure' : config.auth;
      if (unavailable) link.removeAttribute('href');
      else link.href = `${select.value}${path}`;
      link.setAttribute('aria-disabled', String(unavailable));
    }
  };
  lifetime.on(select, 'change', refresh);
  lifetime.on(retry, 'click', refresh);
  lifetime.add(() => capabilityRequest?.abort());
  status.textContent = 'Puedes continuar sin conectar servicios.';
  return { select, ready: () => Boolean(capabilities), refresh };
}

const limitationText = code => ({
  premium_only: 'Simkl requiere PRO o VIP para compartir listas personalizadas. Puedes usar las listas por estado.',
  needs_v2: 'Vuelve a conectar Simkl para cargar listas personalizadas. Las listas por estado siguen disponibles.',
}[code] || (code ? 'No se pudieron cargar las listas propias. Reintenta para actualizarlas.' : ''));

function createConnectionActions({ state, client, lifetime, capabilities, synchronize }) {
  const requests = new Map();
  const lock = () => { capabilities.select.disabled = requests.size > 0 || Object.keys(state.connections.accounts).length > 0; };
  const verify = async card => {
    const provider = card.dataset.connectionProvider;
    const input = card.querySelector('input[type="password"]');
    const tokenId = input.value.trim() || state.connections.accounts[provider]?.tokenId;
    if (!capabilities.ready()) { connectionStatus(card, 'error', 'Primero comprueba la disponibilidad de la instancia.'); return; }
    requests.get(provider)?.abort();
    const request = new AbortController();
    requests.set(provider, request);
    lock();
    const instance = capabilities.select.value;
    const signal = AbortSignal.any([request.signal, lifetime.signal]);
    card.setAttribute('aria-busy', 'true');
    connectionStatus(card, '', 'Comprobando conexión y listas…');
    showConnectionWarning(card);
    try {
      const info = await client.verify(instance, provider, tokenId, signal);
      const account = { ...info, tokenId, selected: [], catalogs: [] };
      let result;
      try { result = await client.lists(instance, provider, account, signal); }
      catch { signal.throwIfAborted(); result = { lists: [], limitation: 'unavailable' }; }
      signal.throwIfAborted();
      account.catalogs = availableConnectionCatalogs(provider, result.lists, account.username);
      const previous = state.connections.accounts[provider];
      if (result.limitation && previous?.tokenId === tokenId) account.catalogs = previous.catalogs;
      if (previous?.tokenId === tokenId) account.selected = previous.selected.filter(key => account.catalogs.some(c => key === `${c.type}:${c.id}`));
      state.connections.accounts[provider] = account;
      state.connections.instance = instance;
      input.value = '';
      renderConnectionAccount(card, account);
      showConnectionWarning(card, limitationText(result.limitation));
      synchronize();
    } catch (error) {
      if (!signal.aborted) {
        const message = error.status ? 'No se pudo verificar la conexión. Comprueba el identificador y la instancia, o vuelve a autorizar.' : error.message;
        connectionStatus(card, 'error', `${message}${state.connections.accounts[provider] ? ' Se conserva la conexión anterior.' : ''}`);
      }
    } finally {
      if (requests.get(provider) === request) {
        requests.delete(provider); card.setAttribute('aria-busy', 'false'); lock();
        if (signal.aborted && !lifetime.signal.aborted) renderConnectionAccount(card, state.connections.accounts[provider]);
      }
    }
  };
  const remove = card => {
    requests.get(card.dataset.connectionProvider)?.abort();
    requests.delete(card.dataset.connectionProvider);
    delete state.connections.accounts[card.dataset.connectionProvider];
    if (!Object.keys(state.connections.accounts).length) state.connections.instance = null;
    card.querySelector('input[type="password"]').value = ''; renderConnectionAccount(card, null);
    showConnectionWarning(card);
    synchronize(); lock(); capabilities.refresh();
  };
  const cancel = card => { requests.get(card.dataset.connectionProvider)?.abort(); };
  const cancelAll = () => { requests.forEach(request => request.abort()); };
  lifetime.add(() => { requests.forEach(request => request.abort()); state.connections = { instance: null, accounts: {} }; });
  return { verify, remove, cancel, cancelAll };
}

export function mountConnections({ state, client, instances, updateUI, root = document }) {
  const view = root.querySelector('#connectionsStep');
  if (!view) return () => {};
  const lifetime = createLifetime();
  const cards = [...view.querySelectorAll('[data-connection-provider]')];
  const artwork = Object.fromEntries(Object.entries(connectionProviders).map(([provider, config]) => [provider, config.artwork]));
  cards.forEach(card => {
    composeConnectionCard(card, card.dataset.connectionProvider);
    lifetime.add(mountDisclosure(card.querySelector('details')));
  });
  const synchronize = () => {
    state.collections = synchronizeConnectionCollections(state.collections, state.connections, artwork);
    state.notify('COLLECTIONS_UPDATED');
    root.querySelector('#connectionsReview').hidden = !Object.values(state.connections.accounts).some(account => account.selected.length);
    updateUI();
  };
  const capabilities = mountCapabilities({ root, state, client, instances, lifetime });
  state.connectionsOpened = () => { if (!capabilities.ready()) capabilities.refresh(); };
  state.connections.artwork = artwork;
  lifetime.add(() => { delete state.connectionsOpened; });
  const actions = createConnectionActions({ root, state, client, lifetime, capabilities, synchronize });
  state.connectionsCancel = actions.cancelAll;
  lifetime.add(() => { delete state.connectionsCancel; });
  lifetime.on(view, 'submit', event => { event.preventDefault(); actions.verify(event.target.closest('[data-connection-provider]')); });
  lifetime.on(view, 'input', event => { if (event.target.type === 'password') actions.cancel(event.target.closest('[data-connection-provider]')); });
  lifetime.on(view, 'click', event => {
    if (event.target.closest('[data-connection-remove]')) actions.remove(event.target.closest('[data-connection-provider]'));
  });
  lifetime.on(view, 'change', event => {
    if (!event.target.matches('[data-connection-catalog]')) return;
    const card = event.target.closest('[data-connection-provider]');
    const account = state.connections.accounts[card.dataset.connectionProvider];
    account.selected = [...card.querySelectorAll('[data-connection-catalog]:checked')].map(input => {
      const catalog = account.catalogs[Number(input.dataset.connectionCatalog)];
      return `${catalog.type}:${catalog.id}`;
    });
    synchronize();
  });
  lifetime.on(root.querySelector('#connectionsReview'), 'click', () => {
    actions.cancelAll();
    state.connectionsStage = false; state.currentStep = 3; updateUI();
    root.querySelector('#step-3 h2')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  attachConnectionsNavigation({ root, state, lifetime, updateUI });
  return () => lifetime.dispose();
}
