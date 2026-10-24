import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../wrangler.staging.example.jsonc",import.meta.url),"utf8");
const json=JSON.parse(source.replace(/^\/\/[^\n]*\n/,""));
test("staging config cannot silently overwrite production Worker",()=>{
 assert.equal(json.name,"nchenne-staging");
 assert.notEqual(json.name,"nchenne");
 assert.equal(json.workers_dev,false);
 assert.equal(json.preview_urls,false);
 assert.equal(json.route,undefined);
 assert.equal(json.routes,undefined);
 assert.equal(json.APP_MODE,undefined);
 assert.equal(json.vars.APP_MODE,"synthetic_demo");
 assert.equal(json.vars.LIVE_CLINICAL_ENABLED,"false");
 assert.equal(json.d1_databases.length,1);
 assert.match(json.d1_databases[0].database_id,/REPLACE_WITH_NEW_STAGING_D1_DATABASE_UUID/);
 assert.equal(json.d1_databases[0].database_name,"nchenne_staging_demo");
});
test("staging template neither contains credentials nor a live custom domain",()=>{
 assert.doesNotMatch(source,/DEMO_API_TOKEN|nchenne\.mabrigkorie\.org|victoryonline1/);
});
