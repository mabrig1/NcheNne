import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareReadPaths,auditCloudflareStagingMetadata,fetchCloudflareReadOnly}
 from '../src/cloudflare-readonly-audit.js';
const D1='19bcb136-470c-4e71-a767-cd3c09b4230f';
const ACCOUNT='a'.repeat(32);
const safeBindings=()=>[
 {type:'d1',name:'DB',database_id:D1},
 {type:'assets',name:'ASSETS'},
 {type:'plain_text',name:'APP_MODE',text:'synthetic_demo'},
 {type:'plain_text',name:'LIVE_CLINICAL_ENABLED',text:'false'},
 {type:'plain_text',name:'OPENROUTER_ENABLED',text:'false'},
 {type:'plain_text',name:'OPENROUTER_MODEL',text:''},
 {type:'secret_text',name:'DEMO_API_TOKEN'},
 {type:'secret_text',name:'OPENROUTER_API_KEY'}
];
const good=()=>({
 workerSettings:{bindings:safeBindings()},
 database:{name:'nchenne_demo',uuid:D1},
 subdomain:{enabled:true,previews_enabled:false}
});
function check(o){return auditCloudflareStagingMetadata(
 o.workerSettings,o.database,o.subdomain,D1);}
test('remote metadata can prove D1 binding identity, but NOT access or provenance',()=>{
 const result=check(good());
 assert.equal(result.databaseIdMatched,true);
 assert.equal(result.databaseNameMatched,true);
 assert.equal(result.workerBindingMatched,true);
 assert.equal(result.workerLevelAccessVerified,false);
 assert.equal(result.deployVersionProvenanceVerified,false);
 assert.equal(result.remoteWriteTestPerformed,false);
 assert.equal(result.productionRoutesVerified,false);
 assert.ok(Object.isFrozen(result));
 assert.doesNotMatch(JSON.stringify(result),/DEMO_API_TOKEN|OPENROUTER_API_KEY/);
});
test('rejects malformed, renamed or wrong D1 resource, resolving spelling discrepancy',()=>{
 for(const change of [
  o=>{o.database.name='chenne_demo';},
  o=>{o.database.name='real_patients';},
  o=>{o.database.uuid='11111111-2222-4333-8444-555555555555';},
  o=>{o.workerSettings.bindings[0].database_id='11111111-2222-4333-8444-555555555555';},
  o=>{o.workerSettings.bindings[0].name='CLINICAL_DB';},
  o=>{o.workerSettings.bindings.push({...o.workerSettings.bindings[0]});}
 ]){const o=good();change(o);assert.throws(()=>check(o));}
});
test('refuses Workers missing assets or core fictional-only flags',()=>{
 for(const change of [
  o=>{o.workerSettings.bindings=o.workerSettings.bindings.filter(b=>b.name!=='ASSETS');},
  o=>{o.workerSettings.bindings[2].text='live';},
  o=>{o.workerSettings.bindings[3].text='true';},
  o=>{o.workerSettings.bindings[4].text='true';},
  o=>{o.workerSettings.bindings[5].text='model:free';},
  o=>{o.workerSettings.bindings.push({type:'plain_text',name:'APP_MODE',text:'synthetic_demo'});}
 ]){const o=good();change(o);assert.throws(()=>check(o));}
});
test('remote audit fails closed on unreviewed secrets, resources or duplicate binding names',()=>{
 for(const change of [
  o=>{o.workerSettings.bindings.push({type:'kv_namespace',name:'REAL_DATA'});},
  o=>{o.workerSettings.bindings.push({type:'r2_bucket',name:'UPLOADS'});},
  o=>{o.workerSettings.bindings.push({type:'secret_text',name:'PATIENT_API_KEY'});},
  o=>{o.workerSettings.bindings.push({type:'plain_text',name:'LIVE_OPERATIONS',text:'true'});},
  o=>{o.workerSettings.bindings.push({type:'secret_text',name:'DEMO_API_TOKEN'});},
  o=>{o.workerSettings.bindings[0].type='service';},
  o=>{o.workerSettings.bindings[7].type='plain_text';}
 ]){
  const o=good();change(o);assert.throws(()=>check(o),/Unexpected or duplicated staging binding/);
 }
});
test('disabled workers.dev and enabled previews are unsafe',()=>{
 for(const change of [
  o=>{o.subdomain.enabled=false;},
  o=>{o.subdomain.previews_enabled=true;},
  o=>{o.subdomain.previews_enabled=undefined;}
 ]){const o=good();change(o);assert.throws(()=>check(o));}
});
test('GET-only API paths cannot be redirected to production worker',()=>{
 const paths=cloudflareReadPaths(ACCOUNT,D1);
 assert.deepEqual(Object.keys(paths),['settings','database','subdomain']);
 assert.ok(paths.settings.endsWith('/workers/scripts/nchenne-staging/settings'));
 assert.ok(paths.database.endsWith('/d1/database/'+D1));
 assert.ok(paths.subdomain.endsWith('/workers/scripts/nchenne-staging/subdomain'));
 assert.ok(Object.values(paths).every(path=>!path.includes('/nchenne/')));
 assert.throws(()=>cloudflareReadPaths('bad',D1));
 assert.throws(()=>cloudflareReadPaths(ACCOUNT,'bad'));
});
test('GET-only auditor requests only pin-fixed Cloudflare API URLs and never logs secrets',async()=>{
 const called=[];
 const mock=async(url,opts)=>{
  called.push({url,opts});
  const f=good();
  const data=url.endsWith('/settings')?f.workerSettings:
   url.endsWith('/subdomain')?f.subdomain:f.database;
  return new Response(JSON.stringify({success:true,result:data}),{
    status:200,headers:{'content-type':'application/json'}
  });
 };
 const result=await fetchCloudflareReadOnly({
  accountId:ACCOUNT,expectedDbId:D1,token:'secret-but-not-printed',fetchImpl:mock
 });
 assert.equal(result.databaseIdMatched,true);
 assert.equal(called.length,3);
 assert.ok(called.every(x=>x.url.startsWith('https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT)));
 assert.ok(called.every(x=>x.opts.method==='GET'&&x.opts.redirect==='error'&&
   x.opts.cache==='no-store'&&!('body' in x.opts)));
});
test('missing token and API permission errors fail without leaking response content',async()=>{
 let called=0;
 await assert.rejects(fetchCloudflareReadOnly({
  accountId:ACCOUNT,expectedDbId:D1,token:'',fetchImpl:async()=>{called++;},
 }),/read-only Cloudflare API token/);
 assert.equal(called,0);
 await assert.rejects(fetchCloudflareReadOnly({
  accountId:ACCOUNT,expectedDbId:D1,token:'a'.repeat(20),
  fetchImpl:async()=>new Response('private account or secret', {status:403,
    headers:{'content-type':'text/plain'}})
 }),err=>err.message.includes('HTTP 403')&&!err.message.includes('private account'));
});
test('malformed Cloudflare envelopes and non-JSON response fail closed',async()=>{
 for(const mock of [
  ()=>new Response('not-json',{status:200,headers:{'content-type':'text/html'}}),
  ()=>new Response('{',{status:200,headers:{'content-type':'application/json'}}),
  ()=>new Response(JSON.stringify({success:false,result:{}}),
   {status:200,headers:{'content-type':'application/json'}})
 ]){
  await assert.rejects(fetchCloudflareReadOnly({
   accountId:ACCOUNT,expectedDbId:D1,token:'a'.repeat(20),fetchImpl:mock
  }));
 }
});
