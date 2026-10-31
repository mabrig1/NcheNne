/**
 * Opt-in integration smoke test for a SYNTHETIC-ONLY NcheNne deployment.
 * Never pass real patient details. Never print or embed DEMO_API_TOKEN.
 *
 * Example:
 *   NCHENNE_BASE_URL=http://127.0.0.1:8787 DEMO_API_TOKEN=... npm run smoke:demo
 */
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {assertSmokeOrigin,STAGING_ORIGIN} from "../src/staging-preflight.js";

const base=assertSmokeOrigin(
  process.env.NCHENNE_BASE_URL||"http://127.0.0.1:8787",
  process.env.NCHENNE_REMOTE_DEMO_SMOKE
);
// Remote smoke performs WRITES only after explicit owner opt-in, and only
// against the exact staging hostname. Never use the production domain.
const accessId=process.env.CF_ACCESS_CLIENT_ID;
const accessSecret=process.env.CF_ACCESS_CLIENT_SECRET;
if(Boolean(accessId)!==Boolean(accessSecret))
  throw Error("Cloudflare Access service credentials must be configured together");
const accessHeaders=base.origin===STAGING_ORIGIN&&accessId
  ?{"CF-Access-Client-Id":accessId,"CF-Access-Client-Secret":accessSecret}
  :{};
