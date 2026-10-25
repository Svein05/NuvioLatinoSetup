export function selectedAiProvider(keys) {
  return keys.openrouter ? 'openrouter' : keys.gemini ? 'gemini' : null;
}
