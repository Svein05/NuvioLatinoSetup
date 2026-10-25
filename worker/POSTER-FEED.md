# Weekly poster feed

The browser reads GET /api/poster-feed. GET and HEAD only read the KV snapshot; neither can fetch TMDB, seed storage, or refresh data. POST returns 405. A missing or corrupt snapshot returns 503 and the website keeps its static fallback.

## Deployment prerequisites

Do not replace the active Worker until its existing proxy, collaborator, avatar ranking and suggestion contracts have been checked against this repository. Start with a testing Worker and a separate KV namespace. No production resources or credentials are created by the build.

1. Configure the Worker secret named TMDB_READ_ACCESS_TOKEN with a project-owned TMDB API read access token. It is not a user's wizard API key. Never place its value in Wrangler configuration or browser code.
2. Bind a KV namespace as POSTER_FEED_KV. Add the real namespace ID to the deployment configuration. No invented namespace ID is bundled here.
3. worker/wrangler.jsonc schedules Monday at 12:00 UTC. Preserve the other bindings and secrets when deploying. Test environments must use their own bindings and initially omit cron until verified.
4. Seed the first snapshot; deployment itself does not call TMDB. Set TMDB_READ_ACCESS_TOKEN privately in the operator's process and run node scripts/seed-poster-feed.js from the repository root. This makes at most 42 provider GET requests and creates .local/poster-feed.json, which is ignored by Git. It refuses to overwrite an existing snapshot file. A dashboard secret cannot be downloaded by the seed script; supplying it to this local process is a separate operator action.
5. After explicit deployment/storage authorization, upload that file to the testing namespace key poster-feed:v1 using the Cloudflare KV dashboard or the current Wrangler KV key put command with --path. Select the correct environment and remote namespace explicitly. Never upload to production by default.
6. Verify GET, HEAD, conditional ETag reads and the website on the testing URL. Check all existing Worker routes before requesting production authorization.

## Data and failures

The scheduled refresh requests only the first page of weekly movie trends and weekly TV trends, both using es-MX. It alternates matching ranks (movie #1, series #1, movie #2, series #2). Popular catalogs are not included. It then requests image lists for at most forty distinct titles, with four concurrent reads. Spanish-tagged portrait artwork takes priority; language-neutral artwork is the fallback. Titles with only foreign-language artwork are omitted. TMDB does not distinguish regional Spanish variants for image selection, and language-neutral tags do not guarantee that an image contains no text.

Each refresh therefore makes at most 42 provider requests, independent of visitor count; operator seeding has the same bound. Poster image downloads are separate CDN traffic. An artwork lookup failure aborts publication, retaining the last good snapshot.

Only a complete valid batch containing at least twelve distinct non-adult posters replaces the previous snapshot. Failed provider responses, malformed data, insufficient items and storage errors retain the last good record. There is no public refresh endpoint and no automatic request-path retry. The KV record has no expiry that could erase the fallback before the next schedule.

Snapshot: schemaVersion=1, generatedAt ISO timestamp, and items containing numeric id, mediaType movie/tv, title and posterPath. Metadata and image paths are public; secrets and account identifiers are never included.

The browser revalidates a cached snapshot after one hour. On failure, a valid snapshot up to thirty days old remains usable; older data falls back to the local background. Blocked storage uses memory. No extra visit-triggered TMDB queries occur.

## Verification

npm run check includes offline Worker/provider/cache tests. Browser tests inject a synthetic feed and local poster images; they do not use real TMDB credentials or deploy services. Wrangler and the actual Cloudflare scheduled runtime still require an authorized testing deployment.

Official references:
- https://developer.themoviedb.org/reference/trending-movies
- https://developer.themoviedb.org/docs/image-basics
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/kv/api/write-key-value-pairs/
