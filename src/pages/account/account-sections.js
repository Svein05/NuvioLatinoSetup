import { createAccountMetadata } from './sections/metadata-controller.js';
import { createAccountAvatars } from './sections/avatar-controller.js';
import { createAccountAddons } from './sections/addons-controller.js';
import { renderSettingsSection } from './sections/settings.js';
import { renderReadFeedback, renderOverviewPending } from './read-feedback.js';
import { createAccountProfileLoader } from './account-profile.js';

export function createAccountSections(context) {
  const { root, state, services, updateUI } = context;
  const metadata = createAccountMetadata(context);
  const avatars = createAccountAvatars(context);
  const settings = () => renderSettingsSection(state, {
    root, setupPasswordToggles: context.setupPasswordToggles,
    onDirty: dirty => { state.dirty.settings = dirty; updateUI(); },
  });
  const addons = createAccountAddons({ ...context, reload: () => loader.load(state.selectedProfileId) });
  const retry = () => {
    if (Object.values(state.dirty).some(Boolean)) { context.notify('Guarda o deshaz tus cambios antes de recargar.', 'warning'); return; }
    void loader.load(state.selectedProfileId).catch(error => context.notify(error.message, 'warning'));
  };
  function render() {
    renderOverviewPending(root, Boolean(state.isLoadingProfile));
    const targets = { addons: ['accountAddonsListContainer', 'addons', state.loadErrors?.addons],
      aiometadata: ['accountAioCard', 'lines', state.loadErrors?.addons],
      settings: ['accountSettingsContainer', 'lines', state.loadErrors?.settings || state.loadErrors?.credentials] };
    const target = targets[state.activeSection];
    if (state.isLoadingProfile) {
      const count = root.getElementById('accountAddonsCountLabel');
      if (count) count.textContent = 'Cargando addons…';
    }
    if (target && renderReadFeedback(root.getElementById(target[0]), { loading: state.isLoadingProfile,
      error: !state.isLoadingProfile && target[2] ? 'No se pudieron cargar los datos de esta sección.' : '', shape: target[1], retry })) { updateUI(); return; }
    if (state.loadErrors?.overview && !state.isLoadingProfile) {
      root.getElementById('overviewCinemaContainer')?.classList.remove('hidden');
      root.querySelectorAll('#sectionPane-overview [id^=metric]').forEach(metric => { metric.textContent = '—'; });
      for (const id of ['rowCurrentlyWatchingCards', 'rowRecentlyWatchedCards']) renderReadFeedback(root.getElementById(id), { error: 'No se pudo cargar la actividad del perfil.', retry });
    }
    if (state.activeSection === 'avatars') avatars.render();
    if (state.activeSection === 'settings') settings();
    if (state.activeSection === 'aiometadata') metadata.render();
    if (state.activeSection === 'addons') addons.render();
    updateUI();
  }
  const loader = createAccountProfileLoader({ ...context, metadata, render });
  return {
    render, settings, metadata, avatars, addons, load: loader.load,
    cancel: loader.cancel,
    presentOverview: () => {
      const profile = state.selectedProfileId, session = state.session;
      return services.presentOverview?.({ data: state.overviewData, settings: state.settings, addonsCount: state.installedAddons.length,
        isCurrent: () => profile === state.selectedProfileId && session === state.session });
    },
  };
}
