export function publicCatalog(paths, revision = 'a'.repeat(40)) {
  const registry = [];
  for (const path of paths) {
    const parts = path.replace(/^assets\/profile_icons\//, '').split('/');
    const style = parts[0];
    const franchise = parts.length === 3 ? parts[1] : 'General';
    let group = registry.find(item => item.style === style && item.franchise === franchise);
    if (!group) {
      group = { style, franchise, files: [], ...(parts.length === 2 ? { isDirect: true } : {}) };
      registry.push(group);
    }
    group.files.push(parts.at(-1));
  }
  return { registry, revision, hashes: {}, updatedAt: Date.now(), stale: false };
}
