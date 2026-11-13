import { selectedConnectionCatalogs } from '../features/connections/index.js';
import { collectActiveCatalogIds } from '../features/collections/index.js';

/** Never install native references to catalogs missing from the confirmed addon manifest. */
export function verifyConnectionCatalogs(state, inspection) {
  const active = collectActiveCatalogIds(state.collections || []);
  const expected = selectedConnectionCatalogs(state.connections).filter(catalog => active.has(catalog.id));
  if (!expected.length) return;
  if (!inspection?.verified || !Array.isArray(inspection.manifest?.catalogs)) {
    throw new Error('No se pudo verificar el manifiesto de tus conexiones. Reintenta antes de instalar en Nuvio.');
  }
  const actual = new Set(inspection.manifest.catalogs.map(catalog => `${catalog.type}:${catalog.id}`));
  if (expected.some(catalog => !actual.has(`${catalog.type}:${catalog.id}`))) {
    throw new Error('AIOMetadata no publicó todos los catálogos conectados. Revisa tus conexiones antes de continuar.');
  }
}
