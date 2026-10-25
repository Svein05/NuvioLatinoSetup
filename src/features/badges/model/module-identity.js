import { BADGE_MODULE_TRANSLATIONS } from '../data/modules.js';

export function getBadgeModuleLabel(id, fallbackName = '') {
  if (BADGE_MODULE_TRANSLATIONS[id]) return BADGE_MODULE_TRANSLATIONS[id];
  const lower = (fallbackName || '').toLowerCase().trim();
  if (BADGE_MODULE_TRANSLATIONS[lower]) return BADGE_MODULE_TRANSLATIONS[lower];
  return fallbackName || id.toUpperCase();
}

export function getCanonicalModuleId(rawId) {
  if (!rawId) return '';
  const lower = String(rawId).trim().toLowerCase();
  if (lower === 'gr' || lower === 'g-res' || lower === 'res' || lower === 'resolution') return 'gr';
  if (lower === 'gq' || lower === 'g-src' || lower === 'grl' || lower === 'quality') return 'gq';
  if (lower === 'gv' || lower === 'g-rng' || lower === 'g-depth' || lower === 'visual') return 'gv';
  if (lower === 'ga' || lower === 'g-snd' || lower === 'snd' || lower === 'audio' || lower === 'sound formats') return 'ga';
  if (lower === 'gc' || lower === 'g-ch' || lower === 'ch' || lower === 'channels' || lower === 'audio channels') return 'gc';
  if (lower === 'ge' || lower === 'codec' || lower === 'encoder') return 'ge';
  if (lower === 'gl' || lower === 'glang' || lower === 'lang' || lower === 'language') return 'glang';
  if (lower === 'gsub' || lower === 'sub' || lower === 'subtitle' || lower === 'subtitles') return 'gsub';
  if (lower === 'gst' || lower === 'special' || lower === 'special-tags' || lower === 'special tags') return 'gst';
  if (lower === 'gs' || lower === 'stream' || lower === 'streaming') return 'gs';
  if (lower === 'gms' || lower === 'source' || lower === 'media-source' || lower === 'media source' || lower === 'mediasource') return 'gms';
  return lower;
}

export function isSectionActive(secId, activeSet) {
  if (!activeSet || activeSet.size === 0) return false;
  if (activeSet.has(secId)) return true;
  const canon = getCanonicalModuleId(secId);
  if (activeSet.has(canon)) return true;
  for (const activeId of activeSet) {
    if (getCanonicalModuleId(activeId) === canon) return true;
  }
  return false;
}
