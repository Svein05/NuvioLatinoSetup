const PREFIX = 'assets/profile_icons/';
const imageFile = name => /\.(jpe?g|png|webp|svg)$/i.test(name) && !name.startsWith('.');

export function avatarFile(path) {
  if (typeof path !== 'string' || !path.startsWith(PREFIX)) return null;
  const parts = path.slice(PREFIX.length).split('/');
  if (![2, 3].includes(parts.length) || parts.some(part => !part || part === '.' || part === '..')) return null;
  const fileName = parts.at(-1);
  if (!imageFile(fileName)) return null;
  return { style: parts[0], franchise: parts.length === 3 ? parts[1] : 'General',
    isDirect: parts.length === 2, fileName };
}

export function registryFromPaths(paths) {
  const groups = new Map();
  for (const path of new Set(paths)) {
    const item = avatarFile(path);
    if (!item) continue;
    const key = JSON.stringify([item.style, item.franchise, item.isDirect]);
    if (!groups.has(key)) groups.set(key, { style: item.style, franchise: item.franchise,
      files: [], ...(item.isDirect ? { isDirect: true } : {}) });
    groups.get(key).files.push(item.fileName);
  }
  return [...groups.values()];
}

export function registryPaths(registry) {
  return registry.flatMap(group => group.files.map(file =>
    `${PREFIX}${group.style}/${group.isDirect ? '' : `${group.franchise}/`}${file}`));
}

export function isAvatarRegistry(value) {
  return Array.isArray(value) && value.every(group => group && typeof group.style === 'string'
    && typeof group.franchise === 'string' && Array.isArray(group.files)
    && group.files.every(file => typeof file === 'string'));
}
