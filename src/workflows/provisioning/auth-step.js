async function performLogin({ client, config, auth, log }) {
  if (!auth?.email || !auth?.password) {
    throw new Error('Faltan credenciales de Nuvio. Ingresa tu correo y contraseña en el Paso 1.');
  }
  log(`Iniciando sesión con ${auth.email}...`, 'info');
  const loginData = await client.login({
    apiUrl: config.nuvioApiUrl,
    apikey: auth.apikey || config.nuvioPublicAnonKey,
    email: auth.email,
    password: auth.password,
  });
  auth.accessToken = loginData.accessToken;
  auth.userId = loginData.userId;
  auth.isAuthenticated = true;
  log('✓ Sesión iniciada con éxito en Nuvio API.', 'success');
  return loginData.accessToken;
}

async function resolveProfiles({ client, config, auth, state }) {
  const profiles = await client.getProfiles({
    apiUrl: config.nuvioApiUrl,
    apikey: auth.apikey || config.nuvioPublicAnonKey,
    accessToken: auth.accessToken,
    userId: auth.userId,
  });
  state.profiles = profiles;
  if (!state.selectedProfileId && Array.isArray(profiles) && profiles.length > 0) {
    state.selectedProfileId = profiles[0].id;
    state.selectedProfileName = profiles[0].name || profiles[0].title || 'Perfil Principal';
  }
}

export async function runAuthStep({ state, config, services, isSimulation, log }) {
  log('[2/5] Verificando autenticación y perfil de Nuvio...', 'info');
  let targetProfileId = state.selectedProfileId;
  let targetProfileName = state.selectedProfileName || 'Perfil Principal';

  if (isSimulation) {
    await (services.delay ? services.delay(600) : Promise.resolve());
    targetProfileId = targetProfileId || 'mock-profile-uuid-001';
    log(`✓ [Simulado] Sesión confirmada. Perfil objetivo: "${targetProfileName}"`, 'success');
    return { accessToken: 'mock-token', targetProfileId, targetProfileName };
  }

  const client = services.nuvioClient;
  if (!client) throw new Error('Cliente Nuvio no configurado.');

  let accessToken = state.nuvioAuth?.accessToken;
  if (!accessToken) {
    accessToken = await performLogin({ client, config, auth: state.nuvioAuth, log });
    await resolveProfiles({ client, config, auth: state.nuvioAuth, state });
    targetProfileId = state.selectedProfileId;
    targetProfileName = state.selectedProfileName || targetProfileName;
  }

  if (!targetProfileId) throw new Error('No se ha seleccionado ningún perfil de destino en el Paso 2.');
  log(`✓ Perfil seleccionado: "${targetProfileName}" (ID: ${targetProfileId})`, 'success');
  return { accessToken, targetProfileId, targetProfileName };
}
