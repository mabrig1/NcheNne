import test from "node:test";
import assert from "node:assert/strict";
import {explainFictionalScenario,openRouterStatus} from "../src/openrouter.js";
import worker from "../worker/index.js";

const token="demoonlysecuresecret".repeat(3);
const env={APP_MODE:"synthetic_demo",LIVE_CLINICAL_ENABLED:"false",DB:{},
  DEMO_API_TOKEN:token,OPENROUTER_API_KEY:"sk-or-v1-this-is-a-fake-unit-test-key",
  OPENROUTER_MODEL:"fictional/demo-model:free",OPENROUTER_ENABLED:"true"};
const requestBody={demoOnly:true,scenario:"offer_unacknowledged"};
const success={choices:[{message:{role:"assistant",content:
  "Ask the fictional coordinator to review the demonstration offer status."}}]};

test("OpenRouter is disabled by default and never reveals keys",()=>{
 const status=openRouterStatus({...env,OPENROUTER_ENABLED:"false"});
 assert.equal(status.enabled,false);
 assert.equal(status.ready,false);
 assert.equal(status.reason,"disabled");
 assert.doesNotMatch(JSON.stringify(status),/sk-or|DEMO_API_TOKEN|model:free/);
});
test("requires explicit :free model, configured key and opt-in",()=>{
 for(const model of ["openrouter/auto","fictional/demo-model",
   "openai/gpt-4","https://evil.example/test","fictional/demo-model:paid", ""]){
   const s=openRouterStatus({...env,OPENROUTER_MODEL:model});
   assert.equal(s.ready,false,model);
   assert.equal(s.reason,"explicit_free_model_required");
 }
 const s=openRouterStatus({...env,OPENROUTER_API_KEY:""});
 assert.equal(s.ready,false);
 assert.equal(s.reason,"secret_not_configured");
 assert.equal(openRouterStatus(env).ready,true);
});
test("disabled or incomplete config makes zero outbound calls",async()=>{
 let called=0;
 const fetcher=()=>{called++;throw Error("Must not make a request");};
 for(const e of [{...env,OPENROUTER_ENABLED:"false"},
   {...env,OPENROUTER_MODEL:"openrouter/auto"},
   {...env,OPENROUTER_API_KEY:undefined}]){
   const result=await explainFictionalScenario(e,requestBody,fetcher);
   assert.equal(result.statusCode,503);
 }
 assert.equal(called,0);
});
test("refuses patient fields, free-text prompts, real referrals and unknown scenarios",async()=>{
 for(const bad of [
   {...requestBody,patientName:"PRIVATE"},
   {...requestBody,phone:"+2348000000000"},
   {...requestBody,notes:"do some clinical triage"},
   {...requestBody,scenario:"diagnose"},
   {...requestBody,scenario:"what is my prescription"},
   {...requestBody,demoOnly:false},null
 ]){
   await assert.rejects(async()=>explainFictionalScenario(env,bad,()=>{throw Error("Network called")}));
 }
});
test("approved enum sends bounded fictional prompt only and refuses paid fallbacks",async()=>{
 let seen=0;
 const response=await explainFictionalScenario(env,requestBody,async(url,init)=>{
   seen++;
   assert.equal(url,"https://openrouter.ai/api/v1/chat/completions");
   assert.equal(init.method,"POST");
   assert.equal(init.redirect,"error");
   assert.equal(init.headers.Authorization,"Bearer "+env.OPENROUTER_API_KEY);
   assert.equal(init.headers["Content-Type"],"application/json");
   const json=JSON.parse(init.body);
   assert.equal(json.model,"fictional/demo-model:free");
   assert.equal(json.stream,false);
   assert.equal(json.max_tokens,96);
   assert.equal(json.provider.zdr,true);
   assert.equal(json.provider.data_collection,"deny");
   assert.equal(json.provider.allow_fallbacks,false);
   assert.equal(json.messages.length,2);
   assert.equal(json.messages[1].role,"user");
   assert.match(json.messages[1].content,/fictional referral offer/);
   assert.doesNotMatch(init.body,/PRIVATE|\+234|hospital address|patientName/);
   return {ok:true,async json(){return success;}};
 });
 assert.equal(seen,1);
 assert.equal(response.statusCode,200);
 assert.equal(response.body.demoOnly,true);
 assert.equal(response.body.clinicalUse,false);
 assert.equal(response.body.liveOperations,false);
 assert.equal(response.body.aiGenerated,true);
});
test("unsafe or invalid provider output is discarded without leaking details",async()=>{
 for(const content of ["Take 500mg medication","Treat the patient right away",
   "Visit https://not-real.example", "<script>alert(1)</script>",
   "", "a".repeat(181), "Wait for emergency staff"]){
   const res=await explainFictionalScenario(env,requestBody,
     async()=>({ok:true,json:async()=>({choices:[{message:{content}}]})}));
   assert.equal(res.statusCode,502,content);
   assert.doesNotMatch(JSON.stringify(res.body),/500mg|script|https|patient|emergency/);
 }
 const err=await explainFictionalScenario(env,requestBody,
   async()=>({ok:false,status:401,json:async()=>({error:"Key is bad"})}));
 assert.equal(err.statusCode,502);
 assert.doesNotMatch(JSON.stringify(err.body),/Key is bad/);
});
test("Worker's AI endpoint requires owner bearer auth, even when disabled",async()=>{
 const req=new Request("https://demo.invalid/api/demo/ai/explain",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(requestBody)});
 const noAuth=await worker.fetch(req.clone(),env);
 assert.equal(noAuth.status,401);
 const auth=new Request(req.url,{
   method:"POST",headers:{"Content-Type":"application/json",
     Authorization:"Bearer "+token},
   body:JSON.stringify(requestBody)});
 const disabled=await worker.fetch(auth,{...env,OPENROUTER_ENABLED:"false"});
 assert.equal(disabled.status,503);
 const response=await disabled.json();
 assert.equal(response.reason,"disabled");
 assert.doesNotMatch(JSON.stringify(response),/sk-or|secret/);
});
test("AI status is key-free and false when no credentials are available",async()=>{
 const res=await worker.fetch(new Request("https://demo.invalid/api/demo/ai/status"),
   {...env,OPENROUTER_ENABLED:"false"});
 assert.equal(res.status,200);
 const status=await res.json();
 assert.equal(status.enabled,false);
 assert.equal(status.ready,false);
 assert.doesNotMatch(JSON.stringify(status),/sk-or|fictional\/demo-model/);
});
