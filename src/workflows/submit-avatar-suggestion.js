import { prepareAvatarSuggestion } from '../features/avatars/index.js';

async function fingerprint(suggestion) {
  const data = suggestion.mode === 'file' ? await suggestion.file.arrayBuffer() : new TextEncoder().encode(suggestion.url);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return JSON.stringify([suggestion.mode, suggestion.characterName, suggestion.seriesName,
    [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')]);
}

async function submit(context, draft, options) {
  const suggestion = prepareAvatarSuggestion(draft);
  if (context.cooldown.remaining() > 0) throw new Error(`Debes esperar ${context.cooldown.remaining()} segundos antes de enviar otra sugerencia.`);
  const key = await fingerprint(suggestion);
  const previous = context.requests.get(key);
  if (previous?.status === 'unknown') throw Object.assign(new Error('El envío anterior quedó sin confirmar. Comprueba su recepción antes de reenviar.'), { outcome: 'unknown' });
  const request = previous || { requestId: context.createId(), status: 'pending' };
  context.requests.set(key, request);
  try {
    const result = await context.client.send(suggestion, { ...options, requestId: request.requestId });
    request.status = 'sent';
    context.cooldown.confirm();
    return result;
  } catch (error) {
    request.status = error.outcome === 'unknown' ? 'unknown' : 'failed';
    throw error;
  }
}

export function createAvatarSuggestionSubmission({ client, cooldown, createId = () => crypto.randomUUID() }) {
  const context = { client, cooldown, createId, requests: new Map() };
  let pending;
  return {
    remaining: () => cooldown.remaining(),
    send(draft, options = {}) {
      if (!pending) pending = submit(context, draft, options).finally(() => { pending = null; });
      return pending;
    },
  };
}
