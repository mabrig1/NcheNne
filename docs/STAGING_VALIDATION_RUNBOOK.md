# NcheNne: ChatGPT engineering staging validation (25 October 2026)

> **NONCLINICAL FICTIONAL DEMO ONLY.** No real hospitals, patients, symptoms, contact
> details, emergency response, dispatch or medical decisions. **Do not modify**
> the existing `nchenne` Worker or `nchenne.mabrigkorie.org`.

## Evidence and remaining unknowns

- GitHub PR #1 reviewed head `d0ef8df0304ae80338a138bc73a11f9a6ac9bd52` passed 44 tests,
  a Cloudflare dry-run and a **local** D1 Worker integration smoke test.
- On 25 October, a read-only Cloudflare account inspection located the distinct
  Worker `nchenne-staging`, version prefix `5ec98a34`; it showed:
  `APP_MODE=synthetic_demo`, `LIVE_CLINICAL_ENABLED=false` and
  `OPENROUTER_ENABLED=false`.
- An authenticated Cloudflare Access browser returned **HTTP 200** for
  `/api/health`, `/api/demo/summary` and `/api/facilities`. The health response
  specified `mode=fictional_only`, `clinicalUse=false`, `liveOperations=false`.
  The summary reported **0 sample facilities and 0 sample referrals**. These
  were **GET requests only**; nothing was seeded or changed.
- Inspectors reported D1 binding `DB` but transcribed the target as
  `chenne_demo`; the checked-in `wrangler.staging.jsonc` names `nchenne_demo`.
  **Resolve the actual DB name and UUID via Cloudflare before remote writes.**
- The private workers.dev staging URL requires Cloudflare Access login. Browser
  authentication succeeded, but exact Worker-level `All traffic` Access policy
  scope and allowlist are **not yet independently audited**.
- The deployed Cloudflare Worker version ID and the returned app version
  `0.2.0` do **not** prove which GitHub commit was deployed. Compare the exact
  source SHA/build provenance with Cloudflare deployment logs before promotion.
- No remote mutating end-to-end test, production deployment or clinical approval
  has been completed. Staging is a distinct Worker despite Cloudflare's page
  labeling its environment `production` internally.

## New fail-closed read-only CLI

The command targets **only**
`https://nchenne-staging.victoryonline1.workers.dev`. It cannot be retargeted
to a public, clinical or production hostname. It requests only:

1. `GET /api/health`
2. `GET /api/demo/summary`
3. `GET /api/facilities`
4. `GET /api/demo/watchlist`
5. `GET /api/referrals`

No `POST`, Cloudflare deployment, migration, seeding, provisioning or configuration
write is possible from this command. Responses are validated for synthetic mode,
nonclinical flags, non-identifying fields, safe fictional IDs and array bounds.
The script prints only summaries, not raw referral records or secrets.

On Windows PowerShell (Node 22+), from the reviewed branch:

```powershell
npm.cmd install --no-audit --no-fund
npm.cmd run check
npm.cmd run verify:staging:read
```

**Expected unauthenticated CLI result:** a Cloudflare Access redirect or denial,
reported as a **failed access check**, not as an API defect. Never disable Access
to force this command to pass. If an **existing, separately approved staging-only
Cloudflare Access service token** is configured, expose
`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in the owner's private
shell environment and rerun. Do not create service tokens, modify policies, or
paste secret values into GitHub, chats, screen recordings or CI logs for this task.
The CLI refuses an incomplete token pair and does not follow login redirects.

An alternative is authenticated manual browser inspection: use the saved
Cloudflare Access profile to open the five GET URLs. This is already sufficient
to establish that the health, summary and facilities endpoints return correctly,
but **not** that write paths, persistence and audit ordering work remotely.

## Explicitly gated local / remote smoke

`npm run smoke:demo` **writes fictional fixtures**. For safety it now refuses all
remote hosts except the exact staging workers.dev origin, and even there requires
an explicit opt-in. Local dev stays available:

```powershell
$env:NCHENNE_BASE_URL = 'http://127.0.0.1:8787'
# Privately set DEMO_API_TOKEN to the same development-only token used by Wrangler.
npm.cmd run smoke:demo
```

**Do not run remote smoke yet.** Before any remote POST, the account owner must
verify the staging D1 database UUID and Cloudflare Access policy, confirm a
fictional-only dataset and approve an isolated write test. Only when explicitly
approved, the guard additionally requires:

```powershell
$env:NCHENNE_BASE_URL = 'https://nchenne-staging.victoryonline1.workers.dev'
$env:NCHENNE_REMOTE_DEMO_SMOKE = 'WRITE_SYNTHETIC_STAGING_ONLY'
# Set DEMO_API_TOKEN and any required existing staging-only Cloudflare Access
# service-token credentials securely, never in source control or chat.
npm.cmd run smoke:demo
```

The additional opt-in is a safety latch **not** blanket permission to run it.
The script rejects `nchenne.mabrigkorie.org`, any other remote host, URLs with
embedded credentials, and any hostname substituted into the Access-header path.
Access authentication remains enforced.

## Remaining release gates

1. Verify staging deployment provenance against the expected GitHub commit.
2. Verify Cloudflare Access covers the **entire** staging Worker, all enabled
   workers.dev routes, and allows only the authorized identity.
3. Confirm actual D1 binding database name, UUID, schema version and rollback
   option against the isolated fictional dataset; **do not guess** from the UI.
4. With separate approval, run isolated fictional-only transaction smoke and
   confirm ordered `offered → accepted → arrived → completed` D1 event history.
5. Test mobile/Android accessibility, offline behavior and the read-only remote
   ledger versus deliberately separate local simulated role-play.
6. Keep PR(s) draft and production unchanged until explicit owner approval.
   Passing CI or HTTP 200 does not authorize a production or clinical rollout.


## Local D1 durability proof added after initial preflight

The synthetic smoke now records a **baseline referral count** and verifies a
single increment without clearing, truncating or reinitializing any database.
This avoids requiring a pristine database whenever the local test runs.

The CI `local-d1-smoke` job now stops its local Wrangler process **after**
running the fictional transaction sequence, verifies the original process is
gone, starts a fresh local Wrangler process against the same persisted test D1
state, and executes:

```powershell
npm.cmd run verify:local:persistence
```

That GET-only script verifies a persisted `SIM-` referral contains exactly four
ordered `offered → accepted → arrived → completed` audit events, strict
fictional IDs and actors, and consistent D1 completion aggregates. Any missing
events, non-fictional IDs, out-of-order history or real-world/clinical flags fail
closed. It never writes records and it refuses remote hosts. This proves
**local D1 persistence across a Worker restart, not remote D1 durability**.
The audit function also has deterministic Node tests for corrupt records.

The exact staging D1 resource name/UUID and actual live deployed commit remain
unverified release gates. Passing the restart test is **not** permission to
modify the remotely deployed Worker or change Cloudflare settings.
