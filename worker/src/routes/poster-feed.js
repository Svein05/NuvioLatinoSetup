import { isPosterFeed } from '../../../src/shared/media/poster-feed.js';
import { POSTER_FEED_KEY } from '../services/poster-feed.js';
import { corsHeaders } from '../middleware/http.js';

export async function posterFeedRoute(request, env) {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json',
    'Access-Control-Expose-Headers': 'ETag', 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {
    status: 405, headers: { ...headers, Allow: 'GET, HEAD, OPTIONS' },
  });
  try {
    const feed = await env.POSTER_FEED_KV?.get(POSTER_FEED_KEY, 'json');
    if (!isPosterFeed(feed)) throw new Error('Unavailable feed');
    const body = JSON.stringify(feed);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    headers.ETag = '"' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('') + '"';
    if (request.headers.get('If-None-Match') === headers.ETag) return new Response(null, { status: 304, headers });
    return new Response(request.method === 'HEAD' ? null : body, { headers });
  } catch {
    headers['Cache-Control'] = 'public, max-age=60';
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ error: 'Poster feed unavailable' }), {
      status: 503, headers,
    });
  }
}
