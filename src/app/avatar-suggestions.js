import { CONFIG } from './config.js';
import { createSuggestionCooldown, mountAvatarSuggestions } from '../features/avatars/index.js';
import { createAvatarSuggestionsClient } from '../integrations/worker/avatar-suggestions.js';
import { createAvatarSuggestionSubmission } from '../workflows/submit-avatar-suggestion.js';

const cooldown = createSuggestionCooldown({ storage: {
  getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
} });
const submission = createAvatarSuggestionSubmission({ client: createAvatarSuggestionsClient(CONFIG.WORKER_API_URL), cooldown });
let dispose;
let options;

export function initAvatarSuggestionsUI(configuration) {
  options = configuration;
  dispose ||= mountAvatarSuggestions({ submission, getAccessToken: () => options.getAccessToken() });
  return dispose;
}

window.addEventListener('pagehide', () => { dispose?.(); dispose = null; });
window.addEventListener('pageshow', event => { if (event.persisted && options) initAvatarSuggestionsUI(options); });
