import { getBadgePackById } from '../state/catalog.js';
import { compileBadgeRules } from '../model/compile-rules.js';

/** Bind catalog compilation to an injected, read-only document loader. */
export function createBadgeCompiler(loadDocument) {
  return async function compilePack(pack, activeIds = [], orderIds = []) {
    const selected = typeof pack === 'string' ? getBadgePackById(pack) : pack;
    if (!selected) return { groups: [], filters: [] };
    const document = selected.isCustom && selected.customJson
      ? selected.customJson : await loadDocument(selected.rawV2 || selected.rawV1 || '');
    return compileBadgeRules(document, activeIds, orderIds);
  };
}
