import { CANONICAL_FALLBACKS } from '../data/patterns.js';

export function stripRegexFlags(pattern) {
  if (!pattern) return '';
  return String(pattern).replace(/^\(\?[a-z]+\)/i, '');
}

export function toUniversalHybridFilter(filter) {
  if (!filter || !filter.pattern) return filter;
  const raw = filter.pattern;
  const hasHidden = /[\u200B-\u200D\uFEFF\u2060-\u2064]/.test(raw);

  if (!hasHidden) return filter;

  const normName = String(filter.name || '').trim().toLowerCase();
  const normId = String(filter.id || '').trim().toLowerCase();

  let fallback = CANONICAL_FALLBACKS[normName] || CANONICAL_FALLBACKS[normId];
  if (!fallback) {
    for (const [k, v] of Object.entries(CANONICAL_FALLBACKS)) {
      if (normName === k || normId === k || normName.includes(k) || normId.includes(k)) {
        fallback = v;
        break;
      }
    }
  }

  if (!fallback) return filter;

  const cleanOriginal = stripRegexFlags(raw);
  const cleanFallback = stripRegexFlags(fallback);
  const hybridPattern = `(?is)(?:${cleanOriginal}|${cleanFallback})`;

  return {
    ...filter,
    pattern: hybridPattern
  };
}

export function decoupleLatinoFromSpainPattern(pattern) {
  if (!pattern) return '';
  return pattern
    .replace(/\b(?:latino|latam|lat)\b/gi, '')
    .replace(/es[-_.]?(?:\(\?:)?(?:mx|la|419)\)?/gi, '')
    .replace(/\|+/g, '|')
    .replace(/\(\|/g, '(')
    .replace(/\|\)/g, ')');
}
