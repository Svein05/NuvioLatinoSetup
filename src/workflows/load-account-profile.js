import { loadProfileOverviewSources } from './load-profile-overview.js';

/** Capture one profile's reads; callers decide whether the revision is still current. */
export async function loadAccountProfile(client, context) {
  const [addons, settings, credentials, overview] = await Promise.allSettled([
    client.listAddons(context),
    client.pullProfileSettings({ ...context, platform: 'tv' }),
    client.pullProviderCredentials(context),
    loadProfileOverviewSources(client, context),
  ]);
  return { addons, settings, credentials, overview };
}
