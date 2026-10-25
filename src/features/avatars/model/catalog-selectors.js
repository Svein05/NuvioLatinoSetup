import { formatStyleName, formatFranchiseName } from './names.js';
import { compareAvatars } from './order.js';

export function getStylesSummary(avatars) {
  const counts = new Map(['NetflixStyle', 'IconsStyle', 'MangaStyle'].map(style => [style, 0]));
  for (const avatar of avatars) counts.set(avatar.style, (counts.get(avatar.style) || 0) + 1);
  return [{ id: 'all', name: 'Todos los estilos', count: avatars.length },
    ...[...counts].map(([id, count]) => ({ id, name: formatStyleName(id), count }))];
}

export function getFranchisesSummary(selectedStyle = 'all', avatars = []) {
  const filtered = selectedStyle === 'all' ? avatars : avatars.filter(item => item.style === selectedStyle);
  const counts = new Map();
  for (const avatar of filtered) counts.set(avatar.franchise, (counts.get(avatar.franchise) || 0) + 1);
  const entries = [...counts].map(([id, count]) => ({ id, name: formatFranchiseName(id), count }));
  entries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  return [{ id: 'all', name: 'Todas las obras', count: filtered.length }, ...entries];
}

const matchesCharacter = (item, query) => item.character.toLowerCase().includes(query)
  || Boolean(item.baseCharacter?.toLowerCase().includes(query));
const matchesFranchise = (item, query) => item.franchiseName.toLowerCase().includes(query);

export function filterAvatars({ style = 'all', franchise = 'all', query = '' }, avatars = []) {
  let text = String(query || '').trim().toLowerCase();
  const base = avatars.filter(item => (style === 'all' || item.style === style) && (franchise === 'all' || item.franchise === franchise));
  if (!text) return base.sort(compareAvatars);
  const prefix = text.match(/^(pj|personaje|char|ob|obra|serie|fran):\s*/i);
  if (prefix) {
    text = text.slice(prefix[0].length).trim();
    const match = /^(pj|personaje|char)$/i.test(prefix[1]) ? matchesCharacter : matchesFranchise;
    return base.filter(item => match(item, text)).sort(compareAvatars);
  }
  const characters = base.filter(item => matchesCharacter(item, text));
  if (!characters.length) return base.filter(item => matchesFranchise(item, text)).sort(compareAvatars);
  if (text.length < 10 && !text.includes(' ')) return characters.sort(compareAvatars);
  const combined = new Map(characters.map(item => [item.id, item]));
  for (const item of base.filter(item => matchesFranchise(item, text))) {
    if (!combined.has(item.id)) combined.set(item.id, item);
  }
  return [...combined.values()].sort((a, b) => Number(matchesCharacter(b, text)) - Number(matchesCharacter(a, text)) || compareAvatars(a, b));
}
