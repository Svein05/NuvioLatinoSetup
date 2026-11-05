import { escapeHtml } from '../../../shared/ui/safe-markup.js';

export const categoryLabels = { addons: 'Addons', library: 'Biblioteca', watched: 'Vistos', progress: 'Progreso' };

const categories = {
  library: { icon: 'bookmark', description: 'Películas y series guardadas.' },
  watched: { icon: 'circle-check', description: 'Contenido que ya viste.' },
  progress: { icon: 'play', description: 'Continúa donde te quedaste.' },
};

export function renderMigrationReview(modal, snapshot) {
  modal.querySelector('[data-migration-categories]').innerHTML = Object.entries(categoryLabels).filter(([key]) => key !== 'addons').map(([key, label]) => {
    const count = snapshot[key].length;
    return `<label class="migration-category${count ? '' : ' is-empty'}"><input type="checkbox" data-migration-category="${key}" ${snapshot.selected[key] && count ? 'checked' : ''} ${count ? '' : 'disabled'}>
      <i class="fa-solid fa-${categories[key].icon} migration-category-icon" aria-hidden="true"></i>
      <span class="migration-category-copy"><span class="migration-category-title">${label}<span class="migration-count">${count}</span></span><span class="migration-description">${categories[key].description}</span></span></label>`;
  }).join('');
  const toggle = modal.querySelector('[data-migration-category="addons"]');
  toggle.checked = snapshot.selected.addons && Boolean(snapshot.addons.length);
  toggle.disabled = !snapshot.addons.length;
  modal.querySelector('[data-migration-addons]').innerHTML = snapshot.addons.map((addon, index) =>
    `<label class="migration-addon"><input type="checkbox" data-migration-addon="${index}" ${addon.selected ? 'checked' : ''}><span class="migration-addon-logo"><i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>${addon.logo ? `<img data-migration-logo src="${escapeHtml(addon.logo)}" alt="" width="32" height="32" referrerpolicy="no-referrer" loading="lazy">` : ''}</span><span>${escapeHtml(addon.name)}</span></label>`).join('');
  modal.querySelector('[data-migration-omissions]').hidden = !snapshot.omitted.length;
  modal.querySelector('[data-migration-omitted-count]').textContent = `(${snapshot.omitted.length})`;
  modal.querySelector('[data-migration-omitted]').innerHTML = snapshot.omitted.map(item =>
    `<li>${escapeHtml(item.title)} — ${escapeHtml(item.reason)}</li>`).join('');
}

export function synchronizeMigrationSelection(flow, state) {
  const addonsEnabled = flow.querySelector('[data-migration-category="addons"]')?.checked;
  const panel = flow.querySelector('#migrationAddonOptions');
  panel.classList.toggle('is-open', addonsEnabled);
  panel.inert = !addonsEnabled;
  flow.querySelector('[data-migration-category="addons"]').setAttribute('aria-expanded', String(Boolean(addonsEnabled)));
  flow.querySelector('[data-migration-addons]').disabled = !addonsEnabled;
  const count = flow.querySelectorAll('[data-migration-addon]:checked').length;
  flow.querySelector('[data-migration-addon-count]').textContent = addonsEnabled ? `${count} seleccionados` : 'Desactivado';
  const other = [...flow.querySelectorAll('[data-migration-category]:checked')].some(input => input.dataset.migrationCategory !== 'addons');
  state.migrationSelectionReady = other || Boolean(addonsEnabled && count);
  flow.querySelector('[data-migration-selection-error]').classList.toggle('hidden', state.migrationSelectionReady);
}

export function renderMigrationSummary(container, state) {
  const snapshot = state.migration;
  container.hidden = !snapshot;
  if (!snapshot) return;
  const target = state.selectedProfileName || 'Por elegir';
  const rows = Object.entries(categoryLabels).filter(([key]) => snapshot.selected[key]).map(([key, label]) => {
    const count = key === 'addons' ? snapshot.addons.filter(addon => addon.selected).length : snapshot[key].length;
    const result = !snapshot.targetProfile || snapshot.targetProfile === String(state.selectedProfileId) ? snapshot.results[key] : null;
    const status = result?.status === 'confirmed' ? 'Confirmado' : result?.status === 'uncertain' ? 'Pendiente de verificación'
      : result?.status === 'failed' ? 'Pendiente de reintento' : result?.status === 'writing' ? 'Guardando'
        : result?.status === 'reading' ? 'Comprobando destino' : 'Preparado';
    return `<li>${label} · ${count} · ${status}</li>`;
  }).join('');
  container.innerHTML = `<h3 class="font-semibold">Importación de Stremio</h3><p class="mt-1">Perfil destino: ${escapeHtml(target)}</p><ul class="mt-2 space-y-1">${rows}</ul><p class="mt-2 text-white/60">Se conservarán los datos que ya existen en Nuvio.</p>`;
}
