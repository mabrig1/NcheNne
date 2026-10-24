import test from "node:test";
import assert from "node:assert/strict";
import {parseDemoWatchlist,renderDemoWatchlist} from "../public/demo-watchlist.js";
const BASE={
  demoOnly:true,mode:"fictional_only",clinicalUse:false,liveOperations:false,
  generatedAt:"2026-10-24T08:00:00.000Z",operationalCueOnly:true,
  window:{maximumReferrals:100,returnedCues:2,truncated:false},
  cues:[
    {kind:"capacity_unavailable",id:"REF-C",facilityId:"REF-C",
     minutesSinceUpdate:0,nextAction:"Human review of fictional scenario only"},
    {kind:"offer_unacknowledged",id:"SIM-1234ABCD",facilityId:"REF-A",
     minutesSinceUpdate:10,nextAction:"Human review of fictional scenario only"}
  ],disclaimer:"Only fictitious data"
};
test("strict read-only administrative queue recognizes known fictional codes",()=>{
 const projected=parseDemoWatchlist(BASE);
 assert.deepEqual(projected.cues,[
  {kind:"capacity_unavailable",id:"REF-C",facilityId:"REF-C",minutesSinceUpdate:0},
  {kind:"offer_unacknowledged",id:"SIM-1234ABCD",facilityId:"REF-A",minutesSinceUpdate:10}
 ]);
 assert.equal("nextAction" in projected.cues[0],false);
});
test("rejects clinical, unexpected or personally identifying data",()=>{
 for(const input of [
   {...BASE,clinicalUse:true},{...BASE,liveOperations:true},{...BASE,demoOnly:false},
   {...BASE,patientName:"leak"},
   {...BASE,window:{...BASE.window,other:"leak"}},
   {...BASE,cues:[{...BASE.cues[0],patientPhone:"+2348000000000"}],window:{...BASE.window,returnedCues:1}},
   {...BASE,cues:[{...BASE.cues[1],kind:"clinical_urgent"}],window:{...BASE.window,returnedCues:1}},
   {...BASE,cues:[{...BASE.cues[0],id:"REAL HOSPITAL"}],window:{...BASE.window,returnedCues:1}},
   {...BASE,cues:[{...BASE.cues[1],id:"patient@example.com"}],window:{...BASE.window,returnedCues:1}}
 ])assert.throws(()=>parseDemoWatchlist(input));
});
test("displays only safe known labels and does not render server narrative",()=>{
 const result=parseDemoWatchlist({...BASE,disclaimer:"<script>unsafe</script>"});
 const nodes=[];
 const doc={createElement(tag){
    const el={tag,style:{},children:[],textContent:"",
      append(c){this.children.push(c);},setAttribute(){}};
    nodes.push(el);return el;
 }};
 const target={ownerDocument:doc,replaceChildren(...children){this.children=children;}};
 renderDemoWatchlist(target,result);
 const values=nodes.map(x=>x.textContent).join(" ");
 assert.match(values,/Fictional receiving capacity unavailable/);
 assert.doesNotMatch(values,/script|unsafe/);
 assert.equal(nodes.some(x=>"innerHTML" in x),false);
});
