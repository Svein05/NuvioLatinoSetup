import { WorkerError } from '../middleware/http.js';
import { suggestionDiscordPayload } from '../services/avatar-suggestion.js';

export function suggestionWebhook(env) {
  let url;
  try { url = new URL(env.AVATAR_SUGGESTION_WEBHOOK_URL); } catch { throw new WorkerError('Sugerencias no configuradas.', 503); }
  if (url.origin !== 'https://discord.com' || !/^\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+$/.test(url.pathname)
    || url.search || url.hash || url.username || url.password) throw new WorkerError('Sugerencias no configuradas.', 503);
  url.searchParams.set('wait', 'true');
  return url.href;
}

export async function deliverDiscordSuggestion(webhook, suggestion, fetchImpl) {
  const { filename, payload } = suggestionDiscordPayload(suggestion);
  let body;
  let headers;
  if (suggestion.mode === 'file') {
    body = new FormData();
    body.set('payload_json', JSON.stringify(payload));
    body.set('files[0]', suggestion.file, filename);
  } else {
    body = JSON.stringify(payload);
    headers = { 'Content-Type': 'application/json' };
  }
  let response;
  try { response = await fetchImpl(webhook, { method: 'POST', body, headers, redirect: 'error', signal: AbortSignal.timeout(10000) }); }
  catch { throw new WorkerError('No se pudo confirmar el envío a Discord.', 502, 'unknown'); }
  if (!response.ok) {
    const known = [400, 401, 403, 404, 413, 429].includes(response.status);
    throw new WorkerError('Discord no confirmó la sugerencia.', known ? 422 : 502, known ? 'failed' : 'unknown');
  }
  let message;
  try { message = await response.json(); } catch { throw new WorkerError('No se pudo confirmar el mensaje de Discord.', 502, 'unknown'); }
  if (typeof message?.id !== 'string' || !/^\d+$/.test(message.id)) throw new WorkerError('No se pudo confirmar el mensaje de Discord.', 502, 'unknown');
}
