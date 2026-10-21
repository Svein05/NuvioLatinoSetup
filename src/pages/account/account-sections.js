import { createAccountMetadata } from './sections/metadata-controller.js';
import { createAccountAvatars } from './sections/avatar-controller.js';
import { createAccountAddons } from './sections/addons-controller.js';
import { renderSettingsSection } from './sections/settings.js';
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
  function render() {
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
    presentOverview: () => services.presentOverview?.({ data: state.overviewData,
      settings: state.settings, addonsCount: state.installedAddons.length, isCurrent: () => true }),
  };
}
