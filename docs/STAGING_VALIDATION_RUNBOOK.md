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


## Phase 5: schema readiness and safe release fingerprint

The prior health check only established that a D1 binding object existed. That
does **not** prove the D1 migrations were applied. The upgraded
`GET /api/health` now queries the fictional D1 SQLite schema for four required
table names (`facilities`, `capacity_reports`, `referrals`,
`referral_events`). Only with the correct synthetic mode, disabled clinical
mode and all four table names does it return HTTP 200 with
`ready:true` and `schemaReady:true`; it otherwise fails closed with HTTP 503.
These flags prove table presence, not clinical suitability, complete schema
correctness or remote deployed-commit provenance.

The read-only staging CLI and UI now **require both readiness flags** before
showing remote D1 as connected. The existing private staging Worker was checked
before this change and did not yet expose those flags, so the new CLI will
correctly mark that deployment unverified until the upgraded code is safely
deployed. Do not disable Cloudflare Access or promote the code to make it pass.

The purely **local** release candidate audit:

```powershell
npm.cmd run audit:staging:config
```

checks the Worker name, URL/preview flags, lack of custom routes, fictional
runtime settings, expected one D1 binding, and absence of checked-in secrets.
It prints the candidate git SHA and SHA-256 of the staging config. It also
prints `accessPolicyVerified:false`, `remoteDatabaseVerified:false` and
`deployedCommitVerified:false` on purpose: repository inspection can never
satisfy those Cloudflare account-level gates.

GitHub CI now runs the staging config audit before the Cloudflare bundle dry-run,
and it runs the synthetic local D1 smoke **twice** against the same database.
The smoke explicitly refreshes fixed `REF-A`, `REF-B` and `REF-C` fictional
capacity reports, because reports expire after 45 minutes while the seed
operation intentionally preserves existing rows. The repeated local test proves
existing records need not be cleared; it does not authorize a remote write.

### Exact next safe release steps

1. In Cloudflare account, read-only inspect the existing Worker named
   `nchenne-staging`. Match the actual binding ID, name and account to the
   checked-in `wrangler.staging.jsonc`, resolving the previously transcribed
   `chenne_demo` versus `nchenne_demo` discrepancy.
2. Read-only inspect Worker-level Cloudflare Access policy: owner-only allow
   criteria; **All traffic** includes the exact workers.dev hostname and
   `/api/*`; preview URLs stay disabled. Do not widen the allowlist.
3. Record current staging Worker version, deployment provenance and rollback
   point before changing it.
4. Obtain a separately explicit approval for staging-only code deployment;
   run `npm.cmd run check` and `npm.cmd run audit:staging:config`, compare the
   remote binding with the checked-in ID and perform a dry-run before deploying.
5. Verify the upgraded `GET /api/health` returns HTTP 200 with
   `ready:true`, `schemaReady:true`, `clinicalUse:false` and
   `liveOperations:false`. Then run the five GET-only staging preflight checks.
6. Only after a second explicit approval for fictional D1 writes, use the
   guarded synthetic remote transaction smoke; keep production unchanged.

No new production or clinical capability is approved by this phase.


## Phase 6: exact remote D1 identity audit (GET-only Cloudflare REST API)

The Cloudflare dashboard audit transcribed an ambiguous D1 name:
`chenne_demo`, while the reviewed Wrangler staging configuration names
`nchenne_demo`. **Do not guess or rewrite the database identity.** The
new `npm run audit:cloudflare:read` command resolves the discrepancy by
comparing three live Cloudflare GET responses with the checked-in configuration:

- `GET /accounts/{account_id}/workers/scripts/nchenne-staging/settings` —
  the **existing staging Worker's actual D1 UUID and nonsecret environment
  variables** (never reads or prints token values).
- `GET /accounts/{account_id}/d1/database/{checked-in-staging-uuid}` —
  the actual D1 database's UUID and registered name.
- `GET /accounts/{account_id}/workers/scripts/nchenne-staging/subdomain` —
  verifies workers.dev is on and preview URLs remain off.

The script **never** issues POST, PUT, PATCH or DELETE; it cannot seed D1,
query SQL rows, deploy, alter DNS, change Access or touch the existing
`nchenne` production Worker. It outputs booleans only; it does not print raw
Cloudflare Worker metadata, database rows, API tokens or identities.

This capability uses Cloudflare's documented read-only REST endpoints. It
requires an existing, **least-privilege** API token authorized for
`Workers Scripts Read` and `D1 Read`, and the correct account ID. Do not
create a new token, broaden token permissions, pay for an account, or modify
existing settings solely for this preflight unless separately approved.

Run **locally** with credentials set **privately on your machine**, not
copied into GitHub, messages or screenshots:

```powershell
Set-Location 'C:\Users\user\NcheNne'
git switch engineering/staging-preflight-20261025
git pull --ff-only
npm.cmd install --no-audit --no-fund
npm.cmd run check
npm.cmd run audit:staging:config
# In the PRIVATE shell, securely set:
#   CLOUDFLARE_ACCOUNT_ID = your existing Cloudflare account ID
#   CLOUDFLARE_API_TOKEN  = an existing least-privilege read-only API token
npm.cmd run audit:cloudflare:read
```

If either variable is unavailable, **stop without changing Cloudflare**.
The tool fails closed and no live verification can be claimed. Cloudflare
dashboard sign-in via the TinyFish profile does not automatically confer an API
token in your local Windows shell.

A passed D1 audit would establish the expected remote database UUID/name and
Worker binding match. It explicitly **does not** establish the full Worker-level
Cloudflare Access policy, the allow rule or the deployed source commit, and
does not authorize a remote write or deployment. These remain separate owner
review gates.

**Reference:** Cloudflare API, *Get Worker Script and Version Settings*;
*Get D1 Database*; *Get Worker Subdomain*. Check the documentation for the
permissions required by your existing Cloudflare token.
