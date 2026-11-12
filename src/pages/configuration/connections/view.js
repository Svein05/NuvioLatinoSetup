import { connectionProviders } from '../../../features/connections/index.js';

export function composeConnectionCard(card, provider) {
  const config = connectionProviders[provider];
  card.insertAdjacentHTML('beforeend', `<p class="text-xs text-white/60">${config.description}</p>
    <p class="connection-status" role="status" data-connection-status>Sin conectar</p>
    <form class="connection-form" data-connection-form>
      <div class="connection-actions"><a data-connection-authorize class="lat-capsule-btn glass text-xs" target="_blank" rel="noopener noreferrer">Conectar ${config.name} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></div>
      <label for="connection-${provider}" class="lat-label">Identificador de conexión</label>
      <div class="relative"><input data-connection-input id="connection-${provider}" class="lat-field text-sm pr-12" type="password" autocomplete="off" spellcheck="false" placeholder="Pega el identificador de AIOMetadata" aria-describedby="connection-help-${provider}" required maxlength="512"><button type="button" data-connection-visibility aria-label="Mostrar identificador" aria-pressed="false" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 text-white/50"><i class="fa-solid fa-eye" aria-hidden="true"></i></button></div>
      <p id="connection-help-${provider}" class="text-xs text-white/50">Autoriza en la pestaña que se abre, copia el identificador y vuelve aquí.</p>
      <div class="connection-actions"><button type="submit" class="lat-capsule-btn solid text-xs" data-connection-check>Comprobar conexión</button><button type="button" class="lat-capsule-btn glass text-xs" data-connection-remove hidden>Quitar conexión</button></div>
    </form>
    <p class="text-xs text-white/50" data-connection-warning hidden></p>
    <button type="button" class="lat-capsule-btn glass text-xs" data-connection-manage hidden>Administrar listas</button>`);
}

export function connectionStatus(card, state, message) {
  const status = card.querySelector('[data-connection-status]');
  status.dataset.state = state;
  status.textContent = message;
}

export function renderConnectionAccount(card, account) {
  const manage = card.querySelector('[data-connection-manage]');
  manage.hidden = !account?.catalogs.length;
  manage.textContent = 'Administrar listas' + (account ? ' · ' + account.selected.length + ' seleccionadas' : '');
  card.querySelector('[data-connection-remove]').hidden = !account;
  card.querySelector('[data-connection-input]').required = !account;
  card.querySelector('[data-connection-check]').textContent = account ? 'Comprobar y actualizar listas' : 'Comprobar conexión';
  connectionStatus(card, account ? 'connected' : '', account ? `Conectado como ${account.username}${account.demo ? ' · Demostración' : ''}` : 'Sin conectar');
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
