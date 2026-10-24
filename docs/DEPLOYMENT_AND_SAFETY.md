# Deployment & clinical-safety gates
**Status: nonclinical, fictional demonstration only.**
The browser demonstration is independent of the Cloudflare D1 API. Nothing accepts real patients, hospital operations, staff identities, locations or emergency dispatch.
Cloudflare Workers + D1 require account-owner setup. Do **not** deploy the D1 Worker until a separate *demo-only* D1 database, strong DEMO_API_TOKEN secret, Cloudflare account authorization and free-tier plan are confirmed. Never commit secrets.
The placeholder `REPLACE_WITH_D1_DATABASE_ID` is intentionally invalid and blocks accidental D1 deployment.
1. Install Node 22; run `npm run check`.
2. Use Cloudflare Wrangler to create *demo-only* D1 database `nchenne_demo`; paste its ID into `wrangler.jsonc`.
3. Set `DEMO_API_TOKEN` as a Cloudflare encrypted Worker secret; do not place it in frontend code.
4. Apply the schema only to the demo D1 database; verify test data alone.
5. Deploy preview only after confirming billing scope, Access restrictions, and a `noindex` demonstration warning.
6. GET /api/health should return `clinicalUse:false` and `liveOperations:false`.
7. Do not use this code for real healthcare workflows. Real clinical deployment requires a separately governed, independently validated application, verified facility staff, professional signoff, appropriate legal review and institutional agreements.
The event log is a prototype, not a fully transactional production audit system. Translations are UI-only, unvalidated for clinical use. The standalone browser HTML is a session-scoped demonstration; do not enter real personal information. Existing NcheSent and NigerFlora systems are not connected.
