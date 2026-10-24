import { CONFIG } from './config.js';
import { WizardCollectionsState } from './wizard-state-collections.js';
import {
  validateWizardStep,
  createDefaultPreferences,
  createDefaultNuvioAuth,
  createDefaultApiKeys,
  createDefaultAiometadata,
  createDefaultAiostreams,
  createDefaultExecution,
} from '../features/wizard/index.js';
import {
  isAioMetadataAddon as identifyMetadata,
  isAioStreamsAddon,
  hasAioStreamsInstance,
  getAioStreamsIndex,
  hasAddonManifest,
  normalizeProfileAddons,
  moveProfileAddon,
  removeProfileAddon,
  upsertAioStreamsAddon,
  addCustomProfileAddon,
} from '../features/addons/index.js';
import { loadWizardTemplates } from '../workflows/load-wizard-templates.js';

export { isAioStreamsAddon };
export function isAioMetadataAddon(addon) {
  return identifyMetadata(addon, CONFIG.AIOMETADATA_INSTANCES);
}

export class WizardState extends WizardCollectionsState {
  constructor() {
    super();
    this.currentStep = 1;
    this.totalSteps = 7;
    this.maxUnlockedStep = 1;
    this.preferences = createDefaultPreferences();
    this.profileAddons = [];
    this.deletedAddonIds = new Set();
    this.existingAioAddon = null;
    this.hasLoadedAddonsForProfile = null;
    this.isLoadingAddons = false;
    this.nuvioAuth = createDefaultNuvioAuth(CONFIG.NUVIO_PUBLIC_ANON_KEY);
    this.profiles = [];
    this.selectedProfileId = null;
    this.selectedProfileName = '';
    this.newlyCreatedProfileIds = new Set();
    this.apiKeys = createDefaultApiKeys();
    this.searchAiEnabled = false;
    this.apiKeysValidated = false;
    this.apiKeysValidationStatus = {};
    this.isManualMode = false;
    this.manualCompletionId = null;
    this.manualCopiedCollections = false;
    this.manualCopiedAio = false;
    this.rawMetadataTemplate = null;
    this.originalCollectionsTemplate = null;
    this.collections = [];
    this.aiometadata = createDefaultAiometadata(CONFIG.DEFAULT_AIOMETADATA_URL);
    this.aiostreams = createDefaultAiostreams();
    this.rawAioStreamsTemplate = null;
    this.execution = createDefaultExecution();
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(changeType = 'GENERAL') {
    this.subscribers.forEach(cb => cb(this, changeType));
  }

  isProfileNew(profileId) {
    if (!profileId || this.isManualMode) return false;
    return this.newlyCreatedProfileIds.has(String(profileId));
  }

  enableManualMode() {
    this.isManualMode = true;
    this.selectedProfileId = 'manual-profile';
    this.selectedProfileName = 'Perfil Manual';
    this.manualCompletionId = null;
    this.manualCopiedCollections = false;
    this.manualCopiedAio = false;
    this.manualCompletionShown = false;
    this.unlockStep(3);
    this.currentStep = 3;
    this.notify('MANUAL_MODE_ENABLED');
  }

  validateStep(stepNumber) {
    return validateWizardStep(stepNumber, this);
  }

  unlockStep(stepNumber) {
    if (stepNumber > this.maxUnlockedStep) {
      this.maxUnlockedStep = Math.min(stepNumber, this.totalSteps);
      this.notify('STEP_UNLOCKED');
    }
  }

  setProfileAddons(addons, profileId) {
    this.hasLoadedAddonsForProfile = profileId;
    this.deletedAddonIds.clear();
    const result = normalizeProfileAddons(addons, CONFIG.AIOMETADATA_INSTANCES);
    this.existingAioAddon = result.existingAioAddon;
    result.duplicateAioIds.forEach(id => this.deletedAddonIds.add(id));
    this.profileAddons = result.profileAddons;
    this.notify('ADDONS_UPDATED');
  }

  hasAioStreamsInstance() {
    return hasAioStreamsInstance(this.profileAddons);
  }

  getAioStreamsIndex() {
    return getAioStreamsIndex(this.profileAddons);
  }

  hasAddonManifest(manifestUrl) {
    return hasAddonManifest(this.profileAddons, manifestUrl);
  }

  moveAddon(index, direction) {
    const next = moveProfileAddon(this.profileAddons, index, direction);
    if (!next) return false;
    this.profileAddons = next;
    this.notify('ADDONS_UPDATED');
    return true;
  }

  removeAddon(index) {
    const result = removeProfileAddon(this.profileAddons, index);
    if (!result) return false;
    this.profileAddons = result.addons;
    if (result.removed?.id) this.deletedAddonIds.add(result.removed.id);
    if (result.removed?.isAioStreams) {
      this.aiostreams = createDefaultAiostreams();
    }
    this.notify('ADDONS_UPDATED');
    return true;
  }

  setAioStreamsConfig(debridsMap = {}, validatedKeysMap = {}) {
    this.aiostreams.installed = true;
    this.aiostreams.debrids = { ...debridsMap };
    this.aiostreams.validatedKeys = { ...validatedKeysMap };
    this.profileAddons = upsertAioStreamsAddon(this.profileAddons, debridsMap);
    this.notify('ADDONS_UPDATED');
    return true;
  }

  removeAioStreams() {
    this.aiostreams = createDefaultAiostreams();
    const idx = this.profileAddons.findIndex(a => a.isAioStreams);
    if (idx !== -1) {
      this.removeAddon(idx);
    } else {
      this.notify('ADDONS_UPDATED');
    }
  }

  getAioStreamsDebrids() {
    return this.aiostreams.debrids || {};
  }

  addCustomAddon(manifestUrl, name = '', logo = '') {
    const next = addCustomProfileAddon(this.profileAddons, {
      manifestUrl,
      name,
      logo,
      instances: CONFIG.AIOMETADATA_INSTANCES,
    });
    if (!next) return false;
    this.profileAddons = next;
    this.notify('ADDONS_UPDATED');
    return true;
  }

  setApiKeysValidation(isValid, statusMap = {}) {
    this.apiKeysValidated = isValid;
    this.apiKeysValidationStatus = statusMap;
    if (isValid) this.unlockStep(5);
    this.notify('API_KEYS_VALIDATED');
  }

  invalidateApiKeysValidation() {
    this.apiKeysValidated = false;
    this.apiKeysValidationStatus = {};
    this.notify('API_KEYS_INVALIDATED');
  }

  async loadTemplates() {
    const result = await loadWizardTemplates({ templatesConfig: CONFIG.TEMPLATES });
    if (!result.ok) {
      console.error('[State] Error cargando plantillas:', result.error);
      this.notify('TEMPLATES_ERROR');
      return false;
    }
    this.rawMetadataTemplate = result.rawMetadataTemplate;
    this.rawAioStreamsTemplate = result.rawAioStreamsTemplate;
    this.originalCollectionsTemplate = result.originalCollectionsTemplate;
    this.collections = result.collections;
    this.notify('TEMPLATES_LOADED');
    return true;
  }

  addLog(message, type = 'info') {
    const entry = {
      timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
      message,
      type,
    };
    this.execution.logs.push(entry);
    this.notify('LOG_ADDED');
  }

  clearLogs() {
    this.execution.logs = [];
    this.notify('LOGS_CLEARED');
  }
}

export function createWizardState() {
  return new WizardState();
}

export const state = createWizardState();
