# Production metrics

The browser uses `nuvio-proxy` for both completion counts and avatar ranking. Redis credentials belong only in Worker secrets `AVATAR_REDIS_URL` and `AVATAR_REDIS_TOKEN`. No Redis or legacy counter environment variables are consumed by the frontend build or Pages workflow.

## Completion migration

`GET /api/completions` returns `{ value }`. It reads `nuvio:completions:production`; an absent key means the operator-confirmed migration baseline of **55**, not an outage fallback. A failed Redis request fails the endpoint. Existing values, including zero, are preserved.

`POST /api/completions` accepts only `{ clientId }`, a browser-generated UUID v4. One atomic Lua command initializes the key with `SET NX 55`, deduplicates the hashed network/browser identity for 24 hours, caps each hashed network at ten accepted completions per UTC day, and increments the total. An existing total is never reset. Replies contain `{ value, status: "recorded" | "duplicate" }`; rate limits return 429. Network-ambiguous writes are never retried automatically.

Both manual and automatic wizard completion paths use this endpoint after their existing success conditions. A visit, metric read or scene animation never increments it. The server does not verify that an anonymous visitor actually completed a manual export: these are abuse-limited usage statistics, not audited transactions. Origin filtering isolates normal browsers; it is not authentication and can be forged by a custom client.

## Avatar usage

Existing `GET /api/avatars/ranking` returns `{ items, totalUsage }`. The total sums every valid stored score before limiting the displayed ranking. Existing `avatar_ranks` is preserved; no copying, reseeding or clearing is needed when the configured Upstash database is the same.

`POST /api/avatars/usage` remains authenticated against Nuvio, using the Worker's public `NUVIO_PUBLIC_ANON_KEY` binding and the caller's access token. Atomic account/avatar deduplication and daily limits remain unchanged. The public key is not a secret; Redis credentials never go to the browser. Nuvio authentication uses manual redirects, rejecting redirect responses instead of forwarding credentials.

Both increment endpoints accept the production browser origin `https://guia.lat-add.com` only. Local development and Pages testing may read production totals but cannot increment them through normal browser requests. Add a separately namespaced counter if write-enabled testing is needed; do not allow testing origins onto production counters.

## Operator cutover

1. Review and deploy the Worker with `--keep-vars`, preserving all dashboard secrets, collaborator variables, KV and weekly poster schedule. Confirm read-only totals and configuration. No artificial production increment is required for verification.
2. Publish the migrated website through the authorized Git Flow. Until the production website has changed, its old build still uses its old counter and Redis injection. If its completion total grows beyond 55 before cutover, reconcile the baseline before enabling the new website; do not overwrite an already active Redis total.
3. Verify an actual user-confirmed successful setup/avatar save. Fixture tests do not verify private sessions or real devices.
4. Remove obsolete GitHub secrets `COUNTER_PRIMARY_GET`, `COUNTER_PRIMARY_HIT`, `COUNTER_FALLBACK_GET`, `COUNTER_FALLBACK_HIT`, `COUNTER_API_URL`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` after confirming no remaining workflow consumes them. The old production branch included Redis credentials in its browser build: rotate that old token and update the Worker secret after cutover, without deleting the database or ranking. Removing a GitHub secret alone does not invalidate an already published token.

Worker publication, website integration/publication, secret removal and credential rotation are separate operations requiring applicable operator authorization.
