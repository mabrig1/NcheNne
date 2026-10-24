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
 assert.match(html,/facilities\.demoOnly!==true/);
});
test("browser does not embed an API owner token or automatically write to D1",()=>{
 assert.doesNotMatch(html,/DEMO_API_TOKEN/);
 assert.doesNotMatch(html,/Authorization:\s*["']Bearer/i);
 assert.match(html,/method:'GET'/);
 assert.match(html,/credentials:'omit'/);
});
test("PWA cache explicitly excludes API calls and real clinical state",()=>{
 assert.match(sw,/url\.pathname\.startsWith\("\/api\/"\)/);
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
