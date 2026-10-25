import { SUGGESTION_COOLDOWN_MS } from '../model/suggestion.js';

export function createSuggestionCooldown({ storage, now = Date.now, reportWarning = console.warn }) {
  let confirmedAt = null;
  return {
    remaining() {
      let persisted = null;
      try { persisted = storage.getItem('nuvio_last_avatar_suggestion'); }
      catch { reportWarning('No se pudo leer la espera entre sugerencias.'); }
      const timestamp = confirmedAt ?? (persisted === null ? NaN : Number(persisted));
      const elapsed = now() - timestamp;
      return Number.isFinite(timestamp) && elapsed >= 0 ? Math.max(0, Math.ceil((SUGGESTION_COOLDOWN_MS - elapsed) / 1000)) : 0;
    },
    confirm() {
      confirmedAt = now();
      try { storage.setItem('nuvio_last_avatar_suggestion', String(confirmedAt)); }
      catch { reportWarning('No se pudo guardar la espera entre sugerencias.'); }
    },
  };
}
