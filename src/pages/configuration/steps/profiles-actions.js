import { isAioMetadataAddon } from '../../../features/addons/index.js';
import { recordCreatedProfileAvatar } from '../../../workflows/record-created-profile-avatar.js';

async function executeProfileCreation({ state, client, config, sync, name, avatarUrl, recordAvatarUsage }) {
  const accessToken = state.nuvioAuth.accessToken;
  const newProfile = await client.createProfile({
    apiUrl: config.apiUrl,
    apikey: state.nuvioAuth.apikey || config.anonKey,
    accessToken,
    userId: state.nuvioAuth.userId,
    name,
    avatarUrl: avatarUrl || null,
  });
  recordCreatedProfileAvatar({ profile: newProfile, avatarUrl, accessToken, recordUsage: recordAvatarUsage });
  state.newlyCreatedProfileIds.add(String(newProfile.id));
  state.profiles.push(newProfile);
  state.selectedProfileId = newProfile.id;
  state.selectedProfileName = newProfile.name || name;
  state.unlockStep(3);
  sync();
  return newProfile;
}

function updateStateAfterDeletion(state, profileId, remaining) {
  state.profiles = remaining;
  if (String(state.selectedProfileId) === String(profileId)) {
    if (state.profiles.length > 0) {
      state.selectedProfileId = state.profiles[0].id;
      state.selectedProfileName = state.profiles[0].name || state.profiles[0].title || 'Principal';
      state.unlockStep(3);
    } else {
      state.selectedProfileId = null;
      state.selectedProfileName = '';
    }
  }
}

async function executeProfileDeletion({ state, client, config, sync, profileId }) {
  const result = await client.deleteProfile({
    apiUrl: config.apiUrl,
    apikey: state.nuvioAuth.apikey || config.anonKey,
    accessToken: state.nuvioAuth.accessToken,
    userId: state.nuvioAuth.userId,
    profileId,
  });
  const remaining = Array.isArray(result?.remainingProfiles)
    ? result.remainingProfiles
    : (state.profiles || []).filter(p => String(p.id) !== String(profileId));
  updateStateAfterDeletion(state, profileId, remaining);
  sync();
  return result;
}

async function checkProfileAioStatus({ state, client, config, profileId }) {
  if (state.hasLoadedAddonsForProfile === profileId && state.existingAioAddon) return true;
  if (!state.nuvioAuth?.accessToken) return false;
  const addons = await client.listAddons({
    apiUrl: config.apiUrl,
    apikey: state.nuvioAuth.apikey || config.anonKey,
    accessToken: state.nuvioAuth.accessToken,
    userId: state.nuvioAuth.userId,
    profileId,
  });
  const hasAio = (addons || []).some(addon => isAioMetadataAddon(addon));
  if (String(state.selectedProfileId) === String(profileId) && state.hasLoadedAddonsForProfile !== profileId) {
    state.setProfileAddons(addons, profileId);
  }
  return hasAio;
}

export function createProfilesStepActions({
  state,
  client,
  config,
  notify,
  saveSession,
  updateUI,
  avatarCatalog,
  recordAvatarUsage,
}) {
  const sync = () => { saveSession?.(); updateUI?.(); };
  return {
    createProfile: ({ name, avatarUrl }) => executeProfileCreation({ state, client, config, sync, name, avatarUrl, recordAvatarUsage }),
    deleteProfile: profileId => executeProfileDeletion({ state, client, config, sync, profileId }),
    onSelectProfile: (id, name) => {
      state.selectedProfileId = id;
      state.selectedProfileName = name;
      state.unlockStep(3);
      sync();
    },
    checkProfileHasAio: profileId => checkProfileAioStatus({ state, client, config, profileId }),
    loadAvatars: avatarCatalog.loadAvatarsCatalog,
    filterAvatars: avatarCatalog.filterAvatars,
    getFranchises: avatarCatalog.getFranchisesSummary,
    resolveCdnUrl: avatarCatalog.resolveAvatarCdnUrl,
    notify: (msg, type) => notify?.(msg, type),
  };
}
