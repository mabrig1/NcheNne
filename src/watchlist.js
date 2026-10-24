/**
 * Human-review prompts for a FICTIONAL-only referral workflow.
 * Deterministic administrative cues, not diagnoses, urgency scores, treatment
 * advice, ambulance orders, hospital availability or automatic dispatch.
 */
import {reportIsFresh} from "./domain.js";

export const DEMO_REVIEW_MS=Object.freeze({
  offered:10*60*1000,
  accepted:30*60*1000,
});
const REFERRAL_ID=/^SIM-[A-Z0-9-]{6,25}$/;
const FACILITY_ID=/^(PHC|REF)-[A-C]$/;
const STATES=new Set(["offered","accepted","arrived","completed",
  "declined","escalated","expired"]);
function assertArray(value,name) {
  if(!Array.isArray(value)||value.length>100)throw Error("Invalid fictional "+name);
}
function cleanAge(updatedAt,now){
  const at=Date.parse(updatedAt),age=now-at;
  if(typeof updatedAt!=="string"||!Number.isFinite(age)||age<0)
    throw Error("Invalid fictional event time");
  return age;
}
function minimalCue(kind,id,facilityId,elapsedMs){
  return Object.freeze({
    kind,id,facilityId,minutesSinceUpdate:Math.floor(elapsedMs/60_000),
    nextAction:"Human review of fictional scenario only"
  });
}
/**
 * Returns bounded, deterministic synthetic workflow review cues.
 * This does not use names, narrative notes, ages, patient contact details,
 * real facilities or any clinical severity assessment.
 */
export function buildDemoWatchlist(facilities,referrals,now=Date.now()){
  assertArray(facilities,"facilities");assertArray(referrals,"referrals");
  if(!Number.isFinite(now))throw Error("Invalid simulated clock");
  const known=new Set();
  const facilityCues=[];
  for(const f of facilities){
    if(!f||f.demoOnly!==true||!FACILITY_ID.test(f.id)||
      !["phc","referral"].includes(f.type)||typeof f.active!=="boolean")
      throw Error("Non-fictional facility not allowed");
    if(known.has(f.id))throw Error("Duplicate fictional facility");
    known.add(f.id);
    if(f.type!=="referral"||!f.active)continue;
    const report=f.capacity;
    const kind=!reportIsFresh(report,now)?"capacity_stale":
      !(Number.isInteger(report.beds)&&report.beds>0&&report.skilled===true)
        ?"capacity_unavailable":null;
    if(kind)facilityCues.push(minimalCue(kind,f.id,f.id,0));
  }
  const seen=new Set(),referralCues=[];
  for(const r of referrals){
    if(!r||r.demoOnly!==true||!REFERRAL_ID.test(r.id)||
       !FACILITY_ID.test(r.facilityId)||!STATES.has(r.status))
       throw Error("Non-fictional referral not allowed");
    if(seen.has(r.id))throw Error("Duplicate fictional referral");
    seen.add(r.id);
    const elapsed=cleanAge(r.updatedAt,now);
    const kind=r.status==="offered"&&elapsed>=DEMO_REVIEW_MS.offered
       ?"offer_unacknowledged":
       r.status==="accepted"&&elapsed>=DEMO_REVIEW_MS.accepted
       ?"arrival_unconfirmed":
       r.status==="escalated"?"escalation_needs_review":null;
    if(kind)referralCues.push(minimalCue(kind,r.id,r.facilityId,elapsed));
  }
  const cues=[...referralCues,...facilityCues].slice(0,50);
  return Object.freeze({
    demoOnly:true,mode:"fictional_only",clinicalUse:false,liveOperations:false,
    generatedAt:new Date(now).toISOString(),
    operationalCueOnly:true,
    window:{maximumReferrals:100,returnedCues:cues.length,truncated:
      referralCues.length+facilityCues.length>50},
    cues,
    disclaimer:"Administrative role-play reminders; thresholds are illustrative, not clinical response times."
  });
}
