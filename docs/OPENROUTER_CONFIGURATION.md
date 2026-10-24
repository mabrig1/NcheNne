# NcheNne: Manual OpenRouter API Configuration (fictional-only)

**Configuration prepared — integration disabled by default.**
Do not send real patient data, clinical details, contact information, staff
credentials, actual facility status or live referrals to OpenRouter or any
other AI provider.

## 1. What OpenRouter does in this project

An **optional owner-only simulated administrative explainer** can generate one
short sentence about one of five fixed fictional coordination scenarios.

- It is **not** a chatbot, emergency triage system, medical adviser, hospital
  finder, diagnosis engine, clinical decision support system, or dispatcher.
- Browser users **cannot send free-text prompts** or invoke the provider.
- The server only transmits a fixed fictional scenario sentence, never D1
  records, actual facility information, or a user-written question.
- The model response is untrusted and checked before being returned to an
  owner-authorized API client. No clinical instructions are allowed.
- OpenRouter is **OFF** unless an owner explicitly sets all three configuration
  fields and supplies the owner demo token.
- The default configuration never calls an external model.

## 2. Cloudflare Worker variables and secrets

On **Workers & Pages → nchenne-staging → Settings → Variables and Secrets**
(and after the staging Worker actually exists), add:

| Name | Cloudflare type | Value |
|---|---|---|
| `OPENROUTER_API_KEY` | **Secret (encrypted)** | Your existing OpenRouter API key; do **not** send it in chat or commit to Git |
| `OPENROUTER_ENABLED` | Text variable | `false` initially; switch to `true` only for an owner-approved demo |
| `OPENROUTER_MODEL` | Text variable | Explicit model ID from OpenRouter ending exactly in `:free`, e.g. `provider/model:free` is a **format example, not a working model ID** |
| `APP_MODE` | Text variable | `synthetic_demo` |
| `LIVE_CLINICAL_ENABLED` | Text variable | `false` |
| `DEMO_API_TOKEN` | **Secret (encrypted)** | Distinct high-entropy owner authentication token, unrelated to OpenRouter |
| `DB` | D1 binding | Existing `nchenne_demo` D1 database |

The GitHub `wrangler.staging.jsonc`, `wrangler.jsonc` and
`wrangler.ci.jsonc` default `OPENROUTER_ENABLED=false` and model empty,
and **do not store or reference the API key**.

A specific live `:free` model must be chosen from
https://openrouter.ai/models (model inventory and availability can change).
Do not use `openrouter/auto`, a paid model or a multi-model fallback in this
demo: the server rejects models without the exact `:free` suffix.

> **Provider caveat:** Even free-tier models can have limits, provider
> policy constraints, and change availability. This integration does not
> guarantee any model will remain free or available. Independently cap usage
> through OpenRouter's API-key guardrails and billing controls.

## 3. API contract

- `GET /api/demo/ai/status` — no token or model ID exposed. Returns
  `demoOnly`, `enabled`, `ready` and a readiness reason; no model call.
- `POST /api/demo/ai/explain` — **requires owner DEMO_API_TOKEN** and exact
  JSON `{"demoOnly":true,"scenario":"offer_unacknowledged"}`.

Allowed scenario IDs:

- `capacity_stale`
- `capacity_unavailable`
- `offer_unacknowledged`
- `arrival_unconfirmed`
- `escalation_needs_review`

Responses are marked `demoOnly:true`, `clinicalUse:false`,
`liveOperations:false` and `aiGenerated:true`. No role- or status-changing
actions occur on OpenRouter responses. Model failure returns a generic error;
upstream billing, provider errors and secret values are never echoed.

### Test status with no provider charges

After deploying a **protected** NcheNne staging Worker:

```bash
curl -fsS https://YOUR-PROTECTED-STAGING-ORIGIN/api/demo/ai/status
```

Cloudflare Access authentication may be required; do not remove Access just to
run a test. When disabled you should see `"enabled":false` and
`"ready":false`.

A `POST` requires a private `DEMO_API_TOKEN`; do not put the bearer token
in your browser's JavaScript, public issue or CLI history. It is optional,
will call OpenRouter and may consume quota only after you enable it.

## 4. Upstream request protections

`src/openrouter.js` uses OpenRouter's current chat completions endpoint:
`POST https://openrouter.ai/api/v1/chat/completions`, with
`Authorization: Bearer <OPENROUTER_API_KEY>` from the **Worker only**.

- A server-controlled fixed scenario prompt only; no uploaded content.
- `provider.zdr=true`, `provider.data_collection=deny`, and
  `provider.allow_fallbacks=false`.
- One selected `:free` model, `max_tokens=96`, `temperature=0`,
  8-second timeout, and **no retry**.
- Fails closed if the selected free provider does not support the privacy
  routing constraints. ZDR routing must not be confused with compliance
  authorization for actual health records.
- The code is not a spending limit on your OpenRouter account; **apply an
  OpenRouter per-key budget/guardrail and allowlist separately before enabling**.

OpenRouter documentation:
- https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
- https://openrouter.ai/docs/guides/features/guardrails/overview
- https://openrouter.ai/privacy/

## 5. Security checklist

- Do not reuse your **TinyFish** key, Cloudflare API token or
  `DEMO_API_TOKEN` for `OPENROUTER_API_KEY`.
- Avoid leaking tokens in frontend, repository files, screenshots or logs.
- Keep `OPENROUTER_ENABLED=false` until your private staging Worker,
  Cloudflare Access, per-key budget and model privacy policy are reviewed.
- Do not automatically turn OpenRouter on in production or merge PR #1
  merely because tests pass.
- All OpenRouter requests are 100% **fictional**; the live healthcare
  platform is not approved for clinical use.
