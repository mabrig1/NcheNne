# NcheNne — Human-in-the-loop fictional coordination review queue

**Status: software demonstration only. Not medical triage, patient tracking,
emergency dispatch or a real referral service.**

## Purpose

The deterministic `src/watchlist.js` classifier highlights common *simulated*
administrative handoff problems. This helps test whether a software user can
see that a referral offer requires acknowledgment, but **does not automate
medical decisions or claim real provider readiness**.

| Fictional cue | Synthetic rule | Demonstration response |
|---|---|---|
| Capacity report stale | Receiving facility report older than 45 minutes, future timestamp, missing or untrusted | Mark example report as unreliable; ask fictional staff to review |
| Capacity unavailable | Recently reported receiving facility has zero beds or no skilled staff | Do not treat sample facility as available |
| Offer unacknowledged | Fictional offer still `offered` for 10 minutes | Surface to fictional coordinator for manual review |
| Arrival unconfirmed | Fictional referral still `accepted` for 30 minutes | Surface for administrative follow-up in role-play |
| Escalation needs review | Fictional status explicitly `escalated` | Show manual-review queue; no real escalation occurs |

**The 10- and 30-minute thresholds are user-interface exercise fixtures, not
clinical response-time recommendations.** They must never be interpreted as
safe waiting periods or used to defer emergency care.

## Built-in guardrails

- No AI-generated diagnosis, symptoms, risk score, clinical prioritization,
  transport instruction, medical advice, real facility claims, SMS, WhatsApp,
  USSD, email or third-party messaging.
- Strict `demoOnly:true`, known `REF-[A-C]` fixture facility IDs and `SIM-...`
  mock referral IDs. No real names or addresses are needed.
- Output consists of fixed **codes**, times and simulated IDs. Arbitrary
  narrative details, patient notes, phone numbers and medical fields do not
  reach the browser render function.
- The browser voluntarily requests a read-only `GET /api/demo/watchlist`;
  it has **no bearer token**, and the browser-local scenario never sends D1
  mutations.
- The API considers at most 100 of the oldest updated fictional referrals,
  returning a maximum of 50 review cues. Its explicit `truncated` field means
  a full network-wide queue cannot be inferred.
- The optional browser viewer renders at most 25 projected cues, using
  `textContent` and known fixed labels, never arbitrary server free text.
- The offline service worker caches the static inspector module only; it
  never caches API data.
- Access protection, tenant isolation, verified medical identity, clinical
  governance and patient privacy compliance are still **not implemented**.

## Verification

Run:
```bash
npm run check
```

A CI job runs Wrangler with an isolated **local D1** database and calls
`npm run smoke:demo`. The smoke checks the fictional administrative endpoint,
including zero-bed capacity, without any Cloudflare account or remote
infrastructure. GitHub passes are not production or clinical certification.

## Genuine emergencies

For a real pregnancy-related emergency, do not use this application or wait
for fictional capacity or status updates. Seek appropriate urgent, in-person
medical care and established local emergency services.

## Future pathway

A live maternal referral service requires separately governed clinical
software, verified provider organizations, audited consent and authorization,
field-validated service levels, transport coordination, local escalation
procedures and accountability arrangements. The demonstration provides none
of these functions, and code must **not** simply be relabeled as clinical.
