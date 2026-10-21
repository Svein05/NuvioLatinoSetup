import previewData from '../data/previews.json' with { type: 'json' };

export function previewLanguage(sec, { copyStyle }) {
    const langs = previewData.glang;
    return {
      ...sec,
      name: sec.name || 'Language',
      total: langs.length,
      hiddenCount: 0,
      items: langs.map(l => ({
        name: l.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/language/${l.img}`,
        ...copyStyle()
      }))
    };
  
}

export function previewSubtitles(sec, { copyStyle, hasLightBlue, hasBlackSuffix }) {
    let subSuffix = '.png';
    if (hasLightBlue) subSuffix = '-light-blue.png';
    else if (hasBlackSuffix) subSuffix = '-black.png';

    const subs = previewData.gsub.map(item => ({ ...item, img: item.img.replace(/\.png$/, subSuffix) }));
    return {
      ...sec,
      name: sec.name || 'Subtitle',
      total: subs.length,
      hiddenCount: 0,
      items: subs.map(s => ({
        name: s.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/subtitle/${s.img}`,
        ...copyStyle()
      }))
    };
  
}
