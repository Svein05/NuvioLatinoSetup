export function validateStremioStep(step, state) {
  if (step === 1) return { valid: Boolean(state.stremio?.session), error: 'Conecta tu cuenta de Stremio para continuar.' };
  if (step === 2) return { valid: true };
  if (step === 3) return { valid: Boolean(state.stremio?.selected?.length), error: 'Selecciona al menos un catálogo.' };
  if (step === 6) return { valid: Boolean(state.stremio?.session), error: 'Vuelve a conectar tu cuenta de Stremio.' };
  return null;
}
