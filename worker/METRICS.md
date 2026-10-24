# Metrics environments and completion events

The browser reads and writes metrics through nuvio-proxy. Redis credentials remain exclusively in AVATAR_REDIS_URL and AVATAR_REDIS_TOKEN Worker secrets. No Redis credentials or legacy counter URLs are injected into the frontend build.

## Environment routing

The Worker derives scope from Origin, never from a client-selected body field:

- https://guia.lat-add.com: production.
- https://testing-latinosetup.pages.dev and HTTP localhost/127.0.0.1 (any port): shared testing.
- Other origins may read public production totals; their writes are rejected.

Responses for metric routes use Vary: Origin and Cache-Control: no-store. Reads identify their environment. Frontend caches are scoped and versioned, and testing clients reject older unscoped production responses instead of showing real data as test data. Production keys and historical totals are preserved. Testing starts at zero on confirmed absent keys; an outage is never treated as zero.

Completion keys: nuvio:completions:production and nuvio:completions:testing. The confirmed production migration baseline is 55 only when its key is absent. Avatar production keeps avatar_ranks; testing uses avatar_ranks:testing, including separate deduplication and rate-limit keys. Avatar writes still require a verified Nuvio session.

## Completion contract

GET /api/completions returns { value, environment }.

POST /api/completions accepts { clientId, completionId }. Both are UUID v4 values. completionId identifies one execution, originates when the run begins, and must remain unchanged when that execution's registration is retried. The atomic Redis command initializes an absent counter without overwriting it, checks the scoped hashed completion ID, enforces ten accepted writes per hashed network per UTC day, and increments. Event IDs are retained permanently: one execution cannot be counted twice. No raw IP or client ID is stored in keys.

Replies contain { value, status: recorded | duplicate, environment }. An uncertain network result is not automatically retried. Registration failure does not turn an otherwise successful setup into a failure. The display uses confirmed server totals and never fabricates previous + 1.

For temporary backwards compatibility, requests containing only clientId retain legacy browser/network 24-hour deduplication. New executions use completionId and are not blocked by the old session-wide counter flags. Production legacy clients remain compatible while the frontend is rolled out.

Completion counts are abuse-limited usage statistics, not audited proof of execution. Anonymous clients can forge Origin outside browsers; origin filtering provides browser-environment isolation, not authentication.

## Presentation

The green star follows a newly recorded completion only. It waits for progress to finish, travels to the visible counter, triggers a bounded green expansion, then updates the odometer. Duplicates synchronize without replaying the effect. Reduced motion, missing visible targets and cancellation settle confirmed data without a flight. Polling does not race presentation.

## Rollout and review

Worker changes require explicit deployment approval and --keep-vars. Website integration/publication requires its own Git Flow authorization. Until this Worker version is deployed, local/testing clients show unavailable/cache rather than accepting production replies. No production reset or test increment is required to deploy.

Before production frontend cutover, reconcile any old setup increments after 55. After cutover, remove obsolete GitHub counter/Redis secrets only after confirming no consumers remain, and rotate the formerly browser-bundled Redis token without deleting its database. Removing GitHub secrets alone does not revoke published credentials.
