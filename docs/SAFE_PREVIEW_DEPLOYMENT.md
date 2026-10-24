# NcheNne Cloudflare preview — safe activation checklist

**This is a fictional-only simulation, NOT a medical service.**
The app in `public/index.html` uses local, fictional browser state. The Worker API is
a separately testable fictional backend, not yet a connected production UI.
No real hospitals, patient information, symptoms, pregnancy histories, or
phone numbers are permitted. No emergency or ambulance dispatch occurs.

## 1. Pre-deployment gates

- Review the draft PR, unit tests, and pending Worker/D1 deployment.
- Use an isolated Cloudflare account/project scope intended for a fictional demo.
- Confirm any billing and storage limits **before** provisioning. Do not provision paid resources.
- Protect previews with Cloudflare Access if an owner-only demonstration is desired;
  the Bearer token only protects writes, not the public HTML simulator.
- Do not set `LIVE_CLINICAL_ENABLED=true`: this build explicitly rejects it.
- Do not substitute an existing patient database or NigerFlora credentials.

## 2. Owner actions, only after reviewing the scope

At an authenticated terminal with Node.js 22:

```bash
npm install
npm run check
npx wrangler login
npx wrangler d1 create nchenne_demo
```

Place the **new demo-only** D1 database UUID returned by the create command in
`wrangler.jsonc` under the `DB` binding. Do not reuse a clinical database.

```bash
npx wrangler d1 migrations apply nchenne_demo --local
# Optional local integration using a throwaway shell-only token (32+ random chars).
# Create .dev.vars locally containing DEMO_API_TOKEN=...; never commit it.
npx wrangler dev
```

In a second terminal, with the same demo token set as `DEMO_API_TOKEN`:

```bash
NCHENNE_BASE_URL=http://127.0.0.1:8787 npm run smoke:demo
```

The smoke script uses **fictional fixture IDs only** and verifies that anonymous writes
fail, records are marked fictional, offers are not accepted automatically, and
accepted/arrived/completed transitions result in four ordered events.

## 3. Private preview deployment (separate approval)

Before any remote operation, confirm account, service name, Access policy, and
whether the free plan is sufficient. For a verified nonclinical D1 binding:

```bash
npx wrangler d1 migrations apply nchenne_demo --remote
npx wrangler secret put DEMO_API_TOKEN
npx wrangler deploy
```

Never paste `DEMO_API_TOKEN` in GitHub, screenshots, browser JavaScript, issues,
or logs. The Worker requires `APP_MODE=synthetic_demo` and
`LIVE_CLINICAL_ENABLED=false`. Check `/api/health` for
`clinicalUse=false` and `liveOperations=false`.
Run smoke only against your **approved, isolated fictional demo** URL.
Use Cloudflare Access or equivalent to make the preview private, and verify it
before sharing. A metadata `noindex` tag is not access control.

## 4. Rollback and nonclinical safeguards

To roll back, remove the preview route or disable the Worker deployment through
your Cloudflare dashboard. Preserve the fictional D1 database until its contents
are assessed; deleting it is a separate action. Do not merge the branch simply
because Cloudflare builds. A clinical launch requires new governance, real
institutional participation, validated care pathways, and regulatory review.
