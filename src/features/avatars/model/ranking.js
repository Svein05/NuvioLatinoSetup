import { BASELINE_TOP_AVATARS } from '../data/ranking-baseline.js';

export function normalizeAvatarStorageKey(rawPath) {
  if (!rawPath) return '';
  let value = String(rawPath).trim();
  const marker = 'assets/profile_icons/';
  const index = value.indexOf(marker);
  if (index >= 0) value = value.slice(index + marker.length).split(/[?#]/)[0];
  try { value = decodeURI(value); } catch { /* Preserve malformed legacy percent sequences as literal keys. */ }
  const parts = value.split('/');
  const control = [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  return value.length <= 512 && !control && !/[<>\\:?#]/.test(value) && [2, 3].includes(parts.length)
    && parts.every(part => part.trim() && part !== '.' && part !== '..' && !part.startsWith('.'))
    && /\.(webp|png|jpe?g|svg)$/i.test(parts.at(-1)) ? value : '';
}

export function completeAvatarRanking(entries, limit = 8) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 32) throw new Error('Límite de ranking inválido.');
  const result = new Map();
  for (const item of Array.isArray(entries) ? entries : []) {
    const key = normalizeAvatarStorageKey(typeof item === 'string' ? item : item?.key);
    const score = typeof item === 'string' ? 0 : Number(item?.score);
    if (key && Number.isSafeInteger(score) && score >= 0 && !result.has(key)) result.set(key, { key, score });
  }
  for (const key of BASELINE_TOP_AVATARS) if (!result.has(key)) result.set(key, { key, score: 0 });
  return [...result.values()].slice(0, limit);
}
