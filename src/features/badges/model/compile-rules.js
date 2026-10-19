import { getCanonicalModuleId, getBadgeModuleLabel, isSectionActive } from './module-identity.js';
import { sanitizeLanguageAndBadges } from './language-filters.js';
import { toUniversalHybridFilter } from './hybrid-patterns.js';

const defaults = ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];

function activeGroups(rawGroups, filters, active, order) {
  const groups = rawGroups.filter(group => isSectionActive(group.id, active));
  groups.sort((a, b) => {
    const left = order.indexOf(getCanonicalModuleId(a.id));
    const right = order.indexOf(getCanonicalModuleId(b.id));
    return (left >= 0 ? left : 999) - (right >= 0 ? right : 999);
  });
  if (groups.length || rawGroups.length) return groups;
  return [...new Set(filters.map(filter => filter.groupId).filter(Boolean))]
    .filter(id => isSectionActive(id, active))
    .map(id => ({ id, name: getBadgeModuleLabel(id, id), isExpanded: true }));
}

function orderedFilters(filters, groups, active) {
  const ids = new Set(groups.map(group => group.id));
  const canonicals = new Set(groups.map(group => getCanonicalModuleId(group.id)));
  const selected = filters.filter(filter => !filter.groupId || ids.has(filter.groupId)
    || canonicals.has(getCanonicalModuleId(filter.groupId)) || isSectionActive(filter.groupId, active));
  const order = new Map();
  groups.forEach((group, index) => {
    order.set(group.id, index);
    const canonical = getCanonicalModuleId(group.id);
    if (canonical && !order.has(canonical)) order.set(canonical, index);
  });
  const rank = filter => order.get(filter.groupId || '') ?? order.get(getCanonicalModuleId(filter.groupId || '')) ?? 999;
  return selected.sort((a, b) => rank(a) - rank(b));
}

/** Compile provider-independent rules from a previously loaded document. No network or shared state. */
export function compileBadgeRules(document, activeIds = [], orderIds = []) {
  const rawGroups = Array.isArray(document.groups) ? document.groups : [];
  const rawFilters = Array.isArray(document.filters) ? document.filters : (Array.isArray(document) ? document : []);
  const active = new Set(activeIds?.length ? activeIds : defaults);
  const order = orderIds?.length ? orderIds : defaults;
  const filters = sanitizeLanguageAndBadges(rawFilters).map(toUniversalHybridFilter);
  const groups = activeGroups(rawGroups, filters, active, order);
  return { groups, filters: orderedFilters(filters, groups, active) };
}
