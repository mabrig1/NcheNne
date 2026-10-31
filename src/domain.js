// Synthetic-only referral state machine. Not for patient or clinical use.
export const NEEDS = Object.freeze({
  skilled:["skilled"], theatre:["skilled","theatre"],
  blood:["skilled","blood"], comprehensive:["skilled","theatre","blood"]
});
const TRANSITIONS = {
  offered:["accepted","declined","escalated","expired"],
  accepted:["arrived","escalated"],
  escalated:["accepted","declined","expired"],
  arrived:["completed"], declined:[], expired:[], completed:[]
};
export const TTL_MS=45*60*1000;
export const OFFER_WINDOW_MS=10*60*1000; // Illustrative fiction only; NOT clinical timeout guidance.
export const iso=(millis=Date.now())=>new Date(millis).toISOString();
export function reportIsFresh(c,now=Date.now()) {
 if(!c || c.reportedBy!=="demo_facility_staff") return false;
 const ts=Date.parse(c.updatedAt),age=now-ts;
 return Number.isFinite(age)&&age>=0&&age<=TTL_MS;
}
export function eligible(f,need,now=Date.now()){
 return !!(f&&f.demoOnly===true&&f.type==="referral"&&f.active===true&&
  Object.hasOwn(NEEDS,need)&&reportIsFresh(f.capacity,now)&&
  Number.isInteger(f.capacity.beds)&&f.capacity.beds>0&&
  NEEDS[need].every(k=>f.capacity[k]===true));
}
export function createOffer(f,need,id,now=Date.now()){
 if(!eligible(f,need,now)) throw new Error("No eligible fresh fictional facility");
 if(!/^SIM-[A-Z0-9-]{6,25}$/.test(id)) throw new Error("Invalid synthetic ID");
 return {id,code:"D"+id.replaceAll("-","").slice(-8),facilityId:f.id,
  need,status:"offered",demoOnly:true,createdAt:iso(now),updatedAt:iso(now),
  timeline:[{status:"offered",at:iso(now),actor:"demo_coordinator",
    detail:"Fictional offer sent; no reservation or acceptance."}]};
}
export function transition(r,next,actor,now=Date.now()){
 if(!r?.demoOnly||!TRANSITIONS[r.status]?.includes(next)) throw new Error("Invalid synthetic transition");
 const expected=["accepted","arrived","completed"].includes(next)?"demo_facility_staff":"demo_coordinator";
 if(actor!==expected) throw new Error("Wrong demonstration actor");
 if(now<Date.parse(r.updatedAt)) throw new Error("Out-of-order event");
 // A timed-out fictional offer must never be accepted merely because an
 // earlier simulated status was escalated. Real clinical timing is NOT modeled.
 if(next==="accepted"){
   const created=Date.parse(r.createdAt),age=now-created;
   if(!Number.isFinite(age)||age<0||age>=OFFER_WINDOW_MS)
     throw new Error("Fictional offer expired; start a separate synthetic offer");
 }
 return {...r,status:next,updatedAt:iso(now),
  timeline:[...r.timeline,{status:next,at:iso(now),actor,
   detail:"Simulated "+next+" event. No real person, facility or service involved."}]};
}
export function validateOffer(o){
 if(!o||Array.isArray(o)||typeof o!=="object"||
    Object.keys(o).sort().join()!==["demoOnly","facilityId","id","need"].sort().join()||
    o.demoOnly!==true||typeof o.facilityId!=="string"||
    !/^SIM-[A-Z0-9-]{6,25}$/.test(o.id)||!Object.hasOwn(NEEDS,o.need))
   throw new Error("Invalid or identifying referral payload");
 return o;
}
