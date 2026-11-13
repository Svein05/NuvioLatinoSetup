import { isDemoSetup, DEMO_LOCK_MESSAGE } from '../../../shared/demo/setup.js';
import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { mountStremioInstructions } from './instructions.js';
import { installedCatalogBlocks } from '../../../features/stremio-setup/index.js';

export function mountStremioFinish({ state, root, lifetime, execute }) {
  const view = root.querySelector('#stremioFinishStep');
  const password = view.querySelector('#stremioAddonPassword');
  const button = view.querySelector('[data-stremio-execute]');
  const status = view.querySelector('[data-stremio-final-status]');
  const eye = view.querySelector('[data-stremio-final-eye]');
  const render = () => {
    const blocked = isDemoSetup(state);
    button.disabled = blocked || Boolean(state.stremio.running) || state.stremio.completed;
    password.disabled = Boolean(state.stremio.running || state.stremio.pendingWrite);
    view.querySelector('[data-stremio-generate]').disabled = password.disabled;
    if (!state.stremio.running) button.innerHTML = `${blocked ? '<i class="fa-solid fa-lock" aria-hidden="true"></i> ' : ''}${state.stremio.completed ? 'Configuración aplicada' : state.stremio.pendingWrite ? 'Comprobar guardado anterior' : 'Aplicar configuración en Stremio'}`;
    if (blocked) { status.textContent = DEMO_LOCK_MESSAGE; status.className = 'text-sm text-amber-200'; }
    if (!password.value && state.aiometadata.password) password.value = state.aiometadata.password;
    const values = [
      ['Cuenta', state.stremio.session?.email || 'Sin conectar'],
      ['Catálogos', String((state.stremio.selected?.length || 0) + installedCatalogBlocks(state).reduce((total, block) => total + block.catalogs.length, 0))],
      ['Metadatos', 'Español latino'],
      ['Pósters', state.preferences.posterEngine === 'default' ? 'AIOMetadata' : state.preferences.posterEngine === 'betterposter' ? 'BetterPoster' : 'Poster+'],
      ['Addons', `AIOMetadata + ${state.profileAddons.length}`],
      ['Conexiones', Object.keys(state.connections.accounts).join(', ') || 'Ninguna'],
    ];
    view.querySelector('[data-stremio-summary]').innerHTML = values.map(([title, value]) => `<div><dt>${escapeHtml(title)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  };
  lifetime.on(password, 'input', () => { state.aiometadata.password = password.value.trim(); });
  lifetime.on(eye, 'click', () => {
    password.type = password.type === 'password' ? 'text' : 'password';
    eye.setAttribute('aria-label', password.type === 'text' ? 'Ocultar contraseña' : 'Mostrar contraseña');
    eye.setAttribute('aria-pressed', String(password.type === 'text'));
  });
  lifetime.on(view.querySelector('[data-stremio-generate]'), 'click', () => {
    password.value = `Latino-${crypto.randomUUID()}`; state.aiometadata.password = password.value;
  });
  lifetime.on(button, 'click', async () => {
    if (state.stremio.running || state.stremio.completed || isDemoSetup(state)) return;
    state.aiometadata.password = password.value.trim();
    state.stremio.running = true;
    state.platformNavigation.renderButtons();
    button.disabled = true;
    password.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Configurando Stremio…';
    status.className = 'text-sm text-white/70';
    try {
      await execute(message => { status.textContent = message; });
      status.className = 'text-sm text-emerald-400';
    } catch (error) { status.textContent = error.message; status.className = 'text-sm text-red-300'; }
    finally { state.stremio.running = false; password.disabled = false; state.platformNavigation.renderButtons(); render(); }
  });
  mountStremioInstructions({ root, lifetime, opener: view.querySelector('[data-stremio-instructions]') });
  lifetime.add(() => { password.value = ''; });
  return { render };
}
