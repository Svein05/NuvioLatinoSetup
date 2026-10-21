import { WorkerError, readBodyBytes } from '../middleware/http.js';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif' };

function imageUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new WorkerError('URL de imagen inválida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) throw new WorkerError('URL de imagen inválida.');
  return url.href;
}

async function imageAttachment(file) {
  if (!file || typeof file === 'string' || !TYPES[file.type] || !file.size || file.size > MAX_BYTES) throw new WorkerError('Archivo de imagen inválido.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const prefix = String.fromCharCode(...bytes);
  const type = TYPES[file.type];
  const valid = type === 'png' ? prefix.startsWith('\x89PNG\r\n\x1a\n') : type === 'webp'
    ? prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP' : type === 'jpg'
      ? prefix.startsWith('\xff\xd8\xff') : /^GIF8[79]a/.test(prefix);
  if (!valid) throw new WorkerError('La imagen no coincide con su formato.');
  return { file, extension: type };
}

export async function readAvatarSuggestion(request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new WorkerError('Se requiere un formulario multipart.');
  const bytes = await readBodyBytes(request, MAX_BYTES + 16384);
  let form;
  try { form = await new Request(request.url, { method: 'POST', headers: request.headers, body: bytes }).formData(); }
  catch { throw new WorkerError('Formulario inválido.'); }
  const allowed = ['requestId', 'mode', 'characterName', 'seriesName', 'url', 'file'];
  if ([...form.keys()].some(key => !allowed.includes(key) || form.getAll(key).length !== 1)) throw new WorkerError('Campos de formulario inválidos.');
  const text = name => typeof form.get(name) === 'string' ? form.get(name).trim() : '';
  const requestId = text('requestId');
  const characterName = text('characterName');
  const seriesName = text('seriesName');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)
    || !characterName || characterName.length > 100 || !seriesName || seriesName.length > 100) {
    throw new WorkerError('Identificador, personaje u obra inválidos.');
  }
  const mode = text('mode');
  if (mode === 'url' && !form.has('file')) return { requestId, mode, characterName, seriesName, url: imageUrl(text('url')) };
  if (mode !== 'file' || form.has('url')) throw new WorkerError('Modo de sugerencia inválido.');
  return { requestId, mode, characterName, seriesName, ...await imageAttachment(form.get('file')) };
}

function fileSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
}

export function suggestionDiscordPayload(suggestion, now = Date.now()) {
  const filename = `avatar_suggestion_${now}.${suggestion.extension || 'png'}`;
  const origin = suggestion.mode === 'file'
    ? { name: '📤 Método', value: `Subida Directa (${suggestion.file.name.slice(0, 180)} • ${fileSize(suggestion.file.size)})`, inline: false }
    : { name: '🔗 Enlace Original', value: suggestion.url.length > 1024 ? `${suggestion.url.slice(0, 1021)}…` : suggestion.url, inline: false };
  return { filename, payload: {
    username: 'Nuvio Avatar Bot',
    avatar_url: 'https://raw.githubusercontent.com/Svein05/NuvioLatinoSetup/develop/assets/logo/logo.webp',
    allowed_mentions: { parse: [] },
    embeds: [{ title: '🎨 Nueva Sugerencia de Avatar', description: 'Un usuario ha enviado una sugerencia para el catálogo de avatares.',
      color: 16766073, fields: [{ name: '👤 Personaje', value: suggestion.characterName, inline: true },
        { name: '🎬 Obra / Franquicia', value: suggestion.seriesName, inline: true }, origin],
      image: { url: suggestion.mode === 'file' ? `attachment://${filename}` : suggestion.url },
      footer: { text: 'Nuvio Latino Setup • Aportes de la Comunidad' }, timestamp: new Date(now).toISOString() }],
  } };
}
