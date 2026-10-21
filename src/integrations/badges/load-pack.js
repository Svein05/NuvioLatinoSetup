import { requestJson } from '../../shared/http/request-json.js';

function publicPackUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'raw.githubusercontent.com'
    || url.username || url.password || url.search) throw new Error('El pack debe usar una URL pública de GitHub Raw.');
  return url.href;
}

function validateDocument(data) {
  if (!data || (!Array.isArray(data) && !Array.isArray(data.filters))) {
    throw new Error('El pack de badges no contiene una lista de filtros válida.');
  }
  if (data.groups !== undefined && !Array.isArray(data.groups)) throw new Error('Los grupos del pack no son válidos.');
  return data;
}

/** Fetch only public badge catalogs; never convert an unavailable catalog to empty rules. */
export async function loadBadgePack(value, { fetchImpl = fetch, signal } = {}) {
  const url = publicPackUrl(value);
  let data;
  try {
    data = await requestJson(url, { fetchImpl, signal });
  } catch (error) {
    if (signal?.aborted || (error.status && error.status < 500)) throw error;
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    data = await requestJson(proxy, { fetchImpl, signal });
  }
  return validateDocument(data);
}
