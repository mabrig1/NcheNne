import test from "node:test";
import assert from "node:assert/strict";
import {buildDemoWatchlist,DEMO_REVIEW_MS} from "../src/watchlist.js";

const T=Date.parse("2026-10-24T08:00:00.000Z");
function facility(id="REF-A",options={}){
 return {id,type:"referral",active:true,demoOnly:true,
  capacity:{beds:3,skilled:true,theatre:true,blood:true,
   updatedAt:new Date(T-60_000).toISOString(),reportedBy:"demo_facility_staff"},
  ...options};
}
function referral(id="SIM-ABC12345",status="offered",ms=0,more={}){
 return {id,facilityId:"REF-A",status,updatedAt:new Date(T-ms).toISOString(),
  demoOnly:true,...more};
}
test("fresh fictional facilities and unexpired offers create no administrative cues",()=>{
 const r=buildDemoWatchlist([facility()],[referral()],T);
 assert.equal(r.demoOnly,true);
 assert.equal(r.clinicalUse,false);
 assert.equal(r.liveOperations,false);
 assert.equal(r.cues.length,0);
 assert.equal(r.operationalCueOnly,true);
});
test("synthetic offer unacknowledged threshold requires human review",()=>{
 const before=buildDemoWatchlist([facility()],[referral("SIM-ABC12345","offered",DEMO_REVIEW_MS.offered-1)],T);
 assert.equal(before.cues.length,0);
 const r=buildDemoWatchlist([facility()],[referral("SIM-ABC12345","offered",DEMO_REVIEW_MS.offered)],T);
 assert.equal(r.cues[0].kind,"offer_unacknowledged");
 assert.equal(r.cues[0].id,"SIM-ABC12345");
 assert.equal(r.cues[0].minutesSinceUpdate,10);
 assert.equal(r.cues[0].nextAction,"Human review of fictional scenario only");
});
test("synthetic arrived/completed records never imply missed clinical deadline",()=>{
 for(const status of ["arrived","completed","expired","declined"]){
  const r=buildDemoWatchlist([facility()],[referral("SIM-ABC12345",status,60*60_000)],T);
  assert.equal(r.cues.length,0,status);
 }
});
test("accepted arrival delay and explicit escalation generate separate fictional cues",()=>{
 const r=buildDemoWatchlist([facility()],
   [referral("SIM-ABC12345","accepted",30*60_000),
    referral("SIM-XYZ99999","escalated",1000)],T);
 assert.deepEqual(r.cues.map(c=>c.kind),["arrival_unconfirmed","escalation_needs_review"]);
});
test("report age and lack of suitable capacity generate distinct review entries",()=>{
 const stale={...facility("REF-B"),capacity:{
    ...facility("REF-B").capacity,updatedAt:new Date(T-46*60_000).toISOString()}};
 const unavailable={...facility("REF-C"),capacity:{
    ...facility("REF-C").capacity,beds:0}};
 const cues=buildDemoWatchlist([facility(),stale,unavailable],[],T).cues;
 assert.deepEqual(cues.map(c=>c.kind),["capacity_stale","capacity_unavailable"]);
});
test("unknown, duplicate and non-fictional cases fail closed",()=>{
 for(const invalid of [
   referral("SIM-ABC12345","offered",0,{demoOnly:false}),
   referral("PATIENT-12345","offered"),
   referral("SIM-ABC12345","diagnosis"),
   referral("SIM-ABC12345","offered",0,{facilityId:"Real Hospital"}),
   referral("SIM-ABC12345","offered",0,{updatedAt:"tomorrow"})
 ]){
   assert.throws(()=>buildDemoWatchlist([facility()],[invalid],T));
 }
 assert.throws(()=>buildDemoWatchlist([facility(),facility()],[],T));
 assert.throws(()=>buildDemoWatchlist([facility()], [referral(),referral()],T));
 assert.throws(()=>buildDemoWatchlist([facility("Real Hospital")],[],T));
 assert.throws(()=>buildDemoWatchlist([facility("REF-A",{demoOnly:false})],[],T));
});
test("watchlist does not expose arbitrary free-text, patient name or clinical details",()=>{
 const row=referral("SIM-ABC12345","offered",20*60_000,
    {patientName:"LEAK",phone:"+2348000000000",notes:"diagnosis"});
 const fac=facility("REF-A",{displayName:"LEAK",street:"LEAK"});
 const result=buildDemoWatchlist([fac],[row],T);
 const serialized=JSON.stringify(result);
 assert.doesNotMatch(serialized,/LEAK|phone|diagnosis|patientName/);
 assert.equal(result.cues[0].kind,"offer_unacknowledged");
});
test("limits returned cues to 50 and labels them fictional",()=>{
 const items=Array.from({length:60},(_,i)=>
  referral("SIM-"+String(i).padStart(8,"0"),"offered",20*60_000));
 const r=buildDemoWatchlist([facility()],items,T);
 assert.equal(r.cues.length,50);
 assert.equal(r.window.truncated,true);
 assert.equal(r.window.maximumReferrals,100);
 assert.match(r.disclaimer,/not clinical/);
});
