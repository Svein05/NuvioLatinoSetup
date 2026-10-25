import { normalizeAvatarStorageKey } from '../../features/avatars/index.js';

export function rankedCarouselPaths(paths, ranking) {
  const available = new Map(paths.map(path => [normalizeAvatarStorageKey(path), path]));
  const selected = [...new Set(ranking.map(item => available.get(item.key)).filter(Boolean))];
  return selected.length ? selected : paths.slice(0, 14);
}
