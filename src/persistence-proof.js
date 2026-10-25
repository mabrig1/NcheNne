/** Post-restart persistence proof for the LOCAL D1 fictional demonstration.
 * Does not read real records or send any writes.
 */
const OBJECT = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const SIM_ID = /^SIM-[A-Z0-9-]{6,25}$/;
const CODE = /^D[A-Z0-9]{1,8}$/;
const KEYSET = (v, keys) => OBJECT(v) && Object.keys(v).sort().join() === keys.slice().sort().join();
const REFERRAL_KEYS = ['id','code','facilityId','need','status','demoOnly','createdAt','updatedAt','timeline'];
const EVENT_KEYS = ['status','at','actor','detail'];
const STATUS = ['offered','accepted','arrived','completed'];
const ACTORS = ['demo_coordinator','demo_facility_staff','demo_facility_staff','demo_facility_staff'];
function check(ok, message) { if (!ok) throw new Error(message); }
function validIso(s) {
 return typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) &&
   Number.isFinite(Date.parse(s));
}
export function verifyLocalPersistence(referrals, summary) {
 check(KEYSET(referrals,['demoOnly','referrals']) && referrals.demoOnly === true &&
   Array.isArray(referrals.referrals) && referrals.referrals.length <= 100,
   'Invalid fictional D1 referral list');
 check(OBJECT(summary) && summary.demoOnly === true && summary.mode === 'fictional_only' &&
  summary.clinicalUse === false && summary.liveOperations === false &&
  OBJECT(summary.referrals) && Number.isSafeInteger(summary.referrals.total) &&
  summary.referrals.total >= 1 && OBJECT(summary.referrals.byStatus) &&
  Number.isSafeInteger(summary.referrals.byStatus.completed) &&
  summary.referrals.byStatus.completed >= 1,
  'No validated fictional completed referral persisted');
 check(referrals.referrals.length >= 1, 'No fictional referral found after restart');
 for (const row of referrals.referrals) {
  check(KEYSET(row,REFERRAL_KEYS) && row.demoOnly === true &&
    SIM_ID.test(row.id) && CODE.test(row.code) &&
    /^(PHC|REF)-[A-C]$/.test(row.facilityId) &&
    ['skilled','theatre','blood','comprehensive'].includes(row.need) &&
    ['offered','accepted','arrived','completed','declined','escalated','expired'].includes(row.status) &&
    validIso(row.createdAt) && validIso(row.updatedAt) &&
    Array.isArray(row.timeline) && row.timeline.length <= 30,
    'Untrusted or non-fictional referral persisted');
 }
 const proof = referrals.referrals.find(row=>row.status==='completed' && row.facilityId==='REF-A' &&
  row.timeline.length===4);
 check(Boolean(proof), 'Completed four-event fictional REF-A transaction missing after restart');
 let last = Date.parse(proof.createdAt);
 for (let i=0; i<4; i++) {
  const event = proof.timeline[i];
  check(KEYSET(event,EVENT_KEYS) && event.status === STATUS[i] &&
    event.actor === ACTORS[i] && validIso(event.at) &&
    Date.parse(event.at) >= last && Date.parse(event.at) <= Date.parse(proof.updatedAt) &&
    typeof event.detail === 'string' && event.detail.length <= 160 &&
    (i === 0 ? event.detail === 'Fictional offer sent; no reservation or acceptance.' :
      event.detail === `Simulated ${STATUS[i]} event. No real person, facility or service involved.`),
    'Fictional audit ordering or content invalid after restart');
  last = Date.parse(event.at);
 }
 check(Date.parse(proof.updatedAt)===last, 'Latest fictional update not persisted');
 return Object.freeze({verified:true,completed:summary.referrals.byStatus.completed,
  eventCount:4,mode:'fictional_only'});
}
