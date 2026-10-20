import { describe, expect, it, vi } from 'vitest';
import { executeProfileProvisioning } from './provision-profile.js';

function createMockState(overrides = {}) {
  const logs = [];
  return {
    execution: {
      isRunning: false,
      isCompleted: false,
      mode: 'real',
      result: null,
      error: null,
      ...(overrides.execution || {}),
    },
    nuvioAuth: {
      accessToken: 'test-token',
      userId: 'user-123',
      email: 'test@example.com',
      password: 'password123',
      ...(overrides.nuvioAuth || {}),
    },
    selectedProfileId: 'profile-456',
    selectedProfileName: 'Perfil Test',
    apiKeys: {
      tmdb: 'tmdb-secret-key',
      mdblist: 'mdblist-secret-key',
      ...(overrides.apiKeys || {}),
    },
    preferences: {
      tmdbEnrichment: true,
      mdblistRatings: true,
      posterEngine: 'betterposter',
      badgesEnabled: false,
      ...(overrides.preferences || {}),
    },
    profileAddons: [],
    deletedAddonIds: new Set(),
    getSynchronizedMetadataPayload: vi.fn().mockReturnValue({ config: { catalogs: ['cat1'] } }),
    getSynchronizedNuvioCollections: vi.fn().mockReturnValue([{ folders: [{ id: 'f1' }] }]),
    addLog: vi.fn((msg, level) => logs.push({ msg, level })),
    clearLogs: vi.fn(() => logs.length = 0),
    notify: vi.fn(),
    logs,
    ...overrides,
  };
}

