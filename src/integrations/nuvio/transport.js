import { requestJson } from '../../shared/http/request-json.js';

export function createTransport({ apiUrl, apikey, accessToken, fetchImpl, signal }) {
  const root = new URL(`${apiUrl.replace(/\/+$/, '')}/rest/v1/`);
  return (resource, { method = 'POST', body, headers = {}, responseMetadata = false } = {}) => requestJson(
    new URL(resource, root).href,
    {
      method, signal, fetchImpl, responseMetadata,
      headers: {
        apikey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
}

export function isSchemaMismatch(error) {
  return error.status === 404 || ['PGRST202', 'PGRST203', '42883'].includes(error.code);
}
