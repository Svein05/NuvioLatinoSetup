import { checkAvatarFilenameCollision } from './modder-collision.js';

export function isAvatarPathSegment(value) {
  return typeof value === 'string' && value.trim() && !/[/\\<>]/.test(value)
    && [...value].every(char => char.charCodeAt(0) >= 32)
    && !value.trim().startsWith('.');
}

/** One naming contract for previews, collision checks and publication payloads. */
export function prepareModderBatch({ queue, style, franchise, allAvatars = [], history = [], overrides }) {
  if (!isAvatarPathSegment(style) || !isAvatarPathSegment(franchise)) throw new Error('Selecciona un estilo y una obra válidos.');
  if (!queue?.length) throw new Error('La cola de imágenes está vacía.');
  const names = new Set();
  return queue.map(item => {
    const characterName = String(item.characterName ?? item.fileName ?? '').trim().replace(/\.webp$/i, '');
    if (!isAvatarPathSegment(characterName)) throw new Error('Cada imagen necesita un nombre válido, sin rutas.');
    const filename = `${characterName}.webp`;
    const collision = checkAvatarFilenameCollision({ style, franchise, targetFilename: filename, allAvatars, history, overrides });
    if (names.has(filename.toLocaleLowerCase()) || collision.hasCollision) throw new Error(`El nombre ${filename} ya está en uso.`);
    names.add(filename.toLocaleLowerCase());
    return { filename, characterName, base64: item.base64, previewUrl: item.previewUrl, webpSize: item.webpSize };
  });
}
