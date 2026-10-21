import { previewLanguage, previewSubtitles } from './preview-language.js';
import { previewAudio, previewResolution, previewChannels, previewQuality, previewVisual, previewTags, previewStreaming } from './preview-technical.js';
import { previewStyle } from './preview-style.js';
import { getCanonicalModuleId, isSectionActive } from './module-identity.js';
const previews = { glang: previewLanguage, gsub: previewSubtitles, ga: previewAudio, gr: previewResolution, gc: previewChannels, gq: previewQuality, gv: previewVisual, gst: previewTags, gs: previewStreaming };
function enrichSectionForDisplay(sec, pack) {
  if (!sec || pack?.isCustom || !previews[sec.id]) return sec;
  return previews[sec.id](sec, previewStyle(sec, pack));
}
export function getPackSectionsOrdered(pack, activeModuleIds = [], order = []) {
  if (!pack) return [];
  const activeSet = new Set(activeModuleIds || []);

  const sectionsMap = new Map();
  (pack.sections || []).forEach(sec => {
    sectionsMap.set(sec.id, enrichSectionForDisplay(sec, pack));
  });

  const result = [];
  const addedIds = new Set();
  const checkActive = (id) => isSectionActive(id, activeSet);

  // 1. Respetar la secuencia ordenada definida por el usuario
  (order || []).forEach(id => {
    let matchedSec = sectionsMap.get(id);
    if (!matchedSec) {
      const targetCanon = getCanonicalModuleId(id);
      for (const [secId, sec] of sectionsMap.entries()) {
        if (!addedIds.has(secId) && getCanonicalModuleId(secId) === targetCanon) {
          matchedSec = sec;
          break;
        }
      }
    }

    if (matchedSec && !addedIds.has(matchedSec.id)) {
      if (checkActive(matchedSec.id) || checkActive(id)) {
        result.push(matchedSec);
        addedIds.add(matchedSec.id);
      }
    }
  });

  // 2. Si hay alguna sección en el pack no presente en el orden, añadirla si está activa
  sectionsMap.forEach((sec, id) => {
    if (!addedIds.has(id)) {
      if (checkActive(id)) {
        result.push(sec);
        addedIds.add(id);
      }
    }
  });

  return result;
}
