import { describe, expect, it, vi } from 'vitest';
import { whenDocumentReady } from './when-document-ready.js';

describe('whenDocumentReady', () => {
  it('waits once while the document is loading', () => {
    const callback = vi.fn();
    const documentRoot = { readyState: 'loading', addEventListener: vi.fn() };
    whenDocumentReady(callback, documentRoot);
    expect(callback).not.toHaveBeenCalled();
    expect(documentRoot.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', callback, { once: true });
  });

  it.each(['interactive', 'complete'])('starts a late module in a %s document', readyState => {
    const callback = vi.fn();
    whenDocumentReady(callback, { readyState });
    expect(callback).toHaveBeenCalledOnce();
  });
});
