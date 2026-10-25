import { describe, expect, it, vi } from 'vitest';
import { downloadJsonFile } from './file-download.js';

describe('downloadJsonFile', () => {
  it('creates an anchor, clicks it, and revokes the object URL', () => {
    const mockLink = { href: '', download: '', click: vi.fn() };
    const mockDocument = {
      createElement: vi.fn().mockReturnValue(mockLink),
    };
    const mockUrlApi = {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/mock-uuid'),
      revokeObjectURL: vi.fn(),
    };

    const payload = { test: 123 };
    downloadJsonFile(payload, 'sample.json', { documentRoot: mockDocument, urlApi: mockUrlApi });

    expect(mockDocument.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('blob:http://localhost/mock-uuid');
    expect(mockLink.download).toBe('sample.json');
    expect(mockLink.click).toHaveBeenCalledOnce();
    expect(mockUrlApi.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');
  });

  it('accepts pre-serialized JSON string without double stringification', () => {
    const mockLink = { href: '', download: '', click: vi.fn() };
    const mockDocument = { createElement: vi.fn().mockReturnValue(mockLink) };
    const mockUrlApi = {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/mock-str'),
      revokeObjectURL: vi.fn(),
    };

    downloadJsonFile('{"already":"json"}', 'direct.json', { documentRoot: mockDocument, urlApi: mockUrlApi });

    expect(mockLink.download).toBe('direct.json');
    expect(mockLink.click).toHaveBeenCalledOnce();
    expect(mockUrlApi.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-str');
  });

  it('no-ops safely when documentRoot is absent or invalid', () => {
    expect(() => downloadJsonFile({ test: 1 }, 'test.json', { documentRoot: null, urlApi: {} })).not.toThrow();
  });
});
