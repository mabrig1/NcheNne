import test from "node:test";
import assert from "node:assert/strict";
import {parseDemoLedger,renderDemoLedger} from "../public/demo-inspector.js";
import {readFileSync} from "node:fs";

const row={
 id:"SIM-ABC12345",code:"DABC12345",facilityId:"REF-A",need:"comprehensive",
 status:"accepted",demoOnly:true,createdAt:"2026-10-24T08:00:00.000Z",
 updatedAt:"2026-10-24T08:01:00.000Z",
 timeline:[
  {status:"offered",at:"2026-10-24T08:00:00.000Z",actor:"demo_coordinator",
   detail:"Fictional offer; no booking"},
  {status:"accepted",at:"2026-10-24T08:01:00.000Z",actor:"demo_facility_staff",
   detail:"Staff role-play accepted fictional offer"}
 ]
};
const ledger=(r=row)=>({demoOnly:true,referrals:[r]});
test("accepts validated fictional-only D1 ledger with minimal projection",()=>{
 const result=parseDemoLedger(ledger());
 assert.deepEqual(result,[{id:"SIM-ABC12345",facilityId:"REF-A",
   need:"comprehensive",status:"accepted",eventCount:2}]);
 assert.equal("timeline" in result[0],false);
 assert.equal("code" in result[0],false);
});
test("rejects patient fields and unknown top-level keys",()=>{
 for(const bad of [
  ledger({...row,phone:"+2348000000000"}),
  ledger({...row,name:"Real patient"}),
  {...ledger(),adminToken:"x"},
  {demoOnly:false,referrals:[row]},
  {demoOnly:true,referrals:"oops"}
 ]) assert.throws(()=>parseDemoLedger(bad));
});
test("rejects unsafe IDs, unsupported statuses, fake facility and event data",()=>{
 for(const bad of [
  {...row,id:"Mr Surname"}, {...row,facilityId:"REAL-HOSPITAL"},
  {...row,need:"diagnose"}, {...row,status:"dispatched"},
  {...row,timeline:[{...row.timeline[0],name:"Patient"}]},
  {...row,timeline:[{...row.timeline[0],status:"transferred"}]},
  {...row,timeline:[]}, {...row,createdAt:"yesterday"}
 ])assert.throws(()=>parseDemoLedger(ledger(bad)));
});
test("caps remote results and renders only textContent DOM nodes",()=>{
 assert.throws(()=>parseDemoLedger({demoOnly:true,referrals:Array(101).fill(row)}));
 const nodes=[];
 const doc={
  createElement(tag){
   const e={tag,children:[],style:{},textContent:"",setAttribute(){},
    append(child){this.children.push(child);}};
   nodes.push(e);
   return e;
  }
 };
 const target={ownerDocument:doc,replaceChildren(...items){this.children=items;}};
 renderDemoLedger(target,parseDemoLedger(ledger()));
 assert.equal(target.children[0].tag,"ol");
 assert.match(target.children[0].children[0].textContent,/SIM-ABC12345/);
 assert.equal(nodes.some(n=>"innerHTML" in n),false);
});
test("offline service worker caches inspection code but never any API data",()=>{
 const sw=readFileSync(new URL("../public/sw.js",import.meta.url),"utf8");
 assert.match(sw,/\/demo-inspector\.js/);
 assert.match(sw,/pathname\.startsWith\("\/api\/"\)/);
});
