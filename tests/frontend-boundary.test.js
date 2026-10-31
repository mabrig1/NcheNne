import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const sw=readFileSync(new URL("../public/sw.js",import.meta.url),"utf8");
const config=readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8");

test("browser distinguishes local role-play from Worker/D1 state",()=>{
 assert.match(html,/id="worker-status"/);
 assert.match(html,/separate, browser-local simulation/);
 assert.match(html,/data\.clinicalUse !== false/);
 assert.match(html,/data\.liveOperations !== false/);
 assert.match(html,/data\.ready !== true/);
 assert.match(html,/data\.schemaReady !== true/);
 assert.match(html,/facilities\.demoOnly!==true/);
});
test("browser does not embed an API owner token or automatically write to D1",()=>{
 assert.doesNotMatch(html,/DEMO_API_TOKEN/);
 assert.doesNotMatch(html,/Authorization:\s*["']Bearer/i);
 assert.match(html,/method:'GET'/);
 // Same-origin Access sessions are not app API secrets. This protects
 // read-only endpoints while keeping owner-write tokens out of browser code.
 assert.match(html,/credentials:'same-origin'/);
 assert.doesNotMatch(html,/credentials:'omit'/);
});
test("PWA cache explicitly excludes API calls and real clinical state",()=>{
 assert.match(sw,/url\.pathname\.startsWith\(path\+"api\/"\)/);
 assert.match(config,/"LIVE_CLINICAL_ENABLED": "false"/);
 assert.match(config,/REPLACE_WITH_D1_DATABASE_ID/);
});

test("fictional D1 summary is read-only and rejects unsafe network responses",()=>{
 assert.match(html,/id="cloud-demo-summary"/);
 assert.match(html,/fetch\('\/api\/demo\/summary'/);
 assert.match(html,/summary\.clinicalUse!==false/);
 assert.match(html,/summary\.liveOperations!==false/);
 assert.match(html,/summary\.demoOnly!==true/);
 assert.match(html,/Number\.isSafeInteger/);
 assert.match(html,/cloudSummary\.textContent=/);
 assert.doesNotMatch(html,/cloudSummary\.innerHTML=/);
});

test("fictional reviewer contains no owner token and never makes API writes",()=>{
 assert.match(html,/id="review-demo-button"/);
 assert.match(html,/id="review-demo-results"/);
 assert.match(html,/parseDemoWatchlist\(await response\.json\(\)\)/);
 assert.match(html,/renderDemoWatchlist\(reviewResult,safe\)/);
 assert.match(html,/fetch\('\/api\/demo\/watchlist'/);
 assert.match(html,/reviewResult\.textContent=/);
 assert.doesNotMatch(html,/reviewResult\.innerHTML=/);
 assert.match(sw,/demo-watchlist\.js/);
});

test("offline/browser role-play rejects escalation bypass and supports manual/local expiry",()=>{
 const standalone=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 for(const page of [html,standalone]){
  assert.match(page,/escalated: \['accepted', 'declined', 'expired'\]/);
  assert.doesNotMatch(page,/escalated:\[\['Confirm arrival/);
  assert.match(page,/OFFER_TTL_MS = 10 \* 60 \* 1000/);
  assert.match(page,/function expireLocalOffers/);
  assert.match(page,/\['Expire','expired'\]/);
  assert.match(page,/data-view="ecosystem"/);
  assert.doesNotMatch(page,/<section id="page-content" aria-live=/);
  assert.match(page,/const STATE_VERSION=2/);
  assert.match(page,/serviceWorker\.register\('\.\/sw\.js'\)/);
 }
 assert.match(html,/href="\.\/manifest\.webmanifest"/);
 assert.match(sw,/const STATIC=\["\.\/",/);
});