describe('executeProfileProvisioning', () => {
  it('prevents execution when isRunning is already true', async () => {
    const state = createMockState({ execution: { isRunning: true } });
    await executeProfileProvisioning(state);
    expect(state.clearLogs).not.toHaveBeenCalled();
    expect(state.notify).not.toHaveBeenCalled();
  });

  it('runs simulation mode without invoking external network services', async () => {
    const state = createMockState({
      execution: { mode: 'simulation' },
      selectedProfileId: null,
      profileAddons: [{ isAioStreams: true }],
    });

    const services = {
      delay: vi.fn().mockResolvedValue(),
      randomId: vi.fn().mockReturnValue('mock123'),
      nuvioClient: {
        login: vi.fn(),
        pushCollections: vi.fn(),
      },
    };

    await executeProfileProvisioning(state, { services });

    expect(state.execution.isRunning).toBe(false);
    expect(state.execution.isCompleted).toBe(true);
    expect(state.execution.result.uuid).toBe('lat-mock123');
    expect(state.execution.result.collectionsCount).toBe(1);
    expect(services.nuvioClient.login).not.toHaveBeenCalled();
    expect(services.nuvioClient.pushCollections).not.toHaveBeenCalled();
    expect(state.notify).toHaveBeenCalledWith('EXECUTION_FINISHED');
  });

  it('throws and records error when nuvioClient is missing in real mode', async () => {
    const state = createMockState({ execution: { mode: 'real' } });
    const services = {
      delay: vi.fn().mockResolvedValue(),
      provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://aio.test/stremio/lat-1/manifest.json', uuid: 'lat-1', instanceUrl: 'https://aio.test' }),
      inspectManifest: vi.fn().mockResolvedValue({ verified: true }),
    };

    await executeProfileProvisioning(state, { services });

    expect(state.execution.error).toBe('Cliente Nuvio no configurado.');
    expect(state.execution.isRunning).toBe(false);
    expect(state.notify).toHaveBeenCalledWith('EXECUTION_FINISHED');
  });

  it('requires credentials when no accessToken is present in state', async () => {
    const state = createMockState({
      execution: { mode: 'real' },
      nuvioAuth: { accessToken: null, email: '', password: '' },
    });
    const services = {
      delay: vi.fn().mockResolvedValue(),
      provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://aio.test/stremio/lat-1/manifest.json', uuid: 'lat-1', instanceUrl: 'https://aio.test' }),
      inspectManifest: vi.fn().mockResolvedValue({ verified: true }),
      nuvioClient: { login: vi.fn() },
    };

    await executeProfileProvisioning(state, { services });

    expect(state.execution.error).toContain('Faltan credenciales de Nuvio');
    expect(services.nuvioClient.login).not.toHaveBeenCalled();
  });

  it('logs in and selects default profile if accessToken was missing', async () => {
    const state = createMockState({
      execution: { mode: 'real' },
      nuvioAuth: { accessToken: null, email: 'user@nuvio.tv', password: 'secretpassword' },
      selectedProfileId: null,
    });

    const mockClient = {
      login: vi.fn().mockResolvedValue({ accessToken: 'new-token', userId: 'u-99' }),
      getProfiles: vi.fn().mockResolvedValue([{ id: 'prof-99', name: 'Perfil Recuperado' }]),
      pushProviderCredentials: vi.fn().mockResolvedValue({}),
      pushProfileSettings: vi.fn().mockResolvedValue({}),
      installOrUpdateAioAddon: vi.fn().mockResolvedValue({ addonId: 'aio-addon-1' }),
      syncAddonsOrder: vi.fn().mockResolvedValue({}),
      pushCollections: vi.fn().mockResolvedValue({}),
    };

    const services = {
      delay: vi.fn().mockResolvedValue(),
      provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://aio.test/stremio/lat-99/manifest.json', uuid: 'lat-99', instanceUrl: 'https://aio.test' }),
      inspectManifest: vi.fn().mockResolvedValue({ verified: true, manifest: { name: 'AIO Latino Official' } }),
      nuvioClient: mockClient,
      recordCompletion: vi.fn().mockResolvedValue(),
    };

    await executeProfileProvisioning(state, { services });

    expect(mockClient.login).toHaveBeenCalledWith(expect.objectContaining({ email: 'user@nuvio.tv' }));
    expect(state.nuvioAuth.accessToken).toBe('new-token');
    expect(state.selectedProfileId).toBe('prof-99');
    expect(state.selectedProfileName).toBe('Perfil Recuperado');
    expect(state.execution.isCompleted).toBe(true);
    expect(services.recordCompletion).toHaveBeenCalledOnce();
  });

  it('executes full pipeline deleting discarded addons and compiling badges', async () => {
    const state = createMockState({
      deletedAddonIds: new Set(['old-addon-1']),
      preferences: {
        badgesEnabled: true,
        selectedBadgePack: 'pack-modern',
        activeBadgeModules: ['gr', 'size'],
        badgeModulesOrder: ['gr', 'size'],
      },
    });

    const mockClient = {
      deleteAddon: vi.fn().mockResolvedValue({}),
      pushProviderCredentials: vi.fn().mockResolvedValue({}),
      pushProfileSettings: vi.fn().mockResolvedValue({}),
      installOrUpdateAioAddon: vi.fn().mockResolvedValue({ addonId: 'aio-inst-1' }),
      syncAddonsOrder: vi.fn().mockResolvedValue({}),
      pushCollections: vi.fn().mockResolvedValue({}),
    };

    const services = {
      delay: vi.fn().mockResolvedValue(),
      provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://aio.test/stremio/lat-5/manifest.json', uuid: 'lat-5', instanceUrl: 'https://aio.test' }),
      inspectManifest: vi.fn().mockResolvedValue({ verified: true, warnings: ['advertencia de prueba'] }),
      getBadgePackById: vi.fn().mockReturnValue({ id: 'pack-modern', name: 'Pack Modern' }),
      compileBadgeRules: vi.fn().mockResolvedValue({ filters: [{ id: 'f1' }], groups: [{ id: 'g1' }] }),
      nuvioClient: mockClient,
      recordCompletion: vi.fn().mockResolvedValue(),
    };

    await executeProfileProvisioning(state, { services });

    expect(mockClient.deleteAddon).toHaveBeenCalledWith(expect.objectContaining({ addonId: 'old-addon-1' }));
    expect(services.compileBadgeRules).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pack-modern' }),
      ['gr', 'size'],
      ['gr', 'size'],
    );
    expect(mockClient.pushProfileSettings).toHaveBeenCalledTimes(3); // tv, mobile, desktop
    expect(mockClient.pushCollections).toHaveBeenCalledOnce();
    expect(state.execution.isCompleted).toBe(true);
  });

  it('compiles AIOStreams addon if present in profile addons without manifest', async () => {
    const secAddon = { name: 'AIOStreams', isAioStreams: true, manifest_url: '' };
    const state = createMockState({
      profileAddons: [secAddon],
      aiostreams: { debrids: { realdebrid: 'rd-key' } },
      aiometadata: { password: 'master-password' },
    });

    const mockClient = {
      pushProviderCredentials: vi.fn().mockResolvedValue({}),
      pushProfileSettings: vi.fn().mockResolvedValue({}),
      installOrUpdateAioAddon: vi.fn().mockResolvedValue({ addonId: 'aio-1' }),
      installAddon: vi.fn().mockResolvedValue({ addonId: 'sec-installed-1' }),
      syncAddonsOrder: vi.fn().mockResolvedValue({}),
      pushCollections: vi.fn().mockResolvedValue({}),
    };

    const services = {
      delay: vi.fn().mockResolvedValue(),
      provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://aio.test/stremio/lat-6/manifest.json', uuid: 'lat-6', instanceUrl: 'https://aio.test' }),
      fetchTemplate: vi.fn().mockResolvedValue({ streams: [] }),
      compileStreamingConfig: vi.fn().mockReturnValue({ compiled: true }),
      createStreamingConfiguration: vi.fn().mockResolvedValue({ manifestUrl: 'https://aiostreams.test/user-manifest.json' }),
      nuvioClient: mockClient,
      recordCompletion: vi.fn().mockResolvedValue(),
    };

    await executeProfileProvisioning(state, { services });

    expect(services.createStreamingConfiguration).toHaveBeenCalledWith(
      undefined,
      { compiled: true },
      'master-password',
    );
    expect(secAddon.manifest_url).toBe('https://aiostreams.test/user-manifest.json');
    expect(mockClient.installAddon).toHaveBeenCalledWith(expect.objectContaining({
      addonData: expect.objectContaining({
        manifest_url: 'https://aiostreams.test/user-manifest.json',
      }),
    }));
  });

  it('tolerates non-fatal error in AIOStreams creation and continues pipeline', async () => {
    const secAddon = { name: 'AIOStreams', isAioStreams: true, manifest_url: '' };
    const state = createMockState({
      profileAddons: [secAddon],
    });

    const mockClient = {
      pushProviderCredentials: vi.fn().mockResolvedValue({}),
      pushProfileSettings: vi.fn().mockResolvedValue({}),
      installOrUpdateAioAddon: vi.fn().mockResolvedValue({ addonId: 'aio-1' }),
      syncAddonsOrder: vi.fn().mockResolvedValue({}),
      pushCollections: vi.fn().mockResolvedValue({}),
    };

    const services = {
      delay: vi.fn().mockResolvedValue(),
      provisionMetadata: vi.fn().mockResolvedValue({ manifestUrl: 'https://aio.test/stremio/lat-7/manifest.json', uuid: 'lat-7', instanceUrl: 'https://aio.test' }),
      createStreamingConfiguration: vi.fn().mockRejectedValue(new Error('Servicio temporalmente caído')),
      nuvioClient: mockClient,
      recordCompletion: vi.fn().mockResolvedValue(),
    };

    await executeProfileProvisioning(state, { services });

    expect(state.execution.isCompleted).toBe(true);
    expect(state.logs.some(l => l.level === 'warning' && l.msg.includes('No se pudo generar AIOStreams'))).toBe(true);
    expect(mockClient.pushCollections).toHaveBeenCalledOnce();
  });
});
