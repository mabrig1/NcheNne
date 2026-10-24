/**
 * Strict, read-only projection of FICTIONAL administrative review cues.
 * No medical guidance, no real emergencies, no personal data.
 */
const CUE_KINDS=new Set([
  "capacity_stale","capacity_unavailable",
  "offer_unacknowledged","arrival_unconfirmed","escalation_needs_review"
]);
const REF=/^REF-[A-C]$/;
const SIM=/^SIM-[A-Z0-9-]{6,25}$/;
const CUE_KEYS=["kind","id","facilityId","minutesSinceUpdate","nextAction"].sort().join();
const MAIN_KEYS=["demoOnly","mode","clinicalUse","liveOperations","generatedAt",
  "operationalCueOnly","window","cues","disclaimer"].sort().join();
const WINDOW_KEYS=["maximumReferrals","returnedCues","truncated"].sort().join();
const exact=(obj,keys)=>obj&&typeof obj==="object"&&!Array.isArray(obj)&&
  Object.keys(obj).sort().join()===keys;
export function parseDemoWatchlist(input){
  if(!exact(input,MAIN_KEYS)||input.demoOnly!==true||
     input.mode!=="fictional_only"||input.clinicalUse!==false||
     input.liveOperations!==false||input.operationalCueOnly!==true||
     typeof input.generatedAt!=="string"||
     !Number.isFinite(Date.parse(input.generatedAt))||
     !exact(input.window,WINDOW_KEYS)||
     input.window.maximumReferrals!==100||
     typeof input.window.truncated!=="boolean"||
     !Array.isArray(input.cues)||input.cues.length>50||
     input.window.returnedCues!==input.cues.length||
     typeof input.disclaimer!=="string")
    throw Error("Invalid fictional-only administrative watchlist");
  const output=[];
  for(const c of input.cues){
    if(!exact(c,CUE_KEYS)||!CUE_KINDS.has(c.kind)||
       !REF.test(c.facilityId)||!Number.isSafeInteger(c.minutesSinceUpdate)||
       c.minutesSinceUpdate<0||c.minutesSinceUpdate>525600||
       c.nextAction!=="Human review of fictional scenario only"||
       (!["capacity_stale","capacity_unavailable"].includes(c.kind) &&
         !SIM.test(c.id))||
       (["capacity_stale","capacity_unavailable"].includes(c.kind) &&
         c.id!==c.facilityId))
      throw Error("Invalid fictional-only administrative cue");
    output.push(Object.freeze({kind:c.kind,id:c.id,
       facilityId:c.facilityId,minutesSinceUpdate:c.minutesSinceUpdate}));
  }
  return Object.freeze({cues:Object.freeze(output),truncated:input.window.truncated});
}
const LABELS=Object.freeze({
  capacity_stale:"Fictional facility report expired",
  capacity_unavailable:"Fictional receiving capacity unavailable",
  offer_unacknowledged:"Fictional offer awaiting acknowledgment",
  arrival_unconfirmed:"Fictional accepted offer awaiting arrival update",
  escalation_needs_review:"Fictional escalation awaiting coordinator review"
});
export function renderDemoWatchlist(target,result){
  if(!target||typeof target.replaceChildren!=="function"||
     !result||!Array.isArray(result.cues))throw Error("Invalid fictional viewer");
  const doc=target.ownerDocument;
  const wrapper=doc.createElement("div");
  const label=doc.createElement("p");
  label.textContent="Administrative simulation cues only — not medical alerts or emergency deadlines.";
  wrapper.append(label);
  if(result.cues.length===0){
    const note=doc.createElement("p");
    note.textContent="No fictional review cues in the current bounded sample.";
    wrapper.append(note);
  }else{
    const list=doc.createElement("ol");
    list.setAttribute("aria-label","Fictional administrative review queue");
    list.style.cssText="padding-left:20px;margin:8px 0;line-height:1.7;max-height:220px;overflow:auto";
    for(const cue of result.cues.slice(0,25)){
      const row=doc.createElement("li");
      row.textContent=LABELS[cue.kind]+" · "+cue.facilityId+
        (cue.id!==cue.facilityId?" · "+cue.id:"");
      list.append(row);
    }
    wrapper.append(list);
  }
  if(result.truncated||result.cues.length>25){
    const note=doc.createElement("small");
    note.textContent="A limited fictional sample is displayed; this is not a live monitoring service.";
    wrapper.append(note);
  }
  target.replaceChildren(wrapper);
}
