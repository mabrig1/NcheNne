# NcheNne — what this prototype is / is not

**FICTIONAL NONCLINICAL DEMONSTRATION • 31 October 2026**
**NOT FOR REAL PATIENTS, HOSPITALS, DISPATCH OR EMERGENCY RESPONSE**

## It IS
- A browser-based, offline-capable **administrative role-play** using invented Ebonyi-labelled sample facilities and fictional referral IDs.
- A way to demonstrate how *reported* capacity, explicit offer acceptance, a sequential audit trail, stale-data rejection and simulated handovers might be presented.
- A means to test interface comprehension and collect **anonymous, nonclinical** usability feedback outside the app; participation is voluntary.
- A separate, access-restricted Cloudflare Worker/D1 engineering experiment using fictional records only; browser-local actions do not write to it.

## It IS NOT
- A live provider directory, verified bed-availability service, maternal-health triage tool, referral reservation, emergency phone service, dispatch system, clinical decision aid or validated patient record system.
- Evidence that a particular hospital can accept a patient, or that a transfer, clinical outcome or response time is safe.
- An authorized real-person system. **Never enter actual patient names, symptoms, diagnoses, phone numbers, locations, provider contact details or patient data.**
- Clinically translated software: English, Igbo, Yoruba, Hausa and Pidgin selections have **not** passed professional clinical/language review.

## Safety invariants
1. A fictional offer is **never** acceptance or a bed reservation. Explicit simulated staff acceptance is necessary before simulated arrival.
2. An escalated fictional offer cannot jump directly to arrived; it must be reaccepted or closed. Stale or partially capable demonstration facilities are not recommended.
3. The **45-minute capacity threshold** and **10-minute offer window** are illustrative fixture values, **not clinical deadlines, standards or emergency waiting advice**.
4. Browser auto-expiry, guided walkthrough, rankings and timing metrics are **session-local presentation features**, not remote monitoring.
5. The Worker uses restricted fictional D1 and owner-gated mutations. No external messaging, facility onboarding, OpenRouter inference or real-world coordination is enabled by default.

## Before any healthcare pilot
Obtain written hospital authorization and maternal-health clinical governance, interview healthcare workers, confirm roles and audit requirements, validate all translations with qualified reviewers, carry out privacy and security impact assessments, verify appropriate Nigerian data-protection and NDPC obligations with counsel, design real patient consent/authority and emergency escalation protocols, and independently test accessibility, low-end Android devices and failure modes.

**If an actual pregnancy emergency is occurring, do not use this prototype. Seek immediate in-person medical care and locally available emergency services.**

**Stakeholder instruction:** Share this sheet together with screenshots and every fictional CSV export. Do not interpret synthetic counters as field outcomes.
