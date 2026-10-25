import { WorkerError, json } from '../middleware/http.js';
import { authenticatedNuvioUser } from '../middleware/nuvio-user.js';
import { avatarRedis } from '../integrations/avatar-redis.js';
import { suggestionWebhook, deliverDiscordSuggestion } from '../integrations/discord-suggestion.js';
import { readAvatarSuggestion } from '../services/avatar-suggestion.js';
import { createSuggestionDelivery } from '../services/suggestion-delivery.js';

export async function avatarSuggestionsRoute(request, env, fetchImpl) {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const user = await authenticatedNuvioUser(request, env, fetchImpl);
  const suggestion = await readAvatarSuggestion(request);
  const webhook = suggestionWebhook(env);
  const delivery = await createSuggestionDelivery(avatarRedis(env, fetchImpl), user, suggestion.requestId);
  const reserved = await delivery.reserve();
  if (reserved === 'sent') return json({ status: 'sent' });
  if (reserved === 'limited') return json({ error: 'Espera 120 segundos antes de enviar otra sugerencia.' }, 429);
  if (reserved !== 'reserved') throw new WorkerError('Hay un envío pendiente de confirmación. No se repetirá.', 502, 'unknown');
  try { await deliverDiscordSuggestion(webhook, suggestion, fetchImpl); }
  catch (error) {
    try { await delivery.finish(error.outcome === 'unknown' ? 'unknown' : 'failed'); }
    catch { console.warn('No se pudo actualizar el estado de una sugerencia fallida.'); }
    throw error;
  }
  try { await delivery.finish('sent'); }
  catch { console.warn('Discord confirmó el envío, pero no se pudo actualizar su marca de deduplicación.'); }
  return json({ status: 'sent' });
}
