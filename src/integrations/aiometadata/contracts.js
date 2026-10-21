import { HttpError } from '../../shared/http/request-json.js';

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function metadataProtocolError(operation, outcome = 'failed') {
  return Object.assign(new HttpError('AIOMetadata devolvió una respuesta que no permite confirmar la operación.', {
    code: 'INVALID_METADATA_RESPONSE', outcome,
  }), { operation });
}

export function metadataHttpsUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('La URL de AIOMetadata no es válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('AIOMetadata requiere una URL HTTPS sin credenciales ni fragmentos.');
  }
  return url;
}

export function metadataInstance(value) {
  const url = metadataHttpsUrl(value);
  if (url.search) throw new Error('La instancia de AIOMetadata no puede contener parámetros.');
  return url.href.replace(/\/+$/, '');
}

export function metadataIdentifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(value)) {
    throw new Error('El identificador de AIOMetadata no es válido.');
  }
  return value;
}

/** Preserve URL path casing and subdirectory when resolving the configuration owner. */
export function metadataOwner(manifestUrl) {
  const url = metadataHttpsUrl(manifestUrl);
  const match = url.pathname.match(/^(.*?)(?:\/stremio)?\/([a-zA-Z0-9_-]+)\/manifest\.json$/);
  if (!match) throw new Error('Se necesita el manifiesto del addon para identificar su instancia de AIOMetadata.');
  return { instanceUrl: `${url.origin}${match[1]}`, uuid: metadataIdentifier(match[2]) };
}

export function configurationEnvelope(payload) {
  if (!isRecord(payload) || typeof payload.password !== 'string' || !payload.password.trim()) {
    throw new Error('Introduce la contraseña de configuración de AIOMetadata.');
  }
  const bareConfig = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'password'));
  const config = Object.hasOwn(payload, 'config') ? payload.config : bareConfig;
  if (!isRecord(config) || !Object.keys(config).length) throw new Error('La configuración de AIOMetadata está vacía.');
  return { password: payload.password, config: structuredClone(config) };
}

export function savedMetadata(data, instanceUrl) {
  if (!isRecord(data) || data.success === false) throw metadataProtocolError('create', data?.success === false ? 'failed' : 'unknown');
  const uuid = data.userUUID || data.uuid || data.id || data.configId;
  if (typeof uuid !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(uuid)) throw metadataProtocolError('create', 'unknown');
  const manifestUrl = data.installUrl || `${instanceUrl}/stremio/${uuid}/manifest.json`;
  try { metadataHttpsUrl(manifestUrl); } catch { throw metadataProtocolError('create', 'unknown'); }
  return { uuid, manifestUrl, instanceUrl, raw: data };
}

export function loadedMetadata(data, instanceUrl) {
  if (!isRecord(data) || data.success === false || data.error) throw metadataProtocolError('load');
  const config = Object.hasOwn(data, 'config') ? data.config : data;
  if (!isRecord(config)) throw metadataProtocolError('load');
  const bareConfig = ['catalogs', 'apiKeys', 'search', 'posterRatingProvider'].some(key => Object.hasOwn(config, key));
  if (!Object.hasOwn(data, 'config') && !bareConfig) throw metadataProtocolError('load');
  return { config: structuredClone(config), hasPassword: Boolean(data.hasPassword), instanceUrl, raw: data };
}

export function updatedMetadata(data, uuid, instanceUrl) {
  if (!isRecord(data) || data.success !== true || (data.userUUID && data.userUUID !== uuid)) {
    throw metadataProtocolError('update', data?.success === false ? 'failed' : 'unknown');
  }
  return { success: true, uuid, instanceUrl };
}
