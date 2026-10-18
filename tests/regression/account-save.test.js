import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';
import { expect, it, vi } from 'vitest';

// Temporary characterization seam: exercise the actual legacy function without
// importing the auto-starting DOM controller. Remove when the workflow is extracted.
function loadSaveAction(failWrite) {
  const source = readFileSync(new URL('../../js/account-manager.js', import.meta.url), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const node = ast.body.find(item => item.declaration?.id?.name === 'saveAllChanges').declaration;
  const state = {
    dirty: { settings: true }, selectedProfileId: 2, session: { accessToken: 'synthetic' },
    settings: { enrichment_enabled: true, tmdb_api_key: 'synthetic' }, originalSettings: {},
  };
  const scope = {
    accountState: state, document: { getElementById: () => null },
    CONFIG: {}, console: { error: vi.fn() }, updateSaveButton: vi.fn(), showToast: vi.fn(),
    NuvioClient: { pushProfileSettings: failWrite, pushProviderCredentials: vi.fn() },
  };
  vm.createContext(scope);
  vm.runInContext(source.slice(...node.range), scope);
  return scope;
}

it('retains pending settings and original values when a platform save fails', async () => {
  const failWrite = vi.fn(async () => { throw new Error('synthetic save failure'); });
  const scope = loadSaveAction(failWrite);
  await scope.saveAllChanges();
  expect(scope.accountState.dirty.settings).toBe(true);
  expect(scope.accountState.originalSettings).toEqual({});
  expect(scope.accountState.isSaving).toBe(false);
  expect(scope.showToast).toHaveBeenCalledWith(expect.stringContaining('Error al guardar'), 'error');
  expect(failWrite).toHaveBeenCalledTimes(1);
});
