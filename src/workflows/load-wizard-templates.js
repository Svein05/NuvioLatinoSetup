import { initializeCollections } from '../features/collections/index.js';

export async function loadWizardTemplates({
  fetch = globalThis.fetch,
  templatesConfig,
  now = Date.now,
} = {}) {
  try {
    const cacheBuster = `?v=${now()}`;
    const [metaRes, colRes, aioRes] = await Promise.all([
      fetch(`${templatesConfig.METADATA_LATINO}${cacheBuster}`, { cache: 'no-store' }),
      fetch(`${templatesConfig.NUVIO_COLLECTIONS}${cacheBuster}`, { cache: 'no-store' }),
      templatesConfig.AIOSTREAMS
        ? fetch(`${templatesConfig.AIOSTREAMS}${cacheBuster}`, { cache: 'no-store' }).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!metaRes?.ok || !colRes?.ok) {
      return { ok: false, error: 'Error al leer los archivos de plantillas locales.' };
    }

    const rawMetadataTemplate = await metaRes.json();
    const collectionsData = await colRes.json();
    let rawAioStreamsTemplate = null;
    if (aioRes?.ok) {
      rawAioStreamsTemplate = await aioRes.json().catch(() => null);
    }

    return {
      ok: true,
      rawMetadataTemplate,
      originalCollectionsTemplate: structuredClone(collectionsData),
      rawAioStreamsTemplate,
      collections: initializeCollections(collectionsData),
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Error inesperado al cargar plantillas.' };
  }
}
