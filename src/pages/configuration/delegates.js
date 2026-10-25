export function attachControllerDelegates(controller) {
  const pref = () => controller.preferencesStep;
  const prof = () => controller.profilesStep;
  const addons = () => controller.addonsStep;

  // Step 5 Preferences & Posters
  controller.selectPosterEngine = engine => pref()?.selectPosterEngine?.(engine);
  controller.toggleCustomUrlInput = engine => pref()?.toggleCustomUrlInput?.(engine);
  controller.renderBadgeModulesUI = () => pref()?.renderBadgeModulesUI?.();
  controller.toggleBadgeModule = (id, chk) => pref()?.toggleBadgeModule?.(id, chk);
  controller.moveBadgeModule = (id, delta) => pref()?.moveBadgeModule?.(id, delta);
  controller.selectBadgePack = id => pref()?.selectBadgePack?.(id);
  controller.copyBadgeJsonUrl = id => pref()?.copyBadgeJsonUrl?.(id);
  controller.getCompiledBadgeRulesJson = id => pref()?.getCompiledBadgeRulesJson?.(id);
  controller.copyCompiledBadgeJson = id => pref()?.copyCompiledBadgeJson?.(id);
  controller.downloadCompiledBadgeJson = id => pref()?.downloadCompiledBadgeJson?.(id);
  controller.handleImportCustomBadge = () => pref()?.handleImportCustomBadge?.();
  controller.renderBadgesGrid = () => pref()?.renderBadgesGrid?.();
  controller.handleBadgeImgLoaded = img => pref()?.handleBadgeImgLoaded?.(img);
  controller.fitBadgesDynamically = () => pref()?.fitBadgesDynamically?.();
  controller.updateStep5PosterPreviews = () => pref()?.updatePosterPreviews?.();
  controller.startPosterRotation = () => pref()?.startPosterRotation?.();
  controller.stopPosterRotation = () => pref()?.stopPosterRotation?.();
  controller.nextDemoPoster = () => pref()?.nextDemoPoster?.();
  controller.prevDemoPoster = () => pref()?.prevDemoPoster?.();
  controller.updatePosterCardsUI = () => pref()?.updateUI?.();
  controller.updatePreferencesUI = () => pref()?.updateUI?.();

  // Step 2 Profiles
  controller.openNewProfileModal = () => prof()?.openNewModal?.();
  controller.closeNewProfileModal = () => prof()?.closeNewModal?.();
  controller.promptDeleteProfile = (id, name) => prof()?.promptDelete?.(id, name);
  controller.renderProfiles = () => prof()?.render?.();
  controller.updateProfileWarning = (id, name) => prof()?.updateWarning?.(id, name);

  // Step 6 Addons
  controller.renderAddonsList = () => addons()?.render?.();
  controller.moveAddon = (idx, dir) => addons()?.moveAddon?.(idx, dir);
  controller.removeAddon = idx => addons()?.removeAddon?.(idx);
  controller.openAddAddonModal = url => addons()?.openAddModal?.(url);
  controller.closeAddAddonModal = () => addons()?.closeAddAddonModal?.();
  controller.openAioStreamsDebridsModal = () => addons()?.openAioStreamsDebridsModal?.();
  controller.closeAioStreamsDebridsModal = () => addons()?.closeAioStreamsDebridsModal?.();
  controller.validateDebridKeys = () => addons()?.validateDebridKeys?.();
  controller.installAioStreamsFromModal = () => addons()?.installAioStreamsFromModal?.();
}
