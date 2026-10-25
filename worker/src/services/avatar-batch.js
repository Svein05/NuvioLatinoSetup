import { WorkerError } from '../middleware/http.js';

function safePath(value) {
  if (typeof value !== 'string' || value !== value.trim() || value.includes('\\') || value.includes('%')) return false;
  const segments = value.split('/');
  return value.startsWith('assets/profile_icons/') && segments.length >= 4
    && !segments.some(segment => !segment || segment === '.' || segment === '..')
    && /\.(webp|png|jpe?g|svg)$/i.test(value) && ![...value].some(character => character.codePointAt(0) < 32);
}

function validateImage(file, field = 'base64') {
  const value = file[field];
  if (typeof value !== 'string' || !value || value.length > 8 * 1024 * 1024
    || value.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new WorkerError('Contenido de imagen inválido o demasiado grande.');
  const prefix = atob(value.slice(0, 32));
  const target = file.newPath || file.path;
  const extension = target.split('.').at(-1).toLowerCase();
  const valid = extension === 'webp' ? prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP'
    : extension === 'png' ? prefix.startsWith('\x89PNG\r\n\x1a\n')
      : ['jpg', 'jpeg'].includes(extension) && prefix.startsWith('\xff\xd8\xff');
  if (!valid) throw new WorkerError('La imagen no coincide con su extensión. Publica imágenes WebP, PNG o JPEG.');
}

function entries(value, name) {
  const items = value ?? [];
  if (!Array.isArray(items)) throw new WorkerError(`Lista inválida: ${name}.`);
  return items;
}

/** Validate the entire batch before any GitHub call. Paths retain their original case. */
export function validateAvatarBatch(payload) {
  const addedFiles = entries(payload.addedFiles, 'addedFiles');
  const replacedFiles = entries(payload.replacedFiles, 'replacedFiles');
  const renamedFiles = entries(payload.renamedFiles, 'renamedFiles');
  const deletedFiles = entries(payload.deletedFiles, 'deletedFiles');
  const count = addedFiles.length + replacedFiles.length + renamedFiles.length + deletedFiles.length;
  if (!count || count > 100) throw new WorkerError('El lote debe contener entre 1 y 100 operaciones.');
  const paths = [...addedFiles.map(file => file?.path), ...replacedFiles.map(file => file?.path),
    ...renamedFiles.flatMap(file => [file?.oldPath, file?.newPath]), ...deletedFiles];
  if (!paths.every(safePath)) throw new WorkerError('Ruta no autorizada; usa imágenes dentro de assets/profile_icons/.', 403);
  const targets = [...addedFiles, ...replacedFiles].map(file => file.path).concat(renamedFiles.map(file => file.newPath));
  if (new Set(targets).size !== targets.length) throw new WorkerError('El lote contiene destinos duplicados.');
  const removed = [...deletedFiles, ...renamedFiles.filter(file => file.oldPath !== file.newPath).map(file => file.oldPath)];
  if (new Set(removed).size !== removed.length || targets.some(target => removed.includes(target))) {
    throw new WorkerError('El lote contiene cambios incompatibles sobre una misma ruta.');
  }
  for (const file of [...addedFiles, ...replacedFiles]) validateImage(file);
  for (const file of renamedFiles) if (file.newBase64) validateImage(file, 'newBase64');
  if (payload.customCommitMessage !== undefined && (typeof payload.customCommitMessage !== 'string' || payload.customCommitMessage.length > 500)) {
    throw new WorkerError('El mensaje de commit no es válido.');
  }
  return { addedFiles, replacedFiles, renamedFiles, deletedFiles,
    skipCi: payload.skipCi !== false, customCommitMessage: payload.customCommitMessage?.trim() || '' };
}
