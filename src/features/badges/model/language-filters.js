import { CANONICAL_LATINO_PATTERN } from '../data/patterns.js';
import { decoupleLatinoFromSpainPattern } from './hybrid-patterns.js';

function isLatino(filter) {
  const name = String(filter.name || '').toLowerCase().trim();
  const id = String(filter.id || '').toLowerCase().trim();
  const image = String(filter.imageURL || '').toLowerCase();
  return ['lat', 'latino', 'latam'].includes(name) || name.includes('latino')
    || ['lat', 'latino', 'latam'].includes(id) || id.includes('latino')
    || ['lat.png', 'latino', 'lang_lat', 'lang%20lat'].some(value => image.includes(value));
}

function isMixedSpain(filter) {
  const name = String(filter.name || '').toLowerCase().trim();
  const spain = filter.name === '🇪🇸' || ['spa', 'es'].includes(name)
    || ['spain', 'españa', 'spanish'].some(value => name.includes(value));
  return spain && /(?:latino|lat\b|latam)/i.test(filter.pattern || '');
}

function languageGroup(filters) {
  let group = 'glang';
  for (const filter of filters) {
    if (['gl', 'glang'].includes(filter.groupId) || /lang/i.test(filter.groupId || '')) group = filter.groupId;
  }
  return group;
}

function nativeLatino(sample, groupId) {
  return {
    id: 'latino-audio-native', name: 'Latino', groupId, type: 'filter', isEnabled: true,
    imageURL: 'https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/language/latino.png',
    pattern: CANONICAL_LATINO_PATTERN,
    tagColor: sample.tagColor || 'rgba(99, 102, 241, 0.15)',
    borderColor: sample.borderColor || '#6366F1', textColor: sample.textColor || '#FFFFFF',
    tagStyle: sample.tagStyle || 'filled',
  };
}

/** Preserve native artwork and separate Latino from Spain without changing input filters. */
export function sanitizeLanguageAndBadges(filters = []) {
  const existing = filters.findIndex(isLatino);
  const group = languageGroup(filters);
  let spain;
  const result = filters.map((filter, index) => {
    if (index === existing) return { ...filter, pattern: CANONICAL_LATINO_PATTERN };
    if (!isMixedSpain(filter)) return filter;
    spain = { ...filter, pattern: decoupleLatinoFromSpainPattern(filter.pattern) };
    return spain;
  });
  if (existing !== -1) return result;
  const sample = spain || filters.find(filter => filter.groupId === group) || filters[0] || {};
  const latino = nativeLatino(sample, group);
  const position = result.findIndex(filter => filter === spain);
  if (position >= 0) result.splice(position, 0, latino);
  else result.push(latino);
  return result;
}
