import { normalizeStremioSnapshot } from '../features/migration/index.js';
import { isAioMetadataAddon } from '../features/addons/index.js';

export async function readMigrationSnapshot(credentials, { readAccount, readWatched }) {
  const source = await readAccount(credentials);
  return normalizeStremioSnapshot(source, { signal: credentials.signal, readWatched, isMetadataAddon: isAioMetadataAddon });
}
