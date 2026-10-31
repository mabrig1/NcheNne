import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGING_ORIGIN,READ_PATHS,validateStagingResponse,runStagingReadOnly,assertSmokeOrigin}
  from '../src/staging-preflight.js';
const samples={
 '/api/health':{name:'NcheNne',version:'0.2.0',mode:'fictional_only',clinicalUse:false,liveOperations:false,ready:true,schemaReady:true},
 '/api/demo/ai/status':{demoOnly:true,mode:'fictional_only',enabled:false,ready:false,freeModelOnly:true,requiresHumanReview:true,reason:'disabled'},
 '/api/demo/summary':{demoOnly:true,mode:'fictional_only',clinicalUse:false,liveOperations:false,facilities:{total:0},referrals:{total:0}},
 '/api/facilities':{demoOnly:true,facilities:[]},
 '/api/demo/watchlist':{demoOnly:true,mode:'fictional_only',clinicalUse:false,liveOperations:false,operationalCueOnly:true,cues:[]},
 '/api/referrals':{demoOnly:true,referrals:[]}
};
function mockFetch(calls,alter={}) {
 return async(url,options)=>{
   calls.push({url,options});
   const path=new URL(url).pathname;
   const body={...samples[path],...(alter.body||{})};
   return new Response(JSON.stringify(body),{status:alter.status||200,
     headers:{'Content-Type':alter.contentType||'application/json'}});
 };
}
test('fixed staging origin and six GET-only routes including AI-off check',async()=>{
 const calls=[];
 const results=await runStagingReadOnly({fetchImpl:mockFetch(calls)});
 assert.equal(results.length,6);
 assert.deepEqual(calls.map(x=>x.url),READ_PATHS.map(p=>STAGING_ORIGIN+p));
 assert.ok(calls.every(x=>x.options.method==='GET' && x.options.redirect==='manual' &&
   x.options.cache==='no-store' && !('Authorization' in x.options.headers)));
});
test('unpaired Access credentials stop before making any request',async()=>{
 let called=false;
 await assert.rejects(runStagingReadOnly({fetchImpl:()=>{called=true;},clientId:'abc'}),/required together/);
 assert.equal(called,false);
});
test('scoped Access credentials are sent only to the staging hostname',async()=>{
 const calls=[];
 await runStagingReadOnly({fetchImpl:mockFetch(calls),clientId:'id',clientSecret:'hidden'});
 assert.ok(calls.every(c=>new URL(c.url).hostname==='nchenne-staging.victoryonline1.workers.dev'));
 assert.ok(calls.every(c=>c.options.headers['CF-Access-Client-Secret']==='hidden'));
});
test('Access login redirect or denial fails closed without following redirect',async()=>{
 let calls=0;
 await assert.rejects(runStagingReadOnly({fetchImpl:async()=>{calls++;
   return {status:302,headers:new Headers({Location:'https://example.com/login'})};
 }}),/Access authentication required/);
 assert.equal(calls,1);
});
test('rejects a bound but unmigrated D1 or legacy health without schema evidence',()=>{
 const current=samples['/api/health'];
 assert.throws(()=>validateStagingResponse('/api/health',
  {...current,ready:false}),/not proven fictional/);
 assert.throws(()=>validateStagingResponse('/api/health',
  {...current,schemaReady:false}),/not proven fictional/);
 const old={...current}; delete old.schemaReady;
 assert.throws(()=>validateStagingResponse('/api/health',old),/not proven fictional/);
});
test('remote AI must be off even if Cloudflare bindings look safe',()=>{
 const good=samples['/api/demo/ai/status'];
 assert.equal(validateStagingResponse('/api/demo/ai/status',good).enabled,false);
 for(const bad of [
  {...good,enabled:true},
  {...good,ready:true},
  {...good,reason:'ready'},
  {...good,clinicalUse:true},
  {...good,mode:'clinical'}
 ]) assert.throws(()=>validateStagingResponse('/api/demo/ai/status',bad),
   /Remote fictional AI|forbidden identifying/);
});
test('missing safe flags or real facility identifiers are rejected',()=>{
 assert.throws(()=>validateStagingResponse('/api/health',
   {...samples['/api/health'],liveOperations:true}),/Clinical\/live/);
 assert.throws(()=>validateStagingResponse('/api/facilities',
   {demoOnly:true,facilities:[{id:'ACTUAL-HOSPITAL',demoOnly:true}]}),/Unapproved facility/);
});
test('identifying fields nested anywhere are rejected',()=>{
 assert.throws(()=>validateStagingResponse('/api/referrals',
   {demoOnly:true,referrals:[{id:'SIM-ABC12345',facilityId:'REF-A',status:'offered',
    demoOnly:true,timeline:[{phone:'123'}]}]}),/forbidden identifying/);
});
test('malformed response and non-JSON content fail closed',async()=>{
 const calls=[];
 await assert.rejects(runStagingReadOnly({fetchImpl:mockFetch(calls,{contentType:'text/html'})}),/not JSON/);
});
test('zero-facility / zero-referral database is valid but does not imply seeded e2e tests',()=>{
 for(const [path,body] of Object.entries(samples))
   assert.equal(validateStagingResponse(path,body).status,'passed');
});
test('mutating smoke is local-only unless private staging explicitly opted in',()=>{
 assert.equal(assertSmokeOrigin('http://127.0.0.1:8787').hostname,'127.0.0.1');
 assert.throws(()=>assertSmokeOrigin('https://nchenne.mabrigkorie.org/',
  'WRITE_SYNTHETIC_STAGING_ONLY'),/Refusing mutable/);
 assert.throws(()=>assertSmokeOrigin(STAGING_ORIGIN),/Refusing mutable/);
 assert.equal(assertSmokeOrigin(STAGING_ORIGIN,'WRITE_SYNTHETIC_STAGING_ONLY').origin,STAGING_ORIGIN);
 assert.throws(()=>assertSmokeOrigin('http://attack.invalid:8787'),/Refusing mutable/);
 assert.throws(()=>assertSmokeOrigin('http://127.0.0.1:8787/foo'),/bare URL/);
});
