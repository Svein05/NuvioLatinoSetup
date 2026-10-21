function countActiveCollections(collections = []) {
  let count = 0;
  for (const section of collections) {
    if (section.enabled === false) continue;
    for (const folder of section.folders || []) {
      if (folder.enabled !== false) count++;
    }
  }
  return count;
}

function validateStep4Keys(apiKeys, searchAiEnabled, apiKeysValidated) {
  if (!apiKeys?.tmdb || apiKeys.tmdb.trim().length < 8) {
    return { valid: false, error: 'La TMDB API Key es obligatoria (mínimo 8 caracteres).' };
  }
  if (!apiKeys?.mdblist || apiKeys.mdblist.trim().length < 8) {
    return {
      valid: false,
      error: 'La MDBList API Key es obligatoria (mínimo 8 caracteres) para calificaciones y personalización de pósters.',
    };
  }
  if (searchAiEnabled && !apiKeys.gemini && !apiKeys.openrouter) {
    return {
      valid: false,
      error: 'Activaste la búsqueda con IA: debes ingresar al menos una clave (Google Gemini u OpenRouter).',
    };
  }
  if (!apiKeysValidated) {
    return {
      valid: false,
      error: 'Debes verificar tus claves pulsando el botón "Probar Claves API" antes de continuar al siguiente paso.',
    };
  }
  return { valid: true, error: null };
}

export function validateWizardStep(stepNumber, state) {
  if (stepNumber === 1) {
    if (!state.isManualMode && (!state.nuvioAuth?.isAuthenticated || !state.nuvioAuth?.accessToken)) {
      return {
        valid: false,
        error: 'Debes iniciar sesión con tu cuenta de Nuvio (o pulsar "Continuar sin cuenta") para continuar al siguiente paso.',
      };
    }
    return { valid: true, error: null };
  }
  if (stepNumber === 2) {
    if (!state.isManualMode && !state.selectedProfileId) {
      return { valid: false, error: 'Debes seleccionar un perfil de destino para continuar.' };
    }
    return { valid: true, error: null };
  }
  if (stepNumber === 3) {
    return countActiveCollections(state.collections) === 0
      ? { valid: false, error: 'Debes tener activada al menos una colección en el NUVIO.' }
      : { valid: true, error: null };
  }
  if (stepNumber === 4) {
    return validateStep4Keys(state.apiKeys, state.searchAiEnabled, state.apiKeysValidated);
  }
  if (stepNumber === 7) {
    const password = state.aiometadata?.password;
    if (!password || password.trim().length < 6) {
      return {
        valid: false,
        error: 'Debes definir una contraseña de al menos 6 caracteres para tus addons de AIOMetadata y AIOStreams (o pulsar "Generar aleatoria").',
      };
    }
    return { valid: true, error: null };
  }
  if (stepNumber === 6 && !state.isManualMode && state.selectedProfileId
    && String(state.hasLoadedAddonsForProfile) !== String(state.selectedProfileId)) {
    return { valid: false, error: 'Espera a que se carguen los addons del perfil o reintenta su carga.' };
  }
  return { valid: true, error: null };
}
