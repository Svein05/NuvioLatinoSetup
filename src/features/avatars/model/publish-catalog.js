import { avatarFile, registryFromPaths, registryPaths } from './registry.js';

function canonicalPath(value) {
  if (typeof value !== 'string') throw new Error('Ruta de avatar inválida.');
  const marker = 'assets/profile_icons/';
  const index = value.indexOf(marker);
  let path = index < 0 ? value : value.slice(index);
  if (index > 0) {
    try { path = decodeURI(path); } catch { /* A literal percent is a valid repository filename. */ }
  }
  if (!avatarFile(path)) throw new Error('Ruta de avatar inválida.');
  return path;
}

/** Apply only acknowledged publication operations, scoped by full path rather than filename. */
export function patchAvatarRegistry(registry, operations, previousPreviews = {}) {
  const paths = new Set(registryPaths(registry));
  const previews = { ...previousPreviews };
  for (const entry of operations.deletedFiles || []) {
    const path = canonicalPath(typeof entry === 'string' ? entry : entry.path);
    paths.delete(path);
    delete previews[path];
  }
  for (const entry of operations.renamedFiles || []) {
    const oldPath = canonicalPath(entry.oldPath);
    const newPath = canonicalPath(entry.newPath);
    if (!paths.delete(oldPath)) continue;
    paths.add(newPath);
    if (entry.newBase64 || previews[oldPath]) previews[newPath] = entry.newBase64 || previews[oldPath];
    delete previews[oldPath];
  }
  for (const entry of operations.replacedFiles || []) {
    const path = canonicalPath(entry.path);
    if (paths.has(path) && entry.base64) previews[path] = entry.base64;
  }
  for (const entry of operations.addedFiles || []) {
    const path = canonicalPath(entry.path);
    paths.add(path);
    if (entry.base64) previews[path] = entry.base64;
  }
  return { registry: registryFromPaths([...paths]), previews };
}
