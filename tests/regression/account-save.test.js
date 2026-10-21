import { expect, it, vi } from 'vitest';
import { saveAccountChanges } from '../../src/workflows/save-account-changes.js';

it('retains pending settings and original values when a platform save fails', async () => {
  const failWrite = vi.fn(async () => { throw new Error('synthetic save failure'); });
  const state = {
    dirty: { settings: true },
    selectedProfileId: 2,
    session: { accessToken: 'synthetic' },
    settings: { enrichment_enabled: true, tmdb_api_key: 'synthetic' },
    originalSettings: {},
    isSaving: false,
  };
  const showToast = vi.fn();
  const client = {
    pushProfileSettings: failWrite,
    pushProviderCredentials: vi.fn(),
  };

  await expect(
    saveAccountChanges({
      state,
      config: {},
      client,
      ui: { notify: showToast },
    })
  ).rejects.toThrow('synthetic save failure');

  expect(state.dirty.settings).toBe(true);
  expect(state.originalSettings).toEqual({});
  expect(state.isSaving).toBe(false);
  expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Error al guardar'), 'error');
  expect(failWrite).toHaveBeenCalledTimes(1);
});
