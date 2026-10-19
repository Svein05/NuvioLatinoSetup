import previewData from '../data/previews.json' with { type: 'json' };

export function previewAudio(sec, { copyStyle, getImg, hasColorSuffix }) {
    const audioItems = previewData.ga;
    return {
      ...sec,
      name: sec.name || 'Audio',
      total: Math.max(sec.total || 16, 16),
      hiddenCount: Math.max(0, (sec.total || 16) - audioItems.length),
      items: audioItems.map(a => ({
        name: a.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/audio/${getImg('audio', a.base, a.color)}`,
        ...copyStyle(hasColorSuffix ? { text: a.hex, border: a.hex, bg: `${a.hex}24` } : {})
      }))
    };
  
}

export function previewResolution(sec, { copyStyle, getImg, hasColorSuffix }) {
    const resList = previewData.gr;
    return {
      ...sec,
      name: sec.name || 'Resolution',
      total: Math.max(sec.total || 9, 9),
      hiddenCount: Math.max(0, (sec.total || 9) - resList.length),
      items: resList.map(r => ({
        name: r.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/resolution/${getImg('resolution', r.base, r.color)}`,
        ...copyStyle(hasColorSuffix ? { text: r.hex, border: r.hex, bg: `${r.hex}24` } : {})
      }))
    };
  
}

export function previewChannels(sec, { copyStyle, getImg, hasColorSuffix }) {
    const chList = previewData.gc;
    return {
      ...sec,
      name: sec.name || 'Channels',
      total: Math.max(sec.total || 4, 4),
      hiddenCount: Math.max(0, (sec.total || 4) - chList.length),
      items: chList.map(c => ({
        name: c.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/channels/${getImg('channels', c.base, c.color)}`,
        ...copyStyle(hasColorSuffix ? { text: c.hex, border: c.hex, bg: `${c.hex}24` } : {})
      }))
    };
  
}

export function previewQuality(sec, { copyStyle, getImg, hasColorSuffix }) {
    const qList = previewData.gq;
    return {
      ...sec,
      name: sec.name || 'Quality',
      total: Math.max(sec.total || 12, 12),
      hiddenCount: Math.max(0, (sec.total || 12) - qList.length),
      items: qList.map(q => ({
        name: q.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/quality/${getImg('quality', q.base, q.color)}`,
        ...copyStyle(hasColorSuffix ? { text: q.hex, border: q.hex, bg: `${q.hex}24` } : {})
      }))
    };
  
}

export function previewVisual(sec, { copyStyle, getImg, hasColorSuffix }) {
    const vList = previewData.gv;
    return {
      ...sec,
      name: sec.name || 'Visual',
      total: vList.length,
      hiddenCount: 0,
      items: vList.map(v => ({
        name: v.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/visual/${getImg('visual', v.base, v.color)}`,
        ...copyStyle(hasColorSuffix ? { text: v.hex, border: v.hex, bg: `${v.hex}24` } : {})
      }))
    };
  
}

export function previewTags(sec, { copyStyle, getImg, hasColorSuffix }) {
    const tagList = previewData.gst;
    return {
      ...sec,
      name: sec.name || 'Special Tags',
      total: Math.max(sec.total || 16, 16),
      hiddenCount: Math.max(0, (sec.total || 16) - tagList.length),
      items: tagList.map(t => ({
        name: t.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/special-tags/${getImg('special-tags', t.base, t.color)}`,
        ...copyStyle(hasColorSuffix ? { text: t.hex, border: t.hex, bg: `${t.hex}24` } : {})
      }))
    };
  
}

export function previewStreaming(sec, { copyStyle, getImg, hasColorSuffix }) {
    const sList = previewData.gs;
    return {
      ...sec,
      name: sec.name || 'Streaming',
      total: Math.max(sec.total || 9, 9),
      hiddenCount: Math.max(0, (sec.total || 9) - sList.length),
      items: sList.map(s => ({
        name: s.name,
        img: `https://raw.githubusercontent.com/kingsizew/badges/main/badge-images/streaming/${getImg('streaming', s.base, s.color)}`,
        ...copyStyle(hasColorSuffix ? { text: s.hex, border: s.hex, bg: `${s.hex}24` } : {})
      }))
    };
  
}
