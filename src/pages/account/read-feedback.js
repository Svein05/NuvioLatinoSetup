const labels = { lines: 'Cargando configuración…', avatars: 'Cargando avatares…', addons: 'Cargando addons…', posters: 'Cargando actividad…', profiles: 'Cargando perfiles…' };
export function skeletonMarkup(shape = 'lines') {
  const count = shape === 'posters' ? 6 : shape === 'avatars' ? 8 : 3;
  return '<div class="account-skeleton-grid account-skeleton-' + shape + '" aria-hidden="true">'
    + Array.from({ length: count }, () => '<span class="account-skeleton"></span>').join('') + '</div>';
}
/** Read feedback never changes domain data, drafts or remote profiles. */
export function renderReadFeedback(container, { loading, error, shape = 'lines', retry } = {}) {
  if (!container) return false;
  container.setAttribute('aria-busy', String(Boolean(loading)));
  if (!loading && !error) return false;
  container.replaceChildren();
  const status = container.ownerDocument.createElement('div');
  status.className = 'account-read-status';
  status.setAttribute('role', loading ? 'status' : 'alert');
  status.textContent = loading ? labels[shape] : error;
  container.append(status);
  if (loading) container.insertAdjacentHTML('beforeend', skeletonMarkup(shape));
  else if (retry) {
    const button = container.ownerDocument.createElement('button');
    button.type = 'button'; button.className = 'lat-capsule-btn glass account-read-retry'; button.textContent = 'Reintentar';
    button.addEventListener('click', retry, { once: true }); container.append(button);
  }
  return true;
}
export function renderOverviewPending(root, loading) {
  let announcement = root.getElementById('accountReadAnnouncement');
  if (loading && !announcement) {
    announcement = root.createElement('div'); announcement.id = 'accountReadAnnouncement';
    announcement.className = 'sr-only'; announcement.setAttribute('role', 'status');
    root.getElementById('accountDashboardView')?.prepend(announcement);
  }
  const message = loading ? 'Cargando datos del perfil…' : '';
  if (announcement && announcement.textContent !== message) announcement.textContent = message;
  root.getElementById('sectionPane-overview')?.setAttribute('aria-busy', String(loading));
  for (const id of ['metricPluginsCount', 'metricAddonsCount', 'metricProgressCount', 'metricLibraryCount', 'metricWatchedCount']) {
    const metric = root.getElementById(id);
    if (metric) { metric.classList.toggle('account-metric-pending', loading); if (loading) metric.textContent = ''; }
  }
  if (!loading) return;
  root.getElementById('overviewCinemaContainer')?.classList.remove('hidden');
  root.getElementById('overviewTmdbNotice')?.classList.add('hidden');
  for (const id of ['rowCurrentlyWatchingCards', 'rowRecentlyWatchedCards']) renderReadFeedback(root.getElementById(id), { loading, shape: 'posters' });
}
