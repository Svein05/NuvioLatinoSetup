import { corsHeaders, json } from '../middleware/http.js';

const publicHosts = [
  'aiostreamsfortheweebsstable.midnightignite.me', 'aiometadatafortheweebs.midnightignite.me',
  'aiometadata.viren070.me', 'aiometadata.fortheweak.cloud', 'aiometadata.elfhosted.com',
];

export async function proxyRoute(request, env, fetchImpl) {
  const origin = new URL(request.url).origin;
  let target;
  try { target = new URL(request.url.slice(origin.length + 1)); }
  catch { return json({ error: 'URL de destino inválida.' }, 400); }
  const allowed = env.PROXY_ALLOWED_HOSTS ? env.PROXY_ALLOWED_HOSTS.split(',').map(host => host.trim()) : publicHosts;
  if (target.protocol !== 'https:' || target.port || target.username || target.password || !allowed.includes(target.hostname)) {
    return json({ error: 'Destino de proxy no autorizado.' }, 403);
  }
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405);
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'authorization', 'x-api-key']) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  const response = await fetchImpl(target.href, { method: request.method, headers, signal: AbortSignal.timeout(15000),
    body: request.method === 'POST' ? request.body : undefined, redirect: 'manual' });
  const result = new Headers(response.headers);
  result.delete('set-cookie');
  for (const [name, value] of Object.entries(corsHeaders)) result.set(name, value);
  return new Response(response.body, { status: response.status, headers: result });
}
