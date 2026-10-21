import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWizardState, isAioMetadataAddon, isAioStreamsAddon } from './wizard-state.js';

describe('WizardState Store', () => {
  let state;

  beforeEach(() => {
    state = createWizardState();
  });

  it('initializes with default wizard values', () => {
    expect(state.currentStep).toBe(1);
    expect(state.totalSteps).toBe(7);
    expect(state.maxUnlockedStep).toBe(1);
    expect(state.isManualMode).toBe(false);
    expect(state.preferences.tmdbEnrichment).toBe(true);
    expect(state.nuvioAuth.isAuthenticated).toBe(false);
    expect(state.apiKeys.rpdb).toBe('t0-free-rpdb');
    expect(state.profileAddons).toEqual([]);
    expect(state.execution.mode).toBe('real');
  });

  it('notifies subscribers on state mutations', () => {
    const subscriber = vi.fn();
    const unsubscribe = state.subscribe(subscriber);

    state.addLog('Test log', 'info');
    expect(subscriber).toHaveBeenCalledWith(state, 'LOG_ADDED');
    expect(state.execution.logs).toHaveLength(1);

    state.clearLogs();
    expect(subscriber).toHaveBeenCalledWith(state, 'LOGS_CLEARED');
    expect(state.execution.logs).toHaveLength(0);

    unsubscribe();
    state.addLog('Ignored', 'info');
    expect(subscriber).toHaveBeenCalledTimes(2);
  });

  it('enables manual mode properly', () => {
    const subscriber = vi.fn();
    state.subscribe(subscriber);

    state.enableManualMode();
    expect(state.isManualMode).toBe(true);
    expect(state.selectedProfileId).toBe('manual-profile');
    expect(state.currentStep).toBe(3);
    expect(state.maxUnlockedStep).toBe(3);
    expect(subscriber).toHaveBeenCalledWith(state, 'MANUAL_MODE_ENABLED');
    expect(state.isProfileNew('manual-profile')).toBe(false);
  });

  it('tracks newly created profile ids', () => {
    state.newlyCreatedProfileIds.add('new-1');
    expect(state.isProfileNew('new-1')).toBe(true);
    expect(state.isProfileNew('other')).toBe(false);
  });

  it('unlocks steps monotonically up to totalSteps', () => {
    state.unlockStep(4);
    expect(state.maxUnlockedStep).toBe(4);
    state.unlockStep(2);
    expect(state.maxUnlockedStep).toBe(4);
    state.unlockStep(10);
    expect(state.maxUnlockedStep).toBe(7);
  });

  it('delegates step validation', () => {
    expect(state.validateStep(1).valid).toBe(false);
    state.enableManualMode();
    expect(state.validateStep(1).valid).toBe(true);
  });

  it('manages profile addons, reordering, custom addons and deletion', () => {
    const raw = [
      { id: '1', name: 'Torrentio', url: 'https://torrentio.strem.fun/manifest.json' },
      { id: '2', name: 'MediaFusion', url: 'https://mediafusion.fun/manifest.json' },
    ];
    state.setProfileAddons(raw, 'prof-1');
    expect(state.hasLoadedAddonsForProfile).toBe('prof-1');
    expect(state.profileAddons).toHaveLength(2);

    expect(state.hasAddonManifest('https://torrentio.strem.fun/manifest.json')).toBe(true);
    expect(state.hasAioStreamsInstance()).toBe(false);

    state.moveAddon(0, 1);
    expect(state.profileAddons[0].name).toBe('MediaFusion');

    state.addCustomAddon('https://custom.addon/manifest.json', 'Custom');
    expect(state.profileAddons).toHaveLength(3);

    state.removeAddon(0);
    expect(state.deletedAddonIds.has('2')).toBe(true);
  });

  it('manages AIOStreams lifecycle in addons', () => {
    state.setAioStreamsConfig({ realdebrid: 'key1' });
    expect(state.aiostreams.installed).toBe(true);
    expect(state.hasAioStreamsInstance()).toBe(true);
    expect(state.getAioStreamsIndex()).toBe(0);
    expect(state.getAioStreamsDebrids()).toEqual({ realdebrid: 'key1' });

    state.removeAioStreams();
    expect(state.aiostreams.installed).toBe(false);
    expect(state.hasAioStreamsInstance()).toBe(false);
  });

  it('updates and invalidates API keys validation', () => {
    state.setApiKeysValidation(true, { tmdb: true });
    expect(state.apiKeysValidated).toBe(true);
    expect(state.maxUnlockedStep).toBe(5);

    state.invalidateApiKeysValidation();
    expect(state.apiKeysValidated).toBe(false);
  });

  it('delegates collection operations and payload synchronization', () => {
    state.collections = [
      {
        id: 'sec-1',
        name: 'Sec 1',
        enabled: true,
        folders: [{ id: 'f-1', name: 'Folder 1', enabled: true, catalogs: [] }],
      },
    ];
    state.rawMetadataTemplate = { catalogs: [] };

    expect(state.getSynchronizedNuvioCollections()).toHaveLength(1);
    expect(state.getFlattenedCollectionsForApi('p-1', 'a-1')).toHaveLength(1);

    state.toggleFolder('sec-1', 'f-1');
    expect(state.collections[0].folders[0].enabled).toBe(false);
  });

  it('identifies addons with helper functions', () => {
    expect(isAioStreamsAddon({ name: 'AIOStreams' })).toBe(true);
    expect(isAioMetadataAddon({ name: 'AIOMetadata' })).toBe(true);
  });
});
