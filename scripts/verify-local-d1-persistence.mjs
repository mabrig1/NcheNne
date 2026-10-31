/** Local Wrangler D1 persistence proof. Read-only; never use remote or production. */
import assert from 'node:assert/strict';
import {verifyLocalPersistence} from '../src/persistence-proof.js';
import {assertSmokeOrigin} from '../src/staging-preflight.js';
const origin = assertSmokeOrigin(process.env.NCHENNE_BASE_URL || 'http://127.0.0.1:8787');
assert.equal(origin.protocol,'http:', 'Persistence verification must run against local Wrangler');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(origin.hostname));
async function get(path) {
  const r=await fetch(new URL(path,origin),{
    method:'GET',headers:{Accept:'application/json'},
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(9000)
  });
  assert.equal(r.status,200,`Local D1 ${path} unavailable`);
  assert.match(r.headers.get('content-type')||'',/application\/json/i);
  const data=await r.json();
  return data;
}
try {
 const [referrals,summary]=await Promise.all([
   get('/api/referrals'),get('/api/demo/summary')
 ]);
 const proof=verifyLocalPersistence(referrals,summary);
 console.log('PASS: local fictional D1 survived Worker restart; ordered audit events:',
   proof.eventCount, 'completed fictional referrals:',proof.completed);
} catch(e) {
 console.error('FAIL: Local fictional persistence validation failed:',e?.message||'Unknown error');
 process.exitCode=1;
}
