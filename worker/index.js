import {NEEDS,eligible,createOffer,transition,validateOffer,iso} from "../src/domain.js";
import {buildDemoWatchlist} from "../src/watchlist.js";
import {openRouterStatus,explainFictionalScenario} from "../src/openrouter.js";
import {checkFictionalReadiness} from "../src/readiness.js";
const HEADERS={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
  "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy":"no-referrer","X-Frame-Options":"DENY",
  "X-Robots-Tag":"noindex, nofollow, noarchive",
  "Permissions-Policy":"camera=(), microphone=(), geolocation=(), payment=()"};
const reply=(data,status=200)=>Response.json(data,{status,headers:HEADERS});
const error=(message,status=400)=>reply({demoOnly:true,error:message},status);
const DEMOS=[
 ["PHC-A","Demo PHC • North","Abakaliki","phc"],
 ["PHC-B","Demo PHC • Centre","Ebonyi","phc"],
 ["PHC-C","Demo PHC • East","Onicha","phc"],
 ["REF-A","Demo Referral Hospital • Central","Abakaliki","referral"],
 ["REF-B","Demo Referral Hospital • South","Afikpo","referral"],
 ["REF-C","Demo Referral Hospital • West","Onicha","referral"]
];
async function requireOwner(req,env){
 if(env.APP_MODE!=="synthetic_demo"||env.LIVE_CLINICAL_ENABLED!=="false"||
    typeof env.DEMO_API_TOKEN!=="string"||env.DEMO_API_TOKEN.length<24)return false;
 const supplied=(req.headers.get("authorization")||"").replace(/^Bearer /,"");
 if(supplied.length!==env.DEMO_API_TOKEN.length||!supplied)return false;
 const digest=async t=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)));
 const [a,b]=await Promise.all([digest(supplied),digest(env.DEMO_API_TOKEN)]);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
