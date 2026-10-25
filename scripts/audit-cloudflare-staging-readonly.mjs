/**
 * NcheNne live staging *metadata* audit; Cloudflare GET requests ONLY.
 *
 * Reconciles the previously uncertain D1 database name/UUID with the actual
 * staging Worker and remote resource. Does not access SQL rows or patient data,
 * create resources, change Access, run migrations or deploy code.
 *
 * Prerequisite: a separate, least-privilege Cloudflare read-only token granting
 * Workers Scripts Read and D1 Read on the correct Cloudflare account.
 */
import {readFileSync} from 'node:fs';
import {validateStagingConfig} from '../src/staging-config-audit.js';
import {fetchCloudflareReadOnly} from '../src/cloudflare-readonly-audit.js';

try {
 const local=validateStagingConfig(readFileSync(
   new URL('../wrangler.staging.jsonc',import.meta.url),'utf8'));
 const accountId=process.env.CLOUDFLARE_ACCOUNT_ID;
 const token=process.env.CLOUDFLARE_API_TOKEN;
 const verified=await fetchCloudflareReadOnly({
   accountId,token,expectedDbId:local.d1Id
 });
 // Do not print account ID, private token, raw Cloudflare JSON, secrets,
 // or any actual database rows; these booleans are enough to clear only
 // the D1-identity blocker, not Access/release authorization.
 console.log('PASS: remote Cloudflare Worker staging D1 identity verified');
 console.log(JSON.stringify(verified,null,2));
 console.log('PENDING: audit owner-only Worker-level Access and deployment source SHA; no deployment authorized.');
} catch(err){
 console.error('FAIL: remote staging D1 identity gate:',err?.message||'Unknown error');
 process.exitCode=1;
}
