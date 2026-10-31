# NcheNne synthetic network — methodology and validation limitations

**Research/demo methods • 31 October 2026 • Fictional data only**

## Design
The current six-record network includes three invented primary-care centres (`PHC-A`–`PHC-C`) and three invented receiving facilities (`REF-A`–`REF-C`), with symbolic Ebonyi locality labels. The labels are not real provider identities or coordinates; no operating hospital has been surveyed or onboarded. Example reports contain invented available-bed counts and three boolean capability indicators (skilled team, theatre and blood service).

These initial values were selected to exercise edge cases: fully eligible, partially capable and zero-capacity receiving facilities. The database test fixtures use `demoOnly:true`, synthetic IDs and role markers; no demographic attributes, clinical narratives or patient identifiers are generated or accepted.

## Demonstration logic
A facility is **eligible only when** it is an active fictional receiving site, its self-declared demonstration report is not older than 45 minutes, it has at least one sample bed and **all** capabilities required by the chosen abstract administrative scenario. The scenario labels describe required service attributes; they do not classify symptoms or diagnoses.

Once this strict binary filter has passed, the browser's **illustrative** display ranking is:

```
score = 5 × min(sampleBeds, 5)
      + max(0, 45 − ceil(minutesSinceReport))
```

Higher scores display first, with fictional ID used to break ties. This sorting is **not a clinical decision support system**. It deliberately omits geography, travel time, mortality risk, resource verification, staff credentials and actual access pathways. A partially matching facility is never presented as safe.

An offer must be explicitly accepted before arrival or completion. Declined or expired offers remain in the local audit list, and re-offer creates a new synthetic referral instead of rewriting history. The illustrative ten-minute local offer clock is a UI simulation, not a real escalation standard or Cloudflare background process.

## Demonstration metrics
Offer-to-accept and offer-to-arrival metrics are arithmetic differences between timestamps on **fictional role-play events**, reported as arithmetic means only when qualifying events exist. They are neither patient-care time studies nor valid indicators of hospital responsiveness. The simulation does not estimate clinical outcomes, real referral success, travel times or health-system performance.

## Limitations
- Browser sessionStorage may be blocked or cleared; the fallback runs in memory and does not guarantee durable cross-session records.
- Cloudflare D1 is a *separate*, owner-controlled synthetic testing backend. Browser role-play does not write to it. Remote persistence, Access configuration and deployed-version provenance require independent validation.
- All sample report freshness and counts are unverified inventions, not actual operational data.
- Accessibility, screen reader use, language correctness and low-end Android performance require supervised testing. No physical-device validation has been performed by this software-only update.
- There are no patient interviews, provider contracts, geographical routing or validated triage protocols.

## Proposed stakeholder evaluation (no sensitive data)
Invite volunteers to operate guided and manual fictional scenarios. Measure task completion, comprehension of the nonclinical banner, recognition of 'offered' versus 'accepted', accessible navigation, perceived usability and ability to identify stale/unsafe demonstration options. Record **only consented, non-identifying feedback outside the prototype**, preferably aggregated. Do not ask participants to enter real cases or provider details.

Before field research, develop ethics/consent procedures where applicable, governance approvals, privacy notices, a DPIA/NDPC compliance checklist and an independent safety/translation review.

**No real-world readiness or clinical efficacy is asserted.**
