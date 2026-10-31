import test from "node:test";
import assert from "node:assert/strict";
import {reportIsFresh,eligible,createOffer,transition,validateOffer,OFFER_WINDOW_MS} from "../src/domain.js";
import worker from "../worker/index.js";
const T=Date.parse("2026-10-24T07:00:00Z");
const facility={id:"REF-A",name:"Fictional Hospital",district:"Abakaliki",
 type:"referral",active:true,demoOnly:true,capacity:{beds:2,skilled:true,theatre:true,
 blood:true,updatedAt:new Date(T).toISOString(),reportedBy:"demo_facility_staff"}};
test("freshness expires without trusting future reports",()=>{
 assert.equal(reportIsFresh(facility.capacity,T),true);
 assert.equal(reportIsFresh(facility.capacity,T+46*60_000),false);
 assert.equal(reportIsFresh({...facility.capacity,updatedAt:new Date(T+1).toISOString()},T),false);
});
test("only fictional facilities with capabilities are eligible",()=>{
 assert.equal(eligible(facility,"comprehensive",T),true);
 assert.equal(eligible({...facility,demoOnly:false},"skilled",T),false);
 assert.equal(eligible({...facility,capacity:{...facility.capacity,beds:0}},"skilled",T),false);
});
test("offer never implies hospital acceptance",()=>{
 const r=createOffer(facility,"theatre","SIM-ABC12345",T);
 assert.equal(r.status,"offered");
 assert.match(r.timeline[0].detail,/no reservation/);
});
test("enforces human event ordering and simulated roles",()=>{
 let r=createOffer(facility,"blood","SIM-ABC12345",T);
 assert.throws(()=>transition(r,"arrived","demo_facility_staff",T+1));
 assert.throws(()=>transition(r,"accepted","demo_coordinator",T+1));
 r=transition(r,"accepted","demo_facility_staff",T+1);
 r=transition(r,"arrived","demo_facility_staff",T+2);
 r=transition(r,"completed","demo_facility_staff",T+3);
 assert.equal(r.status,"completed");
});
test("escalation cannot bypass explicit acceptance and aged offers cannot be accepted",()=>{
 let r=createOffer(facility,"skilled","SIM-GUARD123",T);
 r=transition(r,"escalated","demo_coordinator",T+1);
 assert.throws(()=>transition(r,"arrived","demo_facility_staff",T+2),
  /Invalid synthetic transition/);
 assert.throws(()=>transition(r,"accepted","demo_facility_staff",T+OFFER_WINDOW_MS),
  /Fictional offer expired/);
 const accepted=transition(r,"accepted","demo_facility_staff",T+2);
 assert.equal(accepted.status,"accepted");
 const arrived=transition(accepted,"arrived","demo_facility_staff",T+3);
 assert.equal(arrived.timeline.filter(e=>e.status==="accepted").length,1);
});
test("rejects identifying and non-fictional payloads",()=>{
 const obj={demoOnly:true,facilityId:"REF-A",need:"blood",id:"SIM-ABC12345"};
 assert.deepEqual(validateOffer(obj),obj);
 assert.throws(()=>validateOffer({...obj,phone:"+2348000000000"}));
 assert.throws(()=>validateOffer({...obj,demoOnly:false}));
});
test("health advertises nonclinical status only for safe synthetic D1 configuration",async()=>{
 const safe={APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"false",DB:{
   prepare:()=>({all:async()=>({results:[
     {name:"capacity_reports"},{name:"facilities"},{name:"referral_events"},{name:"referrals"}
   ]})})
 }};
 const r=await worker.fetch(new Request("https://demo.invalid/api/health"),safe);
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.clinicalUse,false);
 assert.equal(body.liveOperations,false);
 assert.equal(body.ready,true);
 assert.equal(body.schemaReady,true);
});
test("health is not falsely ready with missing D1 or unsafe deployment mode",async()=>{
 for(const env of [
  {},{APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"false"},
  {APP_MODE:"live",LIVE_CLINICAL_ENABLED:"false",DB:{}},
  {APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"true",DB:{}}
 ]){
  const response=await worker.fetch(new Request("https://demo.invalid/api/health"),env);
  assert.equal(response.status,503);
  assert.equal(response.headers.get("cache-control"),"no-store");
  const health=await response.json();
  assert.equal(health.ready,false);
  assert.equal(health.schemaReady,false);
  assert.equal(health.clinicalUse,false);
  assert.equal(health.liveOperations,false);
 }
});
test("clinical flag makes API fail closed",async()=>{
 const r=await worker.fetch(new Request("https://demo.invalid/api/facilities"),
  {APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"true",DB:{}});
 assert.equal(r.status,503);
});
test("write path rejects missing owner token",async()=>{
 const req=new Request("https://demo.invalid/api/demo/seed",{method:"POST",
  headers:{"content-type":"application/json"},body:'{"demoOnly":true}'});
 const r=await worker.fetch(req,{APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"false",
  DB:{},DEMO_API_TOKEN:"x".repeat(32)});
 assert.equal(r.status,401);
});
