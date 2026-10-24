import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Regression: Cloudflare Access requires a browser's same-origin session cookie.
// No API bearer secret is ever added to browser JavaScript, and all protected
// read-only calls must refuse unexpected redirects to the Access login page.
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const sw=readFileSync(new URL("../public/sw.js",import.meta.url),"utf8");
const stage=readFileSync(new URL("../wrangler.staging.jsonc",import.meta.url),"utf8");

test("all five read-only staging API calls preserve same-origin Access credentials",()=>{
  const fetches=[...html.matchAll(/fetch\('([^']+)',\s*\{([^}]+)\}/g)]
    .filter(match=>match[1].startsWith("/api/"));
  const paths=fetches.map(match=>match[1]).sort();
  assert.deepEqual(paths,[
    "/api/demo/summary","/api/demo/watchlist","/api/facilities",
    "/api/health","/api/referrals"
  ]);
  for(const [,path,options] of fetches){
    assert.match(options,/credentials:'same-origin'/,path);
    assert.match(options,/redirect:'error'/,path);
    assert.match(options,/cache:'no-store'/,path);
    assert.match(options,/method:'GET'/,path);
  }
  assert.doesNotMatch(html,/credentials:'omit'/);
  assert.doesNotMatch(html,/DEMO_API_TOKEN|OPENROUTER_API_KEY|Authorization:\s*['"`]?Bearer/i);
});
test("fictional offline shell still never caches protected API responses",()=>{
  assert.match(sw,/url\.pathname\.startsWith\("\/api\/"\)\)return;/);
  assert.match(sw,/nchenne-synthetic-shell-v05/);
});
test("staging's owner-enabled URL stays on while previews remain off",()=>{
  assert.match(stage,/"name": "nchenne-staging"/);
  assert.match(stage,/"workers_dev": true/);
  assert.match(stage,/"preview_urls": false/);
  assert.match(stage,/"OPENROUTER_ENABLED": "false"/);
  assert.match(stage,/"LIVE_CLINICAL_ENABLED": "false"/);
  assert.doesNotMatch(stage,/\b(routes|custom_domain)\b\s*:/);
});
