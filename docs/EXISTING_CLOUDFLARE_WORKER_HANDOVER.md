# NcheNne — Existing Cloudflare Worker handover and deployment protection

**Verified 24 October 2026 by a read-only third-party browser check.**
These are **operational observations**, not cloud account authorization.

## Already running (do not provision a duplicate domain)

- Cloudflare worker as shown in the owner's account: **`nchenne`**.
- Custom domain already mapped: **https://nchenne.mabrigkorie.org**.
- Worker URL shown by Cloudflare: **https://nchenne.victoryonline1.workers.dev**.
- Both URLs returned an interactive browser-visible **fictional demonstration**.
- `GET https://nchenne.mabrigkorie.org/api/health` returned **HTTP 404**.
- The deployed UI did **not** include the draft branch's optional D1 ledger inspector
  or fictional coordination review button when tested in a real browser.
- This implies the existing public deployment is **behind the draft branch** and
  the tested D1 Worker API is not currently serving that route.
- The site responded without authentication. `noindex` metadata is **not** privacy.

## WARNING: do not overwrite the existing Worker

The repository draft `wrangler.jsonc` currently uses a **different** Worker name
(`nchenne-health-network-demo`) and an invalid D1 placeholder. Running
`npm run deploy` unchanged cannot be assumed to update the existing `nchenne`
deployment, and updating the existing Worker can unexpectedly replace its code.

**Before any remote write**, use a saved authenticated TinyFish Cloudflare
browser profile, or the owner's Cloudflare dashboard, to inspect:

1. Which Cloudflare account and zone own the `nchenne` Worker and domain.
2. Existing Worker deployments, version history, bindings, routes, and secrets
   *names only*, not secret values.
3. Whether a Worker-level Cloudflare Access policy protects **all traffic**
   (custom domain, workers.dev, preview URL), and who can log in.
4. Whether `nchenne_demo` exists in D1, its database UUID (not a password),
   schema tables and any existing demo content.
5. Account plan, any pay-as-you-go rules and prospective cost.
6. Restore point: confirm how to roll back the existing deployment via
   Cloudflare's version history before altering it.

Do **not** change production `nchenne`, its DNS, Access policy, billing,
other Workers, or any real patient/health data without owner approval.

## Lowest-risk path: separately protected synthetic preview

1. Select a distinct preview Worker name such as `nchenne-staging`;
   do not attach `nchenne.mabrigkorie.org` to it.
2. If the account confirms an appropriate no-cost resource, create an isolated
   **fictional-only** D1 database, e.g. `nchenne_demo`.
3. Confirm a **Cloudflare Access** policy before enabling remote preview routes.
   Workers can be protected at Worker scope, including custom, workers.dev and
   preview hostnames. Make an email-specific allowlist, not Everyone.
4. Configure `DB` binding, and supply the owner demo token as a Cloudflare
   encrypted Worker secret. Do **not** expose it in GitHub or browser code.
5. Apply `migrations/0001_init.sql` **only** to the new synthetic D1 database.
   Test `/api/health`, `/api/facilities`, `/api/demo/summary`,
   `/api/demo/watchlist`, and a guarded seeded demo referral.
6. Verify all remote API results are fictional-only; audit local browser controls.
   Access-protected endpoints may require an authenticated browser session, and
   `npm run smoke:demo` may need authenticated session or a deliberately
   scoped service token; do not bypass Access or open public access for a test.
7. Only after documented acceptance and a production restore point, approve
   promoting the preview Worker code to the existing `nchenne` Worker, while
   preserving its current custom-domain configuration.

**Never claim that a passing local D1 test means Cloudflare remote D1 is deployed.**
No clinical records, actual hospital information or real emergency dispatch are
authorized in this project.

## Cloudflare official documentation

- Worker protection: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- D1 binding for existing Worker: https://developers.cloudflare.com/d1/best-practices/remote-development/
- D1 getting started: https://developers.cloudflare.com/d1/get-started/
