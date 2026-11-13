import { connectionTrackingControl, renderConnectionTracking } from './tracking.js';
import { connectionProviders } from '../../../features/connections/index.js';

export function composeConnectionCard(card, provider) {
  const config = connectionProviders[provider];
  card.querySelector('header').insertAdjacentHTML('beforeend', '<p class="connection-status" role="status" data-connection-status>Sin conectar</p>');
  card.insertAdjacentHTML('beforeend', `<p class="text-xs text-white/60">${config.description}</p>
<div class="connection-account" data-connection-account hidden><span data-connection-username></span><button type="button" class="lat-capsule-btn glass" data-connection-edit aria-expanded="false" aria-controls="connection-credentials-${provider}">Cambiar conexión</button></div>
    <form class="connection-form" data-connection-form>
      <div class="connection-credentials" data-connection-credentials id="connection-credentials-${provider}"><div class="connection-authorize"><a data-connection-authorize class="lat-capsule-btn glass text-xs" target="_blank" rel="noopener noreferrer">Conectar ${config.name} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></div>
      <div class="connection-token"><label for="connection-${provider}" class="sr-only">Identificador de conexión</label>
      <div class="relative"><input data-connection-input id="connection-${provider}" class="lat-field text-sm pr-12" type="password" autocomplete="off" spellcheck="false" placeholder="Identificador de conexión" aria-describedby="connection-help-${provider}" required maxlength="512"><button type="button" data-connection-visibility aria-label="Mostrar identificador" aria-pressed="false" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 text-white/50"><i class="fa-solid fa-eye" aria-hidden="true"></i></button></div>
      </div></div><p id="connection-help-${provider}" data-connection-help class="text-xs text-white/50">Autoriza tu cuenta y pega el identificador que recibas.</p>
      <div class="connection-actions connection-submit"><button type="submit" class="lat-capsule-btn solid text-xs" data-connection-check>Comprobar conexión</button><button type="button" class="lat-capsule-btn glass text-xs connection-remove" data-connection-remove hidden><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Quitar conexión</span></button></div>
    </form>
    <p class="text-xs text-white/50" data-connection-warning hidden></p>
    ${connectionTrackingControl(provider)}
    <button type="button" class="lat-capsule-btn glass text-xs" data-connection-manage hidden>Administrar listas</button>`);
}

export function connectionStatus(card, state, message) {
  const status = card.querySelector('[data-connection-status]');
  status.dataset.state = state;
  status.textContent = message;
}

export function renderConnectionAccount(card, account) {
  card.dataset.connected = String(Boolean(account));
  renderConnectionTracking(card, account);
  card.querySelector('[data-connection-account]').hidden = !account;
  card.querySelector('[data-connection-username]').textContent = account ? `${account.username}${account.demo ? ' · Demostración' : ''}` : '';
  renderCredentialVisibility(card);
  const manage = card.querySelector('[data-connection-manage]');
  manage.hidden = !account?.catalogs.length;
  manage.textContent = 'Administrar listas' + (account ? ' · ' + account.selected.length + ' seleccionadas' : '');
  card.querySelector('[data-connection-remove]').hidden = !account;
  card.querySelector('[data-connection-input]').required = !account;
  card.querySelector('[data-connection-check]').dataset.connected = String(Boolean(account));
  renderConnectionBusy(card, card.getAttribute('aria-busy') === 'true');
  connectionStatus(card, account ? 'connected' : '', account ? 'Conectado' : 'Sin conectar');
}

export function renderConnectionBusy(card, busy) {
  card.setAttribute('aria-busy', String(busy));
  const button = card.querySelector('[data-connection-check]');
  button.disabled = busy;
  button.innerHTML = busy ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Comprobando…</span>'
    : button.dataset.connected === 'true' ? 'Actualizar listas' : 'Comprobar conexión';
}

export function showConnectionWarning(card, message = '') {
  const node = card.querySelector('[data-connection-warning]');
  node.textContent = message;
  node.hidden = !message;
}

export function toggleConnectionSecret(card) {
  const input = card.querySelector('[data-connection-input]');
  const button = card.querySelector('[data-connection-visibility]');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-label', visible ? 'Ocultar identificador' : 'Mostrar identificador');
  button.setAttribute('aria-pressed', String(visible));
  button.querySelector('i').className = visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
}

function renderCredentialVisibility(card) {
  const visible = card.dataset.connected !== 'true' || card.dataset.editing === 'true';
  const credentials = card.querySelector('[data-connection-credentials]');
  if (!visible && credentials.contains(card.ownerDocument.activeElement)) card.querySelector('[data-connection-edit]').focus({ preventScroll: true });
  credentials.hidden = !visible;
  card.querySelector('[data-connection-help]').hidden = !visible;
  const button = card.querySelector('[data-connection-edit]');
  button.setAttribute('aria-expanded', String(visible && card.dataset.connected === 'true'));
  button.innerHTML = `<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i><span>${card.dataset.editing === 'true' ? 'Ocultar campo' : 'Cambiar conexión'}</span>`;
}

export function toggleConnectionEditor(card) {
  card.dataset.editing = String(card.dataset.editing !== 'true');
  renderCredentialVisibility(card);
  if (card.dataset.editing === 'true') card.querySelector('[data-connection-input]').focus();
}
