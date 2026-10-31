/**
 * Local-only fictional referral race test. Exercises a *real* Wrangler/D1 Worker.
 * NEVER runs against remote staging or the production website.
 * Does not log DEMO_API_TOKEN or any raw database row.
 */
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {assertSmokeOrigin} from '../src/staging-preflight.js';

const base=assertSmokeOrigin(process.env.NCHENNE_BASE_URL||'http://127.0.0.1:8787');
assert.equal(base.protocol,'http:', 'This test is local Wrangler only');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
const token=process.env.DEMO_API_TOKEN;
assert.ok(typeof token==='string' && token.length>=24, 'Local synthetic owner test token missing');

const makeRequest=async(method,path,body,owner=true)=>{
 const headers={Accept:'application/json'};
 if(owner) headers.Authorization='Bearer '+token;
 if(body!==undefined)headers['Content-Type']='application/json';
 const response=await fetch(new URL(path,base),{
  method,headers,body:body===undefined?undefined:JSON.stringify(body),
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9500)
 });
 return {status:response.status,data:await response.json()};
};
try {
 const health=await makeRequest('GET','/api/health');
 assert.equal(health.status,200);
 assert.equal(health.data.ready,true);
 assert.equal(health.data.clinicalUse,false);
 assert.equal(health.data.liveOperations,false);
 const before=await makeRequest('GET','/api/demo/summary');
 assert.equal(before.status,200);
 assert.equal(before.data.demoOnly,true);
 const id='SIM-'+randomBytes(9).toString('hex').toUpperCase();
 const created=await makeRequest('POST','/api/referrals',
   {demoOnly:true,id,need:'skilled',facilityId:'REF-A'});
 assert.equal(created.status,201,'Expected eligible local fictitious REF-A');
 assert.equal(created.data.status,'offered');
 const path=`/api/referrals/${id}/accept`;
 const bodies=await Promise.all([
   makeRequest('POST',path,{demoOnly:true}),
   makeRequest('POST',path,{demoOnly:true})
 ]);
 assert.equal(bodies.filter(r=>r.status===200).length,1,
   'A synthetic offer MUST NOT be accepted twice');
 assert.equal(bodies.filter(r=>r.status===400||r.status===409).length,1,
   'Concurrent losing transition must safely fail');
 const lookup=async()=>{
  const x=await makeRequest('GET','/api/referrals');
  assert.equal(x.status,200);assert.equal(x.data.demoOnly,true);
  const row=x.data.referrals.find(r=>r.id===id);
  assert.ok(row && row.demoOnly===true);
  return row;
 };
 const accepted=await lookup();
 assert.equal(accepted.status,'accepted');
 assert.deepEqual(accepted.timeline.map(e=>e.status),['offered','accepted']);
 // Subsequent changes still require explicit fictional state transitions.
 for(const [verb,expect] of [['arrive','arrived'],['complete','completed']]){
  const res=await makeRequest('POST',`/api/referrals/${id}/${verb}`,{demoOnly:true});
  assert.equal(res.status,200, `Expected successful fictional ${verb} transition`);
  assert.equal(res.data.status,expect);
 }
 const done=await lookup();
 assert.equal(done.status,'completed');
 assert.deepEqual(done.timeline.map(e=>e.status),
   ['offered','accepted','arrived','completed']);
 assert.equal(new Set(done.timeline.map(e=>e.status)).size,4);
 const summary=await makeRequest('GET','/api/demo/summary');
 assert.equal(summary.status,200);
 assert.equal(summary.data.referrals.total,before.data.referrals.total+1);
 assert.equal(summary.data.referrals.byStatus.completed,
  before.data.referrals.byStatus.completed+1);
 console.log('PASS: real local D1 resisted concurrent synthetic acceptance; one accepted event, four final audit events.');
} catch(error) {
 console.error('FAIL: Local fictional concurrency validation:',error?.message||'Unknown error');
 process.exitCode=1;
}
