export const SUGGESTION_MAX_BYTES = 8 * 1024 * 1024;
export const SUGGESTION_COOLDOWN_MS = 120000;
export const SUGGESTION_TYPES = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg', 'image/gif'];

export function formatSuggestionFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function suggestionImageUrl(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('Ingresa una URL HTTPS válida para la imagen.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) throw new Error('Ingresa una URL HTTPS válida para la imagen.');
  return url.href;
}

export function validateSuggestionFile(file) {
  if (!file) throw new Error('Por favor selecciona una imagen para subir.');
  if (!SUGGESTION_TYPES.includes(file.type?.toLowerCase())) throw new Error('Formato no compatible. Por favor sube una imagen PNG, WebP, JPG o GIF.');
  if (!file.size || file.size > SUGGESTION_MAX_BYTES) throw new Error('La imagen debe tener contenido y no superar 8 MB.');
  return file;
}

export function prepareAvatarSuggestion(draft) {
  const characterName = String(draft.characterName || '').trim();
  const seriesName = String(draft.seriesName || '').trim();
  if (!characterName || characterName.length > 100) throw new Error('Ingresa el nombre del personaje (máximo 100 caracteres).');
  if (!seriesName || seriesName.length > 100) throw new Error('Ingresa la obra o serie (máximo 100 caracteres).');
  if (draft.mode === 'file') return { mode: 'file', characterName, seriesName, file: validateSuggestionFile(draft.file) };
  if (draft.mode !== 'url') throw new Error('Selecciona archivo o URL.');
  return { mode: 'url', characterName, seriesName, url: suggestionImageUrl(draft.url) };
}
