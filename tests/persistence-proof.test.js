import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLocalPersistence} from '../src/persistence-proof.js';

const t=['2026-10-25T05:00:00.000Z','2026-10-25T05:00:01.000Z',
         '2026-10-25T05:00:02.000Z','2026-10-25T05:00:03.000Z'];
function fixtures(){
 const statuses=['offered','accepted','arrived','completed'];
 const timeline=statuses.map((status,i)=>({
   status,at:t[i],actor:i===0?'demo_coordinator':'demo_facility_staff',
   detail:i===0?'Fictional offer sent; no reservation or acceptance.':
     `Simulated ${status} event. No real person, facility or service involved.`
 }));
 const row={id:'SIM-ABC12345678',code:'D12345678',facilityId:'REF-A',
    need:'comprehensive',status:'completed',demoOnly:true,
    createdAt:t[0],updatedAt:t[3],timeline};
 const referrals={demoOnly:true,referrals:[row]};
 const summary={demoOnly:true,mode:'fictional_only',
   clinicalUse:false,liveOperations:false,
   referrals:{total:1,byStatus:{completed:1}}};
 return {referrals,summary,row,timeline};
}
test('four ordered fictional D1 audit events validate after Worker restart',()=>{
 const f=fixtures();
 assert.deepEqual(verifyLocalPersistence(f.referrals,f.summary),
  {verified:true,completed:1,eventCount:4,mode:'fictional_only'});
});
test('rejects incomplete audit events after a supposed completion',()=>{
 const f=fixtures();f.row.timeline.pop();
 assert.throws(()=>verifyLocalPersistence(f.referrals,f.summary),/four-event/);
});
test('rejects out-of-order timestamps and mismatched simulated actors',()=>{
 const f=fixtures(); f.timeline[2].at=t[0];
 assert.throws(()=>verifyLocalPersistence(f.referrals,f.summary),/audit ordering/);
 const g=fixtures(); g.timeline[1].actor='demo_coordinator';
 assert.throws(()=>verifyLocalPersistence(g.referrals,g.summary),/audit ordering/);
});
test('rejects real-looking facility IDs and unknown identifying fields',()=>{
 const f=fixtures();f.row.facilityId='REAL-HOSPITAL';
 assert.throws(()=>verifyLocalPersistence(f.referrals,f.summary),/Untrusted/);
 const g=fixtures();g.row.phone='not allowed';
 assert.throws(()=>verifyLocalPersistence(g.referrals,g.summary),/Untrusted/);
});
test('rejects clinical/live flags and missing completed summary',()=>{
 const f=fixtures();f.summary.liveOperations=true;
 assert.throws(()=>verifyLocalPersistence(f.referrals,f.summary),/No validated/);
 const g=fixtures();g.summary.referrals.byStatus.completed=0;
 assert.throws(()=>verifyLocalPersistence(g.referrals,g.summary),/No validated/);
});
test('requires a fabricated completed REF-A scenario, not just any referral',()=>{
 const f=fixtures(); f.row.status='offered';
 assert.throws(()=>verifyLocalPersistence(f.referrals,f.summary),/four-event/);
});
