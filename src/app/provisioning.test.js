import { describe, expect, it, vi } from 'vitest';

vi.mock('./completions.js', () => ({
  recordSuccessfulCompletion: vi.fn().mockResolvedValue(),
}));

import { executePipeline, downloadCollectionsJson, downloadAioConfigJson } from './provisioning.js';

describe('src/app/provisioning.js', () => {
  it('wires executePipeline with defaults and calls workflow', async () => {
    const mockState = {
      execution: { mode: 'simulation', isRunning: false },
      getSynchronizedMetadataPayload: vi.fn().mockReturnValue({ catalogs: [] }),
      getSynchronizedNuvioCollections: vi.fn().mockReturnValue([]),
      addLog: vi.fn(),
      clearLogs: vi.fn(),
      notify: vi.fn(),
    };

    const mockServices = {
      delay: vi.fn().mockResolvedValue(),
      randomId: vi.fn().mockReturnValue('unit-test-uuid'),
    };

    await executePipeline(mockState, { services: mockServices });

    expect(mockState.execution.isCompleted).toBe(true);
    expect(mockState.execution.result.uuid).toBe('lat-unit-test-uuid');
    expect(mockState.notify).toHaveBeenCalledWith('EXECUTION_FINISHED');
  });

  it('triggers download for collections and metadata json', () => {
    const mockDocument = {
      createElement: vi.fn().mockReturnValue({ click: vi.fn() }),
    };
    const mockUrlApi = {
      createObjectURL: vi.fn().mockReturnValue('blob:test'),
      revokeObjectURL: vi.fn(),
    };

    const options = { documentRoot: mockDocument, urlApi: mockUrlApi };

    downloadCollectionsJson([{ name: 'Mi Colección' }], options);
    expect(mockDocument.createElement).toHaveBeenCalledWith('a');

    downloadAioConfigJson({ name: 'Mi Config' }, options);
    expect(mockDocument.createElement).toHaveBeenCalledTimes(2);
  });
});
