import { expect, it, vi } from 'vitest';
import { executeProfileProvisioning } from '../../src/workflows/provision-profile.js';

it('does not mark injection complete after badge compilation fails', async () => {
  const state = {
    execution: { mode: 'simulation', isRunning: false, isCompleted: false },
    preferences: { badgesEnabled: true, selectedBadgePack: 'synthetic' },
    nuvioAuth: {},
    aiometadata: { instanceUrl: 'https://example.invalid' },
    apiKeys: {},
    clearLogs: vi.fn(),
    addLog: vi.fn(),
    notify: vi.fn(),
    getSynchronizedMetadataPayload: () => ({ config: { catalogs: [] } }),
    getSynchronizedNuvioCollections: () => [],
  };
  const services = {
    delay: async () => {},
    getBadgePackById: () => ({ name: 'Synthetic' }),
    compileBadgeRules: async () => {
      throw new Error('synthetic unavailable pack');
    },
  };
  await executeProfileProvisioning(state, { services });
  expect(state.execution).toMatchObject({ isCompleted: false, isRunning: false, error: 'synthetic unavailable pack' });
  expect(state.notify).toHaveBeenCalledWith('EXECUTION_FINISHED');
});
