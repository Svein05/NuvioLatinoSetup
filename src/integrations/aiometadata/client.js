import { HttpError, requestJson } from '../../shared/http/request-json.js';
import {
  configurationEnvelope, isRecord, loadedMetadata, metadataHttpsUrl, metadataIdentifier,
  metadataInstance, metadataProtocolError, savedMetadata, updatedMetadata,
} from './contracts.js';

async function metadataRequest(url, { operation, ...options }) {
  options.signal?.throwIfAborted();
  try {
    return await requestJson(url, { redirect: 'error', credentials: 'omit', ...options });
  } catch (error) {
    options.signal?.throwIfAborted();
    const read = operation === 'load' || operation === 'manifest';
    const unknown = error.outcome === 'unknown' || error.status >= 500 || error.status === 408;
    throw Object.assign(new HttpError(`AIOMetadata: ${error.message}`, {
      status: error.status, code: error.code, outcome: read ? 'failed' : unknown ? 'unknown' : 'failed', cause: error,
    }), { operation });
  }
}

/** HTTP adapter. Owns neither UI state nor instance selection, and never retries writes. */
export function createAiometadataClient(options = {}) {
  const request = (url, init) => metadataRequest(url, { ...options, ...init });
  const json = (operation, method, body, signal) => ({
    operation, method, signal, body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  return {
    async saveConfiguration(instance, payload, { signal } = {}) {
      const root = metadataInstance(instance);
      const body = configurationEnvelope(payload);
      const data = await request(`${root}/api/config/save`, json('create', 'POST', body, signal));
      return savedMetadata(data, root);
    },
    async loadConfiguration(instance, uuid, password, { signal } = {}) {
      const root = metadataInstance(instance);
      const id = metadataIdentifier(uuid);
      if (typeof password !== 'string') throw new Error('Introduce la contraseña de AIOMetadata.');
      const data = await request(`${root}/api/config/load/${id}`, json('load', 'POST', { password }, signal));
      return loadedMetadata(data, root);
    },
    async updateConfiguration(instance, uuid, payload, { signal } = {}) {
      const root = metadataInstance(instance);
      const id = metadataIdentifier(uuid);
      const body = configurationEnvelope(payload);
      const data = await request(`${root}/api/config/update/${id}`, json('update', 'PUT', body, signal));
      return updatedMetadata(data, id, root);
    },
    async fetchManifest(manifestUrl, { signal } = {}) {
      const url = metadataHttpsUrl(manifestUrl);
      const data = await request(url.href, { operation: 'manifest', method: 'GET', signal, headers: { Accept: 'application/json' } });
      if (!isRecord(data) || typeof data.id !== 'string' || typeof data.name !== 'string') throw metadataProtocolError('manifest');
      return data;
    },
  };
}
