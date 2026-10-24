# NcheNne Health Network — Fictional Referral Demonstrator

**Engineering version 0.2.0 · Nigeria · Cloudflare Workers / D1**

> **NONCLINICAL, FICTIONAL TESTING ONLY.** This repository is **not** a healthcare service.
> It does not verify hospital availability, receive real patients, conduct triage,
> reserve beds, contact clinicians or dispatch emergency transport. Do not submit
> symptoms, names, contact details, patient records, or actual facility information.

NcheNne models accountable maternal referral coordination **without** a real patient
or clinic. It is a new independent project, not a replacement for
[NcheSent](https://github.com/mabrig1/NcheSent) or
[NigerFlora PharmaOS](https://github.com/mabrig1/naijamed-ai-).
There is **no operational data exchange with either application**.

## What can be demonstrated

- Browser-local, responsive fictional referral scenarios, language selection
  (English, Nigerian Pidgin, Igbo, Yoruba, Hausa — **not clinically reviewed**),
  offline static shell, sample analytics, and CSV export.
- Three fictional PHCs plus three fictional referral hospitals; no real addresses,
  contact details, people, patient fields, or institutional claims.
- Reporting example beds, staffing, theatre and blood-service indicators;
  45-minute expiration, capability matching and explicit referral acceptance.
- State machine: `offered → accepted → arrived → completed`, with decline,
  escalation and expiry. An *offer is not a reservation or acceptance*.
- A separate Cloudflare Worker API with D1 persistence for strictly **fictional**
  referrals and capacity reports. Demo writes require a server-side owner token.
- A **read-only Worker/D1 connection status panel** in the static interface. The
  clickable referral interface **remains browser-local**; it neither sends
  mutations to D1 nor represents D1 records as active clinical cases.
- Optimistic state-version checks and atomic D1 update/event batches for synthetic
  referral event history; unique demo referral-code and event constraints.

## Code review and verification

This work is staged in the **draft** [PR #1](https://github.com/mabrig1/NcheNne/pull/1).
Do not merge or publish as clinical software based on a passing build.

On GitHub Actions the quality gate runs:
```bash
npm run check              # Node unit tests and syntax validation
npx wrangler deploy --dry-run --config wrangler.ci.jsonc --outdir .wrangler-dry-run
npx wrangler d1 migrations apply nchenne_ci_placeholder_only --local --config wrangler.ci.jsonc
```
The isolated local-D1 job additionally launches Wrangler locally with a temporary
random token and runs `npm run smoke:demo`. It verifies that anonymous writes
are blocked; that fictional facility reports seed; and that create, accept,
arrive and complete transitions work, while rejecting identifiers, unavailable
facilities, premature arrival and duplicates.

The `wrangler.ci.jsonc` configuration uses a **dummy D1 UUID** for CI/local testing
only. The real `wrangler.jsonc` deliberately retains the invalid
`REPLACE_WITH_D1_DATABASE_ID` placeholder; **remote deployment is not configured.**

### Basic local static demonstration

Clone the repository, then open `public/index.html` in a modern browser.
Use **Referrals →** choose a fictional scenario, simulate staff acceptance,
mark fictional arrival and completion, and view its timeline. Try deliberately
stale capacity reports in **Facilities**. No backend required for this browser
exercise.

### Local Worker and D1 demonstration (no external resources)

Requires Node.js 22 or later. Only perform these commands in a development
environment, with **fictional** test records.

```bash
npm install
npm run check
npx wrangler d1 migrations apply nchenne_ci_placeholder_only --local --config wrangler.ci.jsonc
```

Create an untracked local `.dev.vars` file containing a random demo-only
`DEMO_API_TOKEN` of 24 characters or longer; do not use a real secret and never
commit, paste or log it. Start the development server:
```bash
npx wrangler dev --config wrangler.ci.jsonc --ip 127.0.0.1 --port 8787
```
In a separate shell, set `DEMO_API_TOKEN` to the same value and run:
```bash
NCHENNE_BASE_URL=http://127.0.0.1:8787 npm run smoke:demo
```
The test script creates **only** random `SIM-...` IDs. Its requests are intentionally
rejected for identifying fields, unknown facilities, incomplete transitions and
non-fictional cases.

## API and persistence contract

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Returns `clinicalUse:false` and `liveOperations:false` |
| GET | `/api/facilities` | Returns fictional facility reports |
| GET | `/api/referrals` | Fictional-only audit-backed referral timeline |
| POST | `/api/demo/seed` | Initialize fictional facilities (owner token) |
| POST | `/api/capacities/report` | Submit fictional capacity report (owner token) |
| POST | `/api/referrals` | Create a synthetic offer (owner token) |
| POST | `/api/referrals/:id/{accept,arrive,complete,decline,escalate,expire}` | Simulate a state change (owner token) |

All POST bodies require `demoOnly:true` with an exact allowlist of fields.
The Worker refuses `LIVE_CLINICAL_ENABLED=true` and rejects an unconfigured D1
binding. The API token is **not** clinician/hospital multiuser authentication.
All generated referrals are synthetic, even when retrieved from D1.

```mermaid
flowchart TD
    M[Mobile browser / offline shell] --> S[Local fictional simulator]
    M -->|GET health + facilities only| W[Cloudflare Worker: fictional API]
    O[Owner-only test script] -->|Bearer token + fictional JSON| W
    W --> Q[Strict input and status-machine logic]
    Q --> D[(D1 synthetic database)]
    D --> H[Fictional referral events]
    N[NcheSent: independent malaria research] -.- W
    P[NigerFlora: independent research & clinical stack] -.- W
```

## Release blockers and governance

There is **no remotely provisioned D1 database, protected Cloudflare preview,
custom domain or patient-validated application** in this work. Do not use
`wrangler.ci.jsonc` for remote deployment. `robots.txt` and
`<meta name="robots">` reduce indexing but do **not** secure access.

Before an **isolated fictional** hosted preview, review account scope, cost
implications and private access controls. See
[Safe preview deployment](docs/SAFE_PREVIEW_DEPLOYMENT.md) and
[Safety and deployment limitations](docs/DEPLOYMENT_AND_SAFETY.md).

**Before considering any real clinical platform**, establish institution-level
contracts, independent maternal-health clinical governance, validated multilingual
safety pathways, verified staff credentials, patient-information consent/authority,
privacy impact assessment, applicable NDPC compliance, operational emergency
escalation, transport arrangements, audit/security review and supervised field
evaluation. Clinical deployment must be a separate approved programme.

**For an actual pregnancy emergency, seek immediate in-person medical care.**
This simulator is not an emergency-contact or referral service.
