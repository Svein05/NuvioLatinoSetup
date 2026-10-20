import { describe, expect, it, vi } from 'vitest';
import { loadWizardTemplates } from './load-wizard-templates.js';

describe('loadWizardTemplates', () => {
  const templatesConfig = {
    METADATA_LATINO: '/templates/metadata.json',
    NUVIO_COLLECTIONS: '/templates/collections.json',
    AIOSTREAMS: '/templates/aiostreams.json',
  };

  it('loads and initializes collections and templates successfully', async () => {
    const mockFetch = vi.fn(async (url) => {
      if (url.includes('metadata.json')) {
        return { ok: true, json: async () => ({ catalogs: [] }) };
      }
      if (url.includes('collections.json')) {
        return { ok: true, json: async () => [{ id: 'sec-1', name: 'Películas', folders: [] }] };
      }
      if (url.includes('aiostreams.json')) {
        return { ok: true, json: async () => ({ version: 1 }) };
      }
      return { ok: false };
    });

    const result = await loadWizardTemplates({
      fetch: mockFetch,
      templatesConfig,
      now: () => 12345678,
    });

    expect(result.ok).toBe(true);
    expect(result.rawMetadataTemplate).toEqual({ catalogs: [] });
    expect(result.rawAioStreamsTemplate).toEqual({ version: 1 });
    expect(result.originalCollectionsTemplate).toEqual([{ id: 'sec-1', name: 'Películas', folders: [] }]);
    expect(result.collections).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('/templates/metadata.json?v=12345678', { cache: 'no-store' });
  });

  it('returns ok: false when required metadata template fails', async () => {
    const mockFetch = vi.fn(async (url) => {
      if (url.includes('metadata.json')) return { ok: false };
      return { ok: true, json: async () => [] };
    });
    const result = await loadWizardTemplates({ fetch: mockFetch, templatesConfig });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Error al leer los archivos de plantillas locales');
  });

  it('returns ok: false when required collections template fails', async () => {
    const mockFetch = vi.fn(async (url) => {
      if (url.includes('collections.json')) return { ok: false };
      return { ok: true, json: async () => ({}) };
    });
    const result = await loadWizardTemplates({ fetch: mockFetch, templatesConfig });
    expect(result.ok).toBe(false);
  });

  it('handles optional AIOStreams failure gracefully without breaking', async () => {
    const mockFetch = vi.fn(async (url) => {
      if (url.includes('metadata.json')) return { ok: true, json: async () => ({}) };
      if (url.includes('collections.json')) return { ok: true, json: async () => [] };
      return { ok: false };
    });
    const result = await loadWizardTemplates({ fetch: mockFetch, templatesConfig });
    expect(result.ok).toBe(true);
    expect(result.rawAioStreamsTemplate).toBeNull();
  });

  it('catches network exceptions safely', async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error('Network timeout');
    });
    const result = await loadWizardTemplates({ fetch: mockFetch, templatesConfig });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network timeout');
  });
});
