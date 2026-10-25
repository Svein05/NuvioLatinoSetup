import { createLifetime } from '../../../shared/ui/lifetime.js';
import { renderToggleLabel, renderPosterCardsUI } from './preferences-view.js';
import { createPostersCarousel } from './posters-demo.js';
import { mountBadgesStep } from './badges.js';
import { mountBadgesDisclosure } from './badges-disclosure.js';

function bindToggleEvents({ lifetime, elements, state, actions, updateToggles }) {
  const { toggleEnrichment, toggleRatings, toggleBadges, labelEnrichment, labelRatings } = elements;
  if (toggleEnrichment) {
    lifetime.on(toggleEnrichment, 'change', e => {
      state.preferences.tmdbEnrichment = e.target.checked;
      renderToggleLabel(toggleEnrichment, labelEnrichment);
      actions.onUpdate?.();
    });
  }
  if (toggleRatings) {
    lifetime.on(toggleRatings, 'change', e => {
      state.preferences.mdblistRatings = e.target.checked;
      renderToggleLabel(toggleRatings, labelRatings);
      actions.onUpdate?.();
    });
  }
  if (toggleBadges) {
    lifetime.on(toggleBadges, 'change', e => {
      state.preferences.badgesEnabled = e.target.checked;
      updateToggles();
      actions.onUpdate?.();
    });
  }
}

function bindCustomUrlEvents({ lifetime, elements, state, carousel }) {
  const { customBetterInput, customPlusInput } = elements;
  if (customBetterInput) {
    lifetime.on(customBetterInput, 'input', e => {
      if (state.preferences.posterEngine === 'betterposter') state.preferences.customPosterUrl = e.target.value.trim();
      carousel.updatePreviews();
    });
  }
  if (customPlusInput) {
    lifetime.on(customPlusInput, 'input', e => {
      if (state.preferences.posterEngine === 'postersplus') state.preferences.customPosterUrl = e.target.value.trim();
      carousel.updatePreviews();
    });
  }
}

function selectPosterEngineMode(engine, { state, elements, root, actions }) {
  state.preferences.posterEngine = engine;
  if (engine === 'default') state.preferences.customPosterUrl = '';
  else if (engine === 'betterposter' && elements.customBetterInput) state.preferences.customPosterUrl = elements.customBetterInput.value.trim();
  else if (engine === 'postersplus' && elements.customPlusInput) state.preferences.customPosterUrl = elements.customPlusInput.value.trim();
  renderPosterCardsUI(root, engine);
  actions.onUpdate?.();
}

function queryPreferenceElements(root) {
  return {
    toggleEnrichment: root.querySelector?.('#toggleTmdbEnrichment'),
    toggleRatings: root.querySelector?.('#toggleMdblistRatings'),
    labelEnrichment: root.querySelector?.('#labelTmdbEnrichment'),
    labelRatings: root.querySelector?.('#labelMdblistRatings'),
    toggleBadges: root.querySelector?.('#toggleBadgesCustomization'),
    labelBadges: root.querySelector?.('#labelBadgesCustomization'),
    customBetterInput: root.querySelector?.('#customUrlBetterposter'),
    customPlusInput: root.querySelector?.('#customUrlPostersplus'),
  };
}

function syncToggles(elements, state) {
  if (elements.toggleEnrichment) {
    elements.toggleEnrichment.checked = Boolean(state.preferences.tmdbEnrichment);
    renderToggleLabel(elements.toggleEnrichment, elements.labelEnrichment);
  }
  if (elements.toggleRatings) {
    elements.toggleRatings.checked = Boolean(state.preferences.mdblistRatings);
    renderToggleLabel(elements.toggleRatings, elements.labelRatings);
  }
  const isBadgesEnabled = Boolean(state.preferences.badgesEnabled);
  if (elements.toggleBadges) {
    elements.toggleBadges.checked = isBadgesEnabled;
    renderToggleLabel(elements.toggleBadges, elements.labelBadges);
  }
}

export function mountPreferencesStep({ state, actions, root = document } = {}) {
  const lifetime = createLifetime();
  const elements = queryPreferenceElements(root);
  const carousel = createPostersCarousel({
    getKeys: () => state.apiKeys,
    getCustomUrls: () => ({ better: elements.customBetterInput?.value?.trim() || '', plus: elements.customPlusInput?.value?.trim() || '' }),
    root,
  });
  lifetime.add(() => carousel.dispose());
  let disclosure;
  const badges = mountBadgesStep({ state, actions, root, onSelected: () => disclosure?.selected() });
  disclosure = mountBadgesDisclosure({ root, state, lifetime, render: () => badges.render(), fit: () => badges.fit() });
  lifetime.add(() => badges.dispose());

  const updateToggles = () => { syncToggles(elements, state); disclosure.sync(); };
  bindToggleEvents({ lifetime, elements, state, actions, updateToggles });
  bindCustomUrlEvents({ lifetime, elements, state, carousel });
  updateToggles();
  renderPosterCardsUI(root, state.preferences?.posterEngine || 'default');

  return {
    updateUI: () => { updateToggles(); renderPosterCardsUI(root, state.preferences?.posterEngine || 'default'); carousel.updatePreviews(); actions.onUpdate?.(); },
    selectPosterEngine: engine => selectPosterEngineMode(engine, { state, elements, root, actions }),
    toggleCustomUrlInput: engine => {
      const container = root.querySelector?.(`#customUrlContainer-${engine}`);
      container?.classList.toggle('hidden');
      if (!container?.classList.contains('hidden')) container?.querySelector('input')?.focus();
    },
    startPosterRotation: () => carousel.start(), stopPosterRotation: () => carousel.stop(),
    nextDemoPoster: () => carousel.next(), prevDemoPoster: () => carousel.prev(),
    updatePosterPreviews: () => carousel.updatePreviews(),
    selectBadgePack: id => badges.selectPack(id), toggleBadgeModule: (id, chk) => badges.toggleModule(id, chk),
    moveBadgeModule: (id, delta) => badges.moveModule(id, delta), copyBadgeJsonUrl: id => badges.copyJsonUrl(id),
    getCompiledBadgeRulesJson: id => badges.getCompiledJson(id), copyCompiledBadgeJson: id => badges.copyCompiledJson(id),
    downloadCompiledBadgeJson: id => badges.downloadCompiledJson(id), handleImportCustomBadge: () => badges.handleImport(),
    handleBadgeImgLoaded: () => badges.handleImgLoaded(), fitBadgesDynamically: () => badges.fit(),
    renderBadgeModulesUI: () => badges.render(), renderBadgesGrid: () => badges.render(),
    dispose: () => lifetime.dispose(),
  };
}
