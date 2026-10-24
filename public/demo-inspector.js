/**
 * A deliberately read-only, synthetic-only projection of a D1 referral ledger.
 * Do not use this module with actual patients, providers or other clinical data.
 * The browser is never given a write credential, and no returned timeline
 * detail, name, free text or unknown field is displayed.
 */
const ID=/^SIM-[A-Z0-9-]{6,25}$/;
const FACILITY=/^(PHC|REF)-[A-C]$/;
const NEEDS=new Set(["skilled","theatre","blood","comprehensive"]);
const STATUSES=new Set(["offered","accepted","declined","arrived","completed","escalated","expired"]);
const ROW_KEYS=new Set(["id","code","facilityId","need","status","demoOnly","createdAt","updatedAt","timeline"]);
const EVENT_KEYS=new Set(["status","at","actor","detail"]);
const ACTORS=new Set(["demo_coordinator","demo_facility_staff"]);
const isObject=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
function exactKeys(value,allowed){
  return Object.keys(value).length===allowed.size&&
    Object.keys(value).every(k=>allowed.has(k));
}
function checkedDate(value){
  return typeof value==="string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}
export function parseDemoLedger(input){
  if(!isObject(input)||input.demoOnly!==true||!Array.isArray(input.referrals)||
     Object.keys(input).sort().join()!=="demoOnly,referrals"||
     input.referrals.length>100) throw Error("Non-fictional or invalid ledger response");
  const entries=[];
  for(const row of input.referrals){
    if(!isObject(row)||!exactKeys(row,ROW_KEYS)||row.demoOnly!==true||
       !ID.test(row.id)||!FACILITY.test(row.facilityId)||
       !/^D[A-Z0-9]{1,8}$/.test(row.code)||!NEEDS.has(row.need)||
       !STATUSES.has(row.status)||!checkedDate(row.createdAt)||
       !checkedDate(row.updatedAt)||!Array.isArray(row.timeline)||
       row.timeline.length<1||row.timeline.length>30) throw Error("Unexpected synthetic referral");
    for(const event of row.timeline){
      if(!isObject(event)||!exactKeys(event,EVENT_KEYS)||
         !STATUSES.has(event.status)||!ACTORS.has(event.actor)||
         !checkedDate(event.at)||typeof event.detail!=="string"||
         event.detail.length>160) throw Error("Unexpected synthetic event");
    }
    // Projection deliberately discards all timeline details and dates.
    entries.push(Object.freeze({
      id:row.id,status:row.status,facilityId:row.facilityId,
      need:row.need,eventCount:row.timeline.length
    }));
  }
  return Object.freeze(entries);
}
export function renderDemoLedger(target,entries){
  if(!target || typeof target.replaceChildren!=="function"||
     !Array.isArray(entries)) throw Error("Invalid read-only viewer");
  const doc=target.ownerDocument;
  const list=doc.createElement("ol");
  list.setAttribute("aria-label","Fictional Cloudflare D1 referral summaries");
  list.style.cssText="padding-left:20px;margin:8px 0;line-height:1.8;max-height:260px;overflow:auto";
  for(const item of entries.slice(0,20)){
    const li=doc.createElement("li");
    li.textContent=item.id+" · "+item.status+" · "+item.facilityId+
      " · "+item.need+" · "+item.eventCount+" synthetic events";
    list.append(li);
  }
  if(entries.length>20){
    const summary=doc.createElement("li");
    summary.textContent="Showing 20 of "+entries.length+" fictional referrals";
    list.append(summary);
  }
  if(entries.length===0){
    const note=doc.createElement("p");
    note.textContent="No fictional referrals yet in the connected demo database.";
    target.replaceChildren(note);
  } else target.replaceChildren(list);
}
