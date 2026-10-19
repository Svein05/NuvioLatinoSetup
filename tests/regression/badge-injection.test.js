import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';
import { expect, it, vi } from 'vitest';

it('does not mark injection complete after badge compilation fails', async () => {
  const source = readFileSync(new URL('../../js/injector.js', import.meta.url), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const controller = ast.body.find(node => node.declaration?.id?.name === 'PipelineInjector').declaration;
  const state = {
    execution: { mode: 'simulation' }, preferences: { badgesEnabled: true, selectedBadgePack: 'synthetic' },
    nuvioAuth: {}, aiometadata: { instanceUrl: 'https://example.invalid' }, apiKeys: {},
    clearLogs: vi.fn(), addLog: vi.fn(), notify: vi.fn(),
    getSynchronizedMetadataPayload: () => ({ config: { catalogs: [] } }),
    getSynchronizedNuvioCollections: () => [],
  };
  const scope = {
    state, CONFIG: {}, console: { error: vi.fn(), warn: vi.fn() },
    getBadgePackById: () => ({ name: 'Synthetic' }), getBadgePackUrl: () => 'https://example.invalid',
    compileUniversalBadgeRules: async () => { throw new Error('synthetic unavailable pack'); },
  };
  vm.createContext(scope);
  vm.runInContext(`globalThis.PipelineInjector = ${source.slice(...controller.range)}`, scope);
  scope.PipelineInjector.delay = async () => {};
  await scope.PipelineInjector.execute();
  expect(state.execution).toMatchObject({ isCompleted: false, isRunning: false, error: 'synthetic unavailable pack' });
  expect(state.notify).toHaveBeenCalledWith('EXECUTION_FINISHED');
});
