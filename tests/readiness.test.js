import test from 'node:test';
import assert from 'node:assert/strict';
import {checkFictionalReadiness,READINESS_QUERY,REQUIRED_DEMO_TABLES}
 from '../src/readiness.js';
const safe=db=>({APP_MODE:'synthetic_demo',LIVE_CLINICAL_ENABLED:'false',DB:db});
function dbWithNames(names) {
 return {prepare(sql){
  assert.equal(sql,READINESS_QUERY);
  assert.doesNotMatch(sql,/\b(?:select\s+\*|patient|phone|email|address)\b/i);
  return {all:async()=>({results:names.map(name=>({name}))})};
 }};
}
test('complete fictional D1 schema is necessary for readiness',async()=>{
 const result=await checkFictionalReadiness(safe(dbWithNames([...REQUIRED_DEMO_TABLES])));
 assert.deepEqual(result,{ready:true,schemaReady:true});
 assert.ok(Object.isFrozen(result));
});
test('staging with bound but unmigrated or partially migrated D1 fails closed',async()=>{
 for(const names of [[],['facilities'],REQUIRED_DEMO_TABLES.slice(0,3)]){
  const status=await checkFictionalReadiness(safe(dbWithNames(names)));
  assert.deepEqual(status,{ready:false,schemaReady:false});
 }
});
test('unsafe clinical configurations never call D1',async()=>{
 const DB={prepare(){throw Error('MUST NOT ACCESS')}};
 for(const env of [
  {},{DB},{...safe(DB),APP_MODE:'production'},
  {...safe(DB),LIVE_CLINICAL_ENABLED:'true'}
 ]){
  assert.deepEqual(await checkFictionalReadiness(env),{ready:false,schemaReady:false});
 }
});
test('D1 query failures, malformed results and bind-only objects are non-ready',async()=>{
 const dbs=[
   {},
   {prepare:()=>({})},
   {prepare:()=>({all:async()=>({results:null})})},
   {prepare:()=>({all:async()=>{throw Error('private db/account detail')}})},
   {prepare:()=>{throw Error('backend unavailable')}}
 ];
 for(const db of dbs)
   assert.deepEqual(await checkFictionalReadiness(safe(db)),{ready:false,schemaReady:false});
});
test('unknown/duplicate fictional tables or unexpected order is not trusted',async()=>{
 for(const names of [
  ['capacity_reports','facilities','referral_events','real_patients'],
  ['capacity_reports','facilities','facilities','referrals'],
  [...REQUIRED_DEMO_TABLES].reverse()
 ]){
  assert.deepEqual(await checkFictionalReadiness(safe(dbWithNames(names))),
   {ready:false,schemaReady:false});
 }
});
