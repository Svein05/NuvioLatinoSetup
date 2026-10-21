import {
  addCustomBadgePack,
  listBadgePacks,
  getCanonicalModuleId,
  getBadgeModuleLabel,
  normalizeBadgeColor,
} from '../../../features/badges/index.js';

export function tryRepairJson(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    let repaired = jsonStr.replace(/,\s*([\]}])/g, '$1');
    repaired = repaired.replace(/(["\dtruefalsenull\]}])\s*\n\s*("[a-zA-Z0-9_$-]+"\s*:)/g, '$1,\n$2');
    return JSON.parse(repaired);
  }
}

function normalizeRawUrl(url) {
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  if (url.includes('gist.github.com/') && !url.includes('/raw')) {
    return url.replace('gist.github.com', 'gist.githubusercontent.com') + '/raw';
  }
  if (url.includes('pastebin.com/') && !url.includes('/raw/')) {
    return url.replace('pastebin.com/', 'pastebin.com/raw/');
  }
  return url;
}

async function fetchSourceJson(rawUrl) {
  const fetchUrl = normalizeRawUrl(rawUrl);
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return tryRepairJson(await res.text());
  } catch {
    const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`);
    if (!proxyRes.ok) throw new Error(`Proxy HTTP ${proxyRes.status}`);
    return tryRepairJson(await proxyRes.text());
  }
}

function parseSectionsFromBadger(parsedData) {
  const groups = parsedData.groups || [];
  const filters = parsedData.filters || (Array.isArray(parsedData) ? parsedData : []);
  if (!groups.length && !filters.length) {
    return [{ id: 'custom', name: 'Personalizado', total: 3, hiddenCount: 0, items: [
      { name: '4K', text: '#FFD500', border: '#FFD500', bg: 'rgba(255,213,0,0.15)' },
      { name: 'HDR', text: '#BBDEFB', border: '#BBDEFB', bg: 'rgba(187,222,251,0.15)' },
      { name: 'Atmos', text: '#E040FB', border: '#E040FB', bg: 'rgba(224,64,251,0.15)' },
    ] }];
  }

  const groupMap = new Map();
  groups.forEach(g => {
    const gid = getCanonicalModuleId(g.id || 'gr') || (g.id || 'gr').trim();
    groupMap.set(gid, { id: gid, name: g.name || getBadgeModuleLabel(gid), items: [], total: 0 });
  });

  filters.forEach(f => {
    if (f.isEnabled === false) return;
    const gid = getCanonicalModuleId(f.groupId || 'gr') || (f.groupId || 'gr').trim();
    let g = groupMap.get(gid);
    if (!g) {
      g = { id: gid, name: f.groupName || getBadgeModuleLabel(gid, gid.toUpperCase()), items: [], total: 0 };
      groupMap.set(gid, g);
    }
    g.total++;
    if (g.items.length < 24) {
      g.items.push({
        name: f.name || 'Badge', img: f.imageURL || null,
        text: normalizeBadgeColor(f.textColor, '#ffffff'),
        border: normalizeBadgeColor(f.borderColor, 'rgba(255,255,255,0.2)'),
        bg: normalizeBadgeColor(f.tagColor, 'rgba(255,255,255,0.08)'),
        style: f.tagStyle || 'filled',
      });
    }
  });

  return Array.from(groupMap.values()).map(g => ({
    id: g.id, name: g.name, total: g.total,
    hiddenCount: Math.max(0, g.total - g.items.length), items: g.items,
  })).filter(g => g.items.length > 0);
}

function resolvePackMeta(parsedData, { isUrl, source, customName }) {
  let author = (parsedData.author || parsedData.creator || '').trim();
  if (!author && isUrl) {
    const gh = source.match(/(?:githubusercontent\.com|github\.com)\/([^/]+)/i);
    if (gh?.[1] && !['raw', 'gist'].includes(gh[1])) author = gh[1];
  }
  author = author || 'Personalizado';

  let authorUrl = (parsedData.authorUrl || '').trim();
  if (!authorUrl && author !== 'Personalizado') authorUrl = `https://github.com/${author}`;
  else if (!authorUrl && isUrl) authorUrl = source;

  let name = (customName || parsedData.name || parsedData.title || '').trim();
  if (!name && isUrl) {
    const file = source.split('/').pop().replace(/\.json$/i, '').replace(/[-_]/g, ' ');
    if (file) name = file.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  name = name || `Estilo Personalizado #${listBadgePacks().filter(p => p.isCustom).length + 1}`;

  return { author, authorUrl, name };
}

export async function importCustomBadgeFromSource(source, customName = '') {
  const isUrl = /^https?:\/\//i.test(source);
  const parsedData = isUrl ? await fetchSourceJson(source) : tryRepairJson(source);
  const sections = parseSectionsFromBadger(parsedData);
  const { author, authorUrl, name } = resolvePackMeta(parsedData, { isUrl, source, customName });
  const customId = `custom-${Date.now()}`;

  const pack = {
    id: customId, name, author, authorUrl,
    description: isUrl ? `Estilo importado desde URL: ${source}` : 'Estilo personalizado cargado mediante código JSON directo.',
    rawV2: isUrl ? source : null, rawV1: isUrl ? source : null,
    customJson: isUrl ? null : parsedData,
    isCustom: true, tags: ['Personalizado', 'Importado'], accentColor: '#10b981',
    sections,
  };

  addCustomBadgePack(pack);
  return pack;
}