async function parseDemo(req,keys){
 if(!(req.headers.get("content-type")||"").startsWith("application/json"))throw Error("JSON required");
 if(Number(req.headers.get("content-length")||0)>2048)throw Error("Oversized demo request");
 const raw=await req.text();if(raw.length>2048)throw Error("Oversized demo request");
 const obj=JSON.parse(raw);
 if(!obj||Array.isArray(obj)||typeof obj!=="object"||
    Object.keys(obj).sort().join()!==keys.sort().join()||obj.demoOnly!==true)
    throw Error("Only strict fictional payloads supported");
 return obj;
}
async function facilities(db){
 const r=await db.prepare("SELECT f.id,f.display_name,f.district,f.type,f.active,c.beds,c.skilled,c.theatre,c.blood,c.updated_at,c.reported_by FROM facilities f LEFT JOIN capacity_reports c ON c.facility_id=f.id WHERE f.demo_only=1 ORDER BY f.id").all();
 return r.results.map(x=>({id:x.id,name:x.display_name,district:x.district,type:x.type,
   active:x.active===1,demoOnly:true,capacity:x.updated_at?{
   beds:x.beds,skilled:x.skilled===1,theatre:x.theatre===1,blood:x.blood===1,
   updatedAt:x.updated_at,reportedBy:x.reported_by}:null}));
}
async function getReferral(db,id){
 const row=await db.prepare("SELECT * FROM referrals WHERE id=? AND demo_only=1").bind(id).first();
 if(!row)return null;
 const events=(await db.prepare("SELECT status,at,actor,detail FROM referral_events WHERE referral_id=? ORDER BY id").bind(id).all()).results;
 return {id:row.id,code:row.code,facilityId:row.facility_id,need:row.need,
   status:row.status,demoOnly:true,createdAt:row.created_at,updatedAt:row.updated_at,timeline:events};
}
async function api(req,env,path){
 if(req.method==="GET"&&path==="/api/health"){
   // A binding alone is not enough: check that fictional D1 migrations
   // installed every expected table. SQL or account details never leak.
   const {ready,schemaReady}=await checkFictionalReadiness(env);
   return reply({name:"NcheNne",version:"0.2.0",mode:"fictional_only",
     clinicalUse:false,liveOperations:false,ready,schemaReady},ready?200:503);
 }
 if(env.APP_MODE!=="synthetic_demo"||env.LIVE_CLINICAL_ENABLED!=="false")
   return error("Live clinical mode is unsupported",503);
 if(!env.DB)return error("Fictional D1 database is not configured",503);
 if(req.method==="GET"&&path==="/api/demo/ai/status")
   return reply(openRouterStatus(env));
 if(req.method==="GET"&&path==="/api/facilities")
   return reply({demoOnly:true,facilities:await facilities(env.DB)});
 if(req.method==="GET"&&path==="/api/demo/summary"){
   // Aggregates are derived solely from the demo-only schema, never patient data.
   const sample=await facilities(env.DB);
   const counts=(await env.DB.prepare(
     "SELECT status, COUNT(*) AS total FROM referrals WHERE demo_only=1 GROUP BY status"
   ).all()).results;
   const referralCounts=Object.fromEntries(
     ["offered","accepted","arrived","completed","declined","escalated","expired"]
       .map(status=>[status,0]));
   for(const item of counts){
     if(Object.hasOwn(referralCounts,item.status)&&Number.isSafeInteger(item.total)&&item.total>=0)
       referralCounts[item.status]=item.total;
   }
   const receiving=sample.filter(f=>f.type==="referral");
   const now=Date.now();
   return reply({
     demoOnly:true,mode:"fictional_only",clinicalUse:false,liveOperations:false,
     generatedAt:iso(now),
     facilities:{
       total:sample.length,
       receiving:receiving.length,
       freshReceiving:receiving.filter(f=>["skilled","theatre","blood","comprehensive"]
          .some(need=>eligible(f,need,now))).length,
       eligibleFor:Object.fromEntries(Object.keys(NEEDS)
         .map(need=>[need,receiving.filter(f=>eligible(f,need,now)).length]))
     },
     referrals:{
       total:Object.values(referralCounts).reduce((a,b)=>a+b,0),
       byStatus:referralCounts
     },
     disclaimer:"Fictional sample facilities and referrals; not actual healthcare availability."
   });
 }
 if(req.method==="GET"&&path==="/api/referrals"){
   const ids=(await env.DB.prepare("SELECT id FROM referrals WHERE demo_only=1 ORDER BY created_at DESC LIMIT 100").all()).results;
   return reply({demoOnly:true,referrals:await Promise.all(ids.map(x=>getReferral(env.DB,x.id)))});
 }
 if(req.method==="GET"&&path==="/api/demo/watchlist"){
   // Read-only bounded administrative cues from fictional fixtures only.
   const candidateRows=(await env.DB.prepare(
     "SELECT id,facility_id,status,updated_at,demo_only FROM referrals WHERE demo_only=1 ORDER BY updated_at ASC LIMIT 100"
   ).all()).results;
   const samples=candidateRows.map(r=>({
     id:r.id,facilityId:r.facility_id,status:r.status,
     updatedAt:r.updated_at,demoOnly:r.demo_only===1
   }));
   return reply(buildDemoWatchlist(await facilities(env.DB),samples));
 }
 if(req.method!=="POST")return error("Not found",404);
 if(!(await requireOwner(req,env)))return error("Owner authorization required for demo writes",401);
 if(path==="/api/demo/ai/explain"){
   // The owner token is checked above. Requests never send DB content or
   // user-authored text to OpenRouter; only an approved fictional enum.
   const result=await explainFictionalScenario(env,
     await parseDemo(req,["demoOnly","scenario"]));
   return reply(result.body,result.statusCode);
 }
 if(path==="/api/demo/seed"){
   await parseDemo(req,["demoOnly"]);
   for(const [id,name,district,type] of DEMOS){
     await env.DB.prepare("INSERT OR IGNORE INTO facilities(id,display_name,district,type,active,demo_only) VALUES(?,?,?,?,1,1)")
       .bind(id,name,district,type).run();
     const isReferral=type==="referral";
     const beds=id==="REF-C"?0:(id==="REF-A"?3:isReferral?2:1);
     await env.DB.prepare("INSERT OR IGNORE INTO capacity_reports(facility_id,beds,skilled,theatre,blood,updated_at,reported_by) VALUES(?,?,?,?,?,?,?)")
       .bind(id,beds,id==="REF-C"?0:1,id==="REF-A"?1:0,isReferral&&id!=="REF-C"?1:0,iso(),"demo_facility_staff").run();
   }
   return reply({demoOnly:true,facilities:await facilities(env.DB)});
 }
 if(path==="/api/capacities/report"){
   const b=await parseDemo(req,["demoOnly","facilityId","beds","skilled","theatre","blood"]);
   if(typeof b.facilityId!=="string"||!demoId(b.facilityId)||
      !Number.isInteger(b.beds)||b.beds<0||b.beds>500||
      ["skilled","theatre","blood"].some(k=>typeof b[k]!=="boolean"))
       return error("Invalid fictional capacity report");
   const f=await env.DB.prepare("SELECT id FROM facilities WHERE id=? AND demo_only=1").bind(b.facilityId).first();
   if(!f)return error("Unknown fictional facility",404);
   await env.DB.prepare("INSERT INTO capacity_reports(facility_id,beds,skilled,theatre,blood,updated_at,reported_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(facility_id) DO UPDATE SET beds=excluded.beds,skilled=excluded.skilled,theatre=excluded.theatre,blood=excluded.blood,updated_at=excluded.updated_at,reported_by=excluded.reported_by")
    .bind(b.facilityId,b.beds,Number(b.skilled),Number(b.theatre),Number(b.blood),iso(),"demo_facility_staff").run();
   return reply({demoOnly:true,reported:true});
 }
 if(path==="/api/referrals"){
   const b=validateOffer(await parseDemo(req,["demoOnly","facilityId","id","need"]));
   const f=(await facilities(env.DB)).find(x=>x.id===b.facilityId);
   const offer=createOffer(f,b.need,b.id);
   try{await env.DB.batch([
     env.DB.prepare("INSERT INTO referrals(id,code,facility_id,need,status,demo_only,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)")
       .bind(offer.id,offer.code,offer.facilityId,offer.need,offer.status,offer.createdAt,offer.updatedAt),
     env.DB.prepare("INSERT INTO referral_events(referral_id,status,actor,detail,at) VALUES(?,?,?,?,?)")
       .bind(offer.id,"offered","demo_coordinator",offer.timeline[0].detail,offer.createdAt)
   ]);return reply(offer,201);}catch{return error("Duplicate synthetic referral",409);}
 }
 const match=path.match(/^\/api\/referrals\/(SIM-[A-Z0-9-]{6,25})\/(accept|arrive|complete|decline|escalate|expire)$/);
 if(!match)return error("Not found",404);
 await parseDemo(req,["demoOnly"]);
 const next={accept:"accepted",arrive:"arrived",complete:"completed",decline:"declined",
   escalate:"escalated",expire:"expired"}[match[2]];
 const original=await getReferral(env.DB,match[1]);
 if(!original)return error("Unknown synthetic referral",404);
 if(next==="accepted"){
   const f=(await facilities(env.DB)).find(x=>x.id===original.facilityId);
   if(!eligible(f,original.need))return error("Capacity stale or requirements unavailable",409);
 }
 const actor=["accepted","arrived","completed"].includes(next)?"demo_facility_staff":"demo_coordinator";
 const updated=transition(original,next,actor);
 // Conditional update prevents stale-state overwrite; production would need fully atomic event log.
 // D1 batch is an atomic SQL transaction: no status change may survive
 // if the corresponding fictional audit event cannot be recorded.
 // The conditional UPDATE is an optimistic state-and-version check.
 try {
   const result=await env.DB.batch([
     env.DB.prepare("UPDATE referrals SET status=?,updated_at=? WHERE id=? AND status=? AND updated_at=? RETURNING id")
       .bind(next,updated.updatedAt,original.id,original.status,original.updatedAt),
     env.DB.prepare("INSERT INTO referral_events(referral_id,status,actor,detail,at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM referrals WHERE id=? AND status=? AND updated_at=?)")
       .bind(original.id,next,actor,updated.timeline.at(-1).detail,updated.updatedAt,
         original.id,next,updated.updatedAt)
   ]);
   if(result[0]?.results?.length!==1||result[1]?.meta?.changes!==1)
     return error("Concurrent demo transition; retry",409);
 }catch{
   return error("Demo state conflict or event recording failed; no event was committed",409);
 }
 return reply(updated);
}
function demoId(id){return /^(PHC|REF)-[A-C]$/.test(id);}
export default {async fetch(req,env){
 try{
   const path=new URL(req.url).pathname;
   if(path.startsWith("/api/"))return await api(req,env,path);
   return env.ASSETS?env.ASSETS.fetch(req):error("Static assets not configured",503);
 }catch(e){
   if(e instanceof SyntaxError)return error("Malformed synthetic JSON");
   return error("Fictional request rejected",400);
 }
}};
