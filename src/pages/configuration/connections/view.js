import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { connectionProviders } from '../../../features/connections/index.js';

export function composeConnectionCard(card, provider) {
  const config = connectionProviders[provider];
  card.insertAdjacentHTML('beforeend', `<p class="text-xs text-white/60">${config.description}</p>
    <p class="connection-status" role="status" data-connection-status>Sin conectar</p>
    <form class="connection-form" data-connection-form>
      <div class="connection-actions"><a data-connection-authorize class="lat-capsule-btn glass text-xs" target="_blank" rel="noopener noreferrer">Conectar ${config.name} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></div>
      <label for="connection-${provider}" class="lat-label">Identificador de conexión</label>
      <input id="connection-${provider}" class="lat-field text-sm" type="password" autocomplete="off" spellcheck="false" placeholder="Pega el identificador de AIOMetadata" aria-describedby="connection-help-${provider}" required maxlength="512">
      <p id="connection-help-${provider}" class="text-xs text-white/50">Autoriza en la pestaña que se abre, copia el identificador y vuelve aquí.</p>
      <div class="connection-actions"><button type="submit" class="lat-capsule-btn solid text-xs" data-connection-check>Comprobar conexión</button><button type="button" class="lat-capsule-btn glass text-xs" data-connection-remove hidden>Quitar conexión</button></div>
    </form>
    <p class="text-xs text-white/50" data-connection-warning hidden></p>
    <details class="connection-options" data-connection-options hidden>
      <summary><span>Elegir listas</span><i class="fa-solid fa-chevron-down disclosure-icon text-xs" aria-hidden="true"></i></summary>
      <div class="disclosure-panel"><div class="disclosure-content"><fieldset class="connection-catalogs" aria-label="Listas de ${config.name}"></fieldset></div></div>
    </details>`);
}

export function connectionStatus(card, state, message) {
  const status = card.querySelector('[data-connection-status]');
  status.dataset.state = state;
  status.textContent = message;
}

export function renderConnectionAccount(card, account) {
  const fieldset = card.querySelector('fieldset');
  fieldset.innerHTML = (account?.catalogs || []).map((catalog, index) => {
    const key = `${catalog.type}:${catalog.id}`;
    const type = { movie: 'Películas', series: 'Series', anime: 'Anime', all: 'Películas y series' }[catalog.type];
    return `<label class="connection-catalog"><input type="checkbox" data-connection-catalog="${index}" ${account.selected.includes(key) ? 'checked' : ''}><span>${escapeHtml(catalog.name)}<small class="block text-white/50 mt-1">${type}</small></span></label>`;
  }).join('');
  card.querySelector('[data-connection-options]').hidden = !account?.catalogs.length;
  card.querySelector('[data-connection-remove]').hidden = !account;
  card.querySelector('input[type="password"]').required = !account;
  card.querySelector('[data-connection-check]').textContent = account ? 'Comprobar y actualizar listas' : 'Comprobar conexión';
  connectionStatus(card, account ? 'connected' : '', account ? `Conectado como ${account.username}` : 'Sin conectar');
}

export function showConnectionWarning(card, message = '') {
  const node = card.querySelector('[data-connection-warning]');
  node.textContent = message;
  node.hidden = !message;
}
