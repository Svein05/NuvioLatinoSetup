import { escapeHtml } from '../../../shared/ui/safe-markup.js';

export const categoryLabels = { addons: 'Addons', library: 'Biblioteca', watched: 'Vistos', progress: 'Progreso' };

export function renderMigrationReview(modal, snapshot) {
  modal.querySelector('[data-migration-categories]').innerHTML = Object.entries(categoryLabels).map(([key, label]) =>
    `<label class="migration-choice"><input type="checkbox" data-migration-category="${key}" ${snapshot.selected[key] && snapshot[key].length ? 'checked' : ''} ${snapshot[key].length ? '' : 'disabled'}><span>${label} · ${snapshot[key].length}</span></label>`).join('');
  modal.querySelector('[data-migration-addons]').innerHTML = snapshot.addons.map((addon, index) =>
    `<label class="migration-choice text-sm"><input type="checkbox" data-migration-addon="${index}" ${addon.selected ? 'checked' : ''}><span>${escapeHtml(addon.name)}</span></label>`).join('');
  modal.querySelector('[data-migration-omitted-count]').textContent = `(${snapshot.omitted.length})`;
  modal.querySelector('[data-migration-omitted]').innerHTML = snapshot.omitted.map(item =>
    `<li>${escapeHtml(item.title)} — ${escapeHtml(item.reason)}</li>`).join('');
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
