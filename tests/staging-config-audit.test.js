import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStagingConfig} from '../src/staging-config-audit.js';
const original=readFileSync(new URL('../wrangler.staging.jsonc',import.meta.url),'utf8');
const config=JSON.parse(original.replace(/^\s*\/\/[^\n]*\n/,''));
const mutate=fn=>{
 const c=structuredClone(config);fn(c);return JSON.stringify(c);
};
test('current candidate is an isolated, fictional-only staging Worker',()=>{
 const result=validateStagingConfig(original);
 assert.equal(result.worker,'nchenne-staging');
 assert.equal(result.d1Name,'nchenne_demo');
 assert.equal(result.liveClinicalEnabled,false);
 assert.equal(result.aiEnabled,false);
 assert.equal(result.accessPolicyVerified,false);
 assert.equal(result.remoteDatabaseVerified,false);
 assert.equal(result.deployedCommitVerified,false);
});
test('refuses production Worker names and routes',()=>{
 for(const source of [
   mutate(c=>{c.name='nchenne';}),
   mutate(c=>{c.route='nchenne.mabrigkorie.org/*';}),
   mutate(c=>{c.routes=['nchenne.mabrigkorie.org/*'];}),
   mutate(c=>{c.custom_domain=true;})
 ])
  assert.throws(()=>validateStagingConfig(source));
});
test('rejects unprotected/preview URLs and dangerous configuration',()=>{
 for(const source of [
  mutate(c=>{c.workers_dev=false;}),
  mutate(c=>{c.preview_urls=true;}),
  mutate(c=>{c.vars.LIVE_CLINICAL_ENABLED='true';}),
  mutate(c=>{c.vars.APP_MODE='clinical';}),
  mutate(c=>{c.vars.OPENROUTER_ENABLED='true';}),
  mutate(c=>{c.assets.run_worker_first=[];})
 ])
  assert.throws(()=>validateStagingConfig(source));
});
test('refuses missing/multiple/unreviewed D1 bindings',()=>{
 for(const source of [
  mutate(c=>{c.d1_databases=[];}),
  mutate(c=>{c.d1_databases.push({...c.d1_databases[0]});}),
  mutate(c=>{c.d1_databases[0].database_id='PLACEHOLDER';}),
  mutate(c=>{c.d1_databases[0].database_name='patients';}),
  mutate(c=>{c.d1_databases[0].binding='CLINICAL_DB';})
 ])
  assert.throws(()=>validateStagingConfig(source));
});
test('never allow accidental literal secrets in checked-in config',()=>{
 const s=mutate(c=>{c.vars.DEMO_API_TOKEN='NEVER_COMMIT';});
 assert.throws(()=>validateStagingConfig(s),/credentials/);
});
test('bad JSON and malformed staging configs fail closed',()=>{
 for(const s of ['{','null','[]','',JSON.stringify({name:'nchenne-staging'})])
  assert.throws(()=>validateStagingConfig(s));
});
