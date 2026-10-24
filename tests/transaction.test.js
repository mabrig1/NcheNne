import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

// A tiny fake D1 driver to assert that the Worker uses D1.batch for its
// UPDATE+audit write. It does not substitute for a real D1 integration test.
function fixture(){
 const time=new Date(Date.now()-1000).toISOString();
 const row={id:"SIM-ABC12345",code:"DABC12345",facility_id:"REF-A",
   need:"theatre",status:"offered",demo_only:1,created_at:time,updated_at:time};
 const events=[{status:"offered",at:time,actor:"demo_coordinator",detail:"Fictional offer"}];
 const health={id:"REF-A",display_name:"Demo Referral Hospital",district:"Abakaliki",type:"referral",active:1,
   beds:3,skilled:1,theatre:1,blood:1,updated_at:time,reported_by:"demo_facility_staff"};
 let rejectBatch=true,batchCalls=0;
 const db={
   prepare(sql){
     return {
       sql,args:[],
       bind(...args){this.args=args;return this;},
       async first(){
         if(sql.startsWith("SELECT * FROM referrals"))return {...row};
         throw Error("Unexpected .first(): "+sql);
       },
       async all(){
         if(sql.startsWith("SELECT status,at,actor,detail FROM referral_events"))
           return {results:events.map(x=>({...x}))};
         if(sql.startsWith("SELECT f.id,f.display_name"))
           return {results:[{...health}]};
         throw Error("Unexpected .all(): "+sql);
       }
     };
   },
   async batch(queries){
     batchCalls++;
     assert.equal(queries.length,2,"transition must atomically write state and audit event");
     assert.match(queries[0].sql,/UPDATE referrals/);
     assert.match(queries[0].sql,/status=\?/);
     assert.match(queries[0].sql,/updated_at=\?/);
     assert.match(queries[1].sql,/INSERT INTO referral_events/);
     assert.match(queries[1].sql,/WHERE EXISTS/);
     if(rejectBatch)throw Error("Simulated database audit failure");
     const [next,at,id,oldStatus,oldAt]=queries[0].args;
     if(id!==row.id||oldStatus!==row.status||oldAt!==row.updated_at)
       return [{results:[]},{meta:{changes:0}}];
     row.status=next;row.updated_at=at;
     const [referral_id,status,actor,detail,eventAt]=queries[1].args;
     assert.equal(referral_id,id);
     assert.equal(status,next);
     events.push({status,actor,detail,at:eventAt});
     return [{results:[{id}]},{meta:{changes:1}}];
   }
 };
 return {db,row,events,get calls(){return batchCalls},allow(){rejectBatch=false}};
}
const env=f=>({APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"false",
  DEMO_API_TOKEN:"a".repeat(32),DB:f.db});
const action=async(f,name)=>worker.fetch(new Request(
 "https://demo.invalid/api/referrals/SIM-ABC12345/"+name,{
 method:"POST",headers:{Authorization:"Bearer "+"a".repeat(32),
 "Content-Type":"application/json"},body:'{"demoOnly":true}'
 }),env(f));

test("no orphan status update if audit event insertion fails",async()=>{
 const f=fixture();
 const r=await action(f,"accept");
 assert.equal(r.status,409);
 assert.equal(f.row.status,"offered");
 assert.equal(f.events.length,1);
 assert.equal(f.calls,1);
});
test("fake D1 path enforces serial offer, acceptance, arrival and completion",async()=>{
 const f=fixture();f.allow();
 for(const [a,s] of [["accept","accepted"],["arrive","arrived"],["complete","completed"]]){
   const r=await action(f,a);
   assert.equal(r.status,200,JSON.stringify(await r.json()));
   assert.equal(f.row.status,s);
 }
 assert.equal(f.events.length,4);
 assert.equal(f.calls,3);
 const duplicate=await action(f,"complete");
 assert.notEqual(duplicate.status,200);
 assert.equal(f.events.length,4);
});
