import { renderReadFeedback } from './read-feedback.js';
export function showProfilesFeedback(root, { loading = false, error = '', empty = false, retry } = {}) {
  const dashboard = root.getElementById('accountDashboardView');
  if (!dashboard) return;
  root.getElementById('btnAccountProfileTrigger')?.setAttribute('aria-busy', String(loading));
  let status = root.getElementById('accountProfilesStatus');
  if (loading) { if (status) status.hidden = true; return; }
  if (!status) {
    status = root.createElement('div'); status.id = 'accountProfilesStatus'; dashboard.prepend(status);
  }
  status.hidden = !loading && !error && !empty;
  renderReadFeedback(status, { loading, error, retry, shape: 'profiles' });
  if (empty) { status.textContent = 'No tienes perfiles en esta cuenta. Crea uno desde el selector de perfiles.'; status.setAttribute('role', 'status'); }
}