const token=process.env.DEMO_API_TOKEN;
if(!token||token.length<24)throw Error("Provide your demo-only DEMO_API_TOKEN in the shell environment");
async function request(method,path,body,authenticated=true){
 const headers={Accept:"application/json",...accessHeaders};
 if(body!==undefined)headers["Content-Type"]="application/json";
 if(authenticated)headers.Authorization="Bearer "+token;
 const response=await fetch(new URL(path,base),{
   method,headers,body:body===undefined?undefined:JSON.stringify(body),
   redirect:"error",signal:AbortSignal.timeout(9000),cache:"no-store"
 });
 const json=await response.json().catch(()=>({error:"Non-JSON response"}));
 return {status:response.status,json};
}
const fixture={demoOnly:true};
const wrong=await request("POST","/api/demo/seed",fixture,false);
assert.equal(wrong.status,401,"Anonymous simulation writes must be refused");
const healthResponse=await fetch(new URL("/api/health",base),{
  method:"GET",headers:accessHeaders,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(9000)
});
assert.equal(healthResponse.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
assert.equal(healthResponse.headers.get("x-frame-options"),"DENY");
assert.equal(healthResponse.headers.get("cache-control"),"no-store");
const htmlResponse=await fetch(new URL("/",base),{
  method:"GET",headers:accessHeaders,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(9000)
});
assert.equal(htmlResponse.status,200);
assert.equal(htmlResponse.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
assert.equal(htmlResponse.headers.get("x-frame-options"),"DENY");
assert.match(await htmlResponse.text(),/FICTIONAL DEMONSTRATION/);
const health=await request("GET","/api/health",undefined,false);
assert.equal(health.status,200);
assert.equal(health.json.clinicalUse,false);
assert.equal(health.json.liveOperations,false);
const before=await request("GET","/api/demo/summary",undefined,false);
assert.equal(before.status,200);
assert.equal(before.json.demoOnly,true);
assert.equal(before.json.clinicalUse,false);
assert.equal(before.json.liveOperations,false);
assert.ok(Number.isSafeInteger(before.json.referrals?.total) &&
  before.json.referrals.total>=0,"Fictional baseline referral count required");
const baselineTotal=before.json.referrals.total;
const baselineCompleted=before.json.referrals.byStatus?.completed||0;
const seeded=await request("POST","/api/demo/seed",fixture);
assert.equal(seeded.status,200);
assert.equal(seeded.json.demoOnly,true);
assert.ok(seeded.json.facilities.every(f=>f.demoOnly===true));
// Seeding is intentionally INSERT OR IGNORE: old fictional capacity reports
// expire after 45 min. Refresh only three fixed made-up receiving fixtures,
// so rerunning a smoke test never relies on a newly empty database.
for(const facility of [
 {facilityId:"REF-A",beds:3,skilled:true,theatre:true,blood:true},
 {facilityId:"REF-B",beds:2,skilled:true,theatre:false,blood:true},
 {facilityId:"REF-C",beds:0,skilled:false,theatre:false,blood:false}
]){
 const r=await request("POST","/api/capacities/report",{demoOnly:true,...facility});
 assert.equal(r.status,200,"Fictional receiving-facility refresh must succeed");
 assert.equal(r.json.demoOnly,true);
}
const emptySummary=await request("GET","/api/demo/summary",undefined,false);
assert.equal(emptySummary.status,200);
assert.equal(emptySummary.json.demoOnly,true);
assert.equal(emptySummary.json.clinicalUse,false);
assert.equal(emptySummary.json.liveOperations,false);
assert.equal(emptySummary.json.facilities.total,6);
assert.equal(emptySummary.json.facilities.receiving,3);
assert.equal(emptySummary.json.facilities.freshReceiving,2);
assert.equal(emptySummary.json.referrals.total,baselineTotal,"Seeding must not create fictional referrals");
const initialWatch=await request("GET","/api/demo/watchlist",undefined,false);
assert.equal(initialWatch.status,200);
assert.equal(initialWatch.json.demoOnly,true);
assert.equal(initialWatch.json.clinicalUse,false);
assert.equal(initialWatch.json.liveOperations,false);
assert.equal(initialWatch.json.operationalCueOnly,true);
assert.ok(initialWatch.json.cues.some(c=>c.kind==="capacity_unavailable"&&c.id==="REF-C"),
  "A fictional receiving facility with zero beds must be flagged for review");
assert.ok(initialWatch.json.cues.every(c=>!Object.hasOwn(c,"patientName")&&
  !Object.hasOwn(c,"phone")&&!Object.hasOwn(c,"detail")));


// Fail-closed checks against real-looking or unsupported case data.
const identifying=await request("POST","/api/referrals",{
  demoOnly:true,facilityId:"REF-A",need:"blood",id:"SIM-FAKE123456",phone:"+2348000000000"
});
assert.equal(identifying.status,400,"Unexpected patient identifier must be rejected");
const unavailable=await request("POST","/api/referrals",{
  demoOnly:true,facilityId:"REF-C",need:"comprehensive",id:"SIM-FAKE999999"
});
assert.equal(unavailable.status,400,"Never offer a fictional facility with no capacity");
const id="SIM-"+randomBytes(7).toString("hex").toUpperCase();
const created=await request("POST","/api/referrals",{
  demoOnly:true,facilityId:"REF-A",need:"comprehensive",id
});
assert.equal(created.status,201);
assert.equal(created.json.status,"offered");
assert.equal(created.json.timeline.length,1);
const premature=await request("POST",`/api/referrals/${id}/arrive`,fixture);
assert.equal(premature.status,400,"Simulated arrival cannot precede acceptance");
for(const [action,expected] of [
 ["accept","accepted"],["arrive","arrived"],["complete","completed"]
]){
 const r=await request("POST",`/api/referrals/${id}/${action}`,fixture);
 assert.equal(r.status,200,`${action}: ${JSON.stringify(r.json)}`);
 assert.equal(r.json.status,expected);
}
const list=await request("GET","/api/referrals",undefined,false);
assert.equal(list.status,200);
const completed=list.json.referrals.find(r=>r.id===id);
assert.equal(completed.status,"completed");
assert.equal(completed.timeline.length,4);
const summary=await request("GET","/api/demo/summary",undefined,false);
assert.equal(summary.status,200);
assert.equal(summary.json.mode,"fictional_only");
assert.equal(summary.json.referrals.total,baselineTotal+1,"Exactly one new fictional referral expected");
assert.equal(summary.json.referrals.byStatus.completed,baselineCompleted+1);
assert.equal(summary.json.referrals.byStatus.offered,before.json.referrals.byStatus.offered);
assert.equal(summary.json.facilities.eligibleFor.comprehensive,1);
const closedWatch=await request("GET","/api/demo/watchlist",undefined,false);
assert.equal(closedWatch.status,200);
assert.equal(closedWatch.json.cues.some(c=>c.id===id),false,
  "Completed fictional referral must not remain in manual-review queue");


const extra=await request("POST",`/api/referrals/${id}/complete`,fixture);
assert.notEqual(extra.status,200,"Duplicate completion should fail");
console.log("PASS: fictional-only API, simulated referral transitions, safe headers, D1 aggregate and watchlist, patient-field rejection and no premature arrival.");
