/** Authentication and profile provisioning are coordinated without committing partial UI state. */
export async function authenticateWizard({ mode, credentials, context, client }) {
  const authenticate = mode === 'signup' ? client.signup.bind(client) : client.login.bind(client);
  const auth = await authenticate({ ...context, email: credentials.email, password: credentials.password });
  const session = { ...context, accessToken: auth.accessToken, userId: auth.userId };
  let profiles = await client.getProfiles(session);
  if (!Array.isArray(profiles)) throw new Error('Nuvio devolvió una lista de perfiles inválida.');
  if (!profiles.length) profiles = [await client.createProfile({ ...session, name: 'Principal' })];
  return { auth, profiles, email: credentials.email.trim(), warnings: profiles.flatMap(profile => profile.warnings || []) };
}
