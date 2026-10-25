import { compileRegistry } from '../model/compile-registry.js';
import { isAvatarRegistry, registryPaths } from '../model/registry.js';
import { patchAvatarRegistry } from '../model/publish-catalog.js';

function compile(registry, previews, relativePrefix) {
  const paths = registryPaths(registry);
  const compiled = compileRegistry(registry, { relativePrefix });
  const byFile = new Map(paths.map(path => [`${relativePrefix}${path.split('/').map(encodeURIComponent).join('/')}`, previews[path]]));
  return compiled.map(avatar => {
    const base64 = byFile.get(avatar.path);
    return base64 ? { ...avatar, path: `data:image/webp;base64,${base64}` } : avatar;
  });
}

/** One owner of the registry, compiled snapshots and publication revision. */
export function createAvatarCatalogStore({ relativePrefix = './' } = {}) {
  let registry = [];
  let avatars = [];
  let previews = {};
  let commitSha = null;
  let loaded = false;
  let revision = 0;
  return {
    revision: () => revision,
    begin: () => ++revision,
    commitSha: () => commitSha,
    loaded: () => loaded,
    avatars: () => avatars.map(avatar => ({ ...avatar })),
    registry: () => structuredClone(registry),
    accept(next, sha = null) {
      if (!isAvatarRegistry(next)) throw new Error('Registro de avatares inválido.');
      registry = structuredClone(next);
      previews = {};
      avatars = compileRegistry(registry, { relativePrefix });
      commitSha = sha;
      loaded = true;
    },
    patch(operations) {
      const next = patchAvatarRegistry(registry, operations, previews);
      const compiled = compile(next.registry, next.previews, relativePrefix);
      registry = next.registry;
      previews = next.previews;
      avatars = compiled;
      commitSha = null;
      loaded = true;
      revision++;
      return avatars.map(avatar => ({ ...avatar }));
    },
  };
}
