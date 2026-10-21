import { signup, login } from './authentication.js';
import { readProfiles } from './profiles-read.js';
import { createProfile, deleteProfile, updateProfile, updateProfileAvatar } from './profiles-write.js';
import { pushProfileSettings } from './profile-settings.js';
import { pullProfileSettings } from './profile-settings-read.js';
import { pushCollections, pullCollections } from './collections.js';
import { pushProviderCredentials, pullProviderCredentials } from './provider-credentials.js';
import { listPlugins } from './plugins.js';
import { legacyHistory } from './profile-history.js';
import {
  getSyncOwner, listAddons, installAddon, deleteAddon,
  updateAddonOrder, updateAddon, cleanProfileAddons,
  installOrUpdateAioAddon, syncAddonsOrder,
} from './addons.js';

export {
  signup, login, readProfiles, createProfile, deleteProfile,
  updateProfile, updateProfileAvatar, pushProfileSettings,
  pullProfileSettings, pushCollections, pullCollections,
  pushProviderCredentials, pullProviderCredentials, listPlugins,
  getSyncOwner, listAddons, installAddon, deleteAddon,
  updateAddonOrder, updateAddon, cleanProfileAddons,
  installOrUpdateAioAddon, syncAddonsOrder,
};

export const NuvioClient = {
  signup: ctx => signup(ctx),
  login: ctx => login(ctx),
  getProfiles: ctx => readProfiles(ctx),
  createProfile: async ctx => {
    const profile = await createProfile(ctx);
    try {
      await cleanProfileAddons({ ...ctx, profileId: profile.profile_index });
    } catch {
      profile.warnings = ['El perfil se creó, pero no se pudo limpiar su lista inicial de addons.'];
    }
    return profile;
  },
  deleteProfile: ctx => deleteProfile(ctx),
  updateProfile: ctx => updateProfile(ctx),
  updateProfileAvatar: ctx => updateProfileAvatar(ctx),
  pushProfileSettings: ctx => pushProfileSettings(ctx),
  pullProfileSettings: ctx => pullProfileSettings(ctx),
  pushCollections: ctx => pushCollections(ctx),
  pullCollections: ctx => pullCollections(ctx),
  pushProviderCredentials: ctx => pushProviderCredentials(ctx),
  pullProviderCredentials: ctx => pullProviderCredentials(ctx),
  listPlugins: ctx => listPlugins(ctx),
  getSyncOwner: ctx => getSyncOwner(ctx),
  listAddons: ctx => listAddons(ctx),
  installAddon: ctx => installAddon(ctx),
  deleteAddon: ctx => deleteAddon(ctx),
  updateAddonOrder: ctx => updateAddonOrder(ctx),
  updateAddon: ctx => updateAddon(ctx),
  cleanProfileAddons: ctx => cleanProfileAddons(ctx),
  installOrUpdateAioAddon: ctx => installOrUpdateAioAddon(ctx),
  syncAddonsOrder: ctx => syncAddonsOrder(ctx),
  pullWatchProgress: ctx => legacyHistory(ctx, 'progress'),
  pullLibrary: ctx => legacyHistory(ctx, 'library'),
  pullWatched: ctx => legacyHistory(ctx, 'watched'),
};
