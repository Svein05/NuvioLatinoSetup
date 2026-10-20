export { isAioMetadataAddon, isAioStreamsAddon, isSameManifest, manifestIdentity } from './model/identity.js';
export { compileStreamingConfig } from './model/streaming-config.js';
export {
  hasAioStreamsInstance,
  getAioStreamsIndex,
  hasAddonManifest,
  normalizeProfileAddons,
  moveProfileAddon,
  removeProfileAddon,
  upsertAioStreamsAddon,
  addCustomProfileAddon,
} from './model/profile-addons.js';
