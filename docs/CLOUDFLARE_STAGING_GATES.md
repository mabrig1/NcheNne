# Staging without endangering the existing live NcheNne site

## Current verified position — 24 October 2026

- The public demonstration already loads from **nchenne.mabrigkorie.org** and
  **nchenne.victoryonline1.workers.dev**, but its `/api/health` returned HTTP 404.
- The current deployed browser UI does **not** show the draft branch's D1 ledger
  inspection and fictional coordination review controls.
- The proposed draft branch is **NOT** automatically synchronized with this
  Cloudflare deployment. The production Worker name shown in Cloudflare was
  **`nchenne`**; the repository's default `wrangler.jsonc` uses a different name.
- TinyFish's last authenticated Cloudflare audit on 24 Oct at 12:44 UTC
  landed on `https://dash.cloudflare.com/login`, even after the user
  saved a separate Browser Context Profile. Therefore account plan, D1 resource
  inventory, existing binding configuration, and Access policy remain unknown.
- A profile marked "Saved" does **not** prove that Cloudflare's dashboard
  authenticated within the TinyFish saved context.

## Stage 0 — exact safety guards (already prepared in GitHub)

`wrangler.staging.example.jsonc` is intentionally **unrouted**:

- Worker name `nchenne-staging`, never `nchenne`.
- `workers_dev: false` and `preview_urls: false` — not publicly routable.
- No custom domain or production route.
- `DB` binding points to a deliberately invalid **placeholder UUID**.
- `APP_MODE: synthetic_demo`, `LIVE_CLINICAL_ENABLED: false`.
- No tokens, API credentials, clinical records or real facility contacts.

Do not run `wrangler deploy` with this template as if it were production.
The placeholder is meant to prevent unreviewed remote deployment.

## Stage 1 — fix browser profile authentication

Use TinyFish's **profile setup** browser, not a separate Opera or Chrome tab.
Sign into Cloudflare inside that browser, complete any required authentication
normally, navigate within the same setup browser to Workers & Pages and make
sure the existing `nchenne` Worker is visible, **then** save the profile.

Confirm `signed_in_sites` includes the authenticated domain or test the
profile read-only. If the provider still redirects to `/login`, do not
repeat deployment attempts or add a TinyFish developer API key — those keys
are unrelated to Cloudflare dashboard authentication.

Alternatively, the account owner can authorize a Cloudflare-scoped API token
stored **privately in a supported credential manager** (never GitHub/chat/UI).
We cannot infer or bypass account permission from a screenshot of Cloudflare.

## Stage 2 — inspect the live Worker

When authenticated, verify:
- Cloudflare account/workspace identity, access permissions and plan limits;
- `nchenne` deployment/version rollback history and static assets;
- D1 database list/IDs, existing bindings and safe staging name availability;
- whether Cloudflare Access protects the entire production Worker, previews
  and workers.dev; publicly reachable URLs must be treated as public;
- actual cost/billing before provisioning D1 or a staging Worker.

Do not retrieve or print existing secret values.

## Stage 3 — explicitly authorized remote fictional staging

Only after confirming account, zero unapproved costs and a safe Access policy:
create a **new separate** fictional D1 database for staging. Replace the
placeholder UUID in a private deploy-time configuration. Store the demo owner
token in a Cloudflare encrypted secret, not committed code or browser JavaScript.

Deploy a distinct `nchenne-staging` Worker **with no public routes**. To
view it, explicitly apply a Worker-level Cloudflare Access policy, verify it,
then enable only an Access-protected staging hostname/preview if authorized.

Perform the synthetic-only smoke test using authorized Access identity.
Access-protected endpoints can reject unauthenticated smoke scripts; do not
disable Access to make tests green. Do not treat `noindex` as Access.

## Stage 4 — compare/approve live promotion

Before changing `nchenne`, establish a rollback version and test private
staging's Worker, static assets, D1 persistence, failure handling and
accessibility. Production promotion requires separate owner approval. The
existing custom domain **must never be recreated**.

**Clinical safety:** The app is a fictional workflow simulator. Live
maternal referral operations require a separately governed health system.

Official Cloudflare references:
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
