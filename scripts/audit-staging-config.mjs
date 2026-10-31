/**
 * Pure local staging-config gate for CI and owner terminals.
 * Produces only a proposed release fingerprint, not evidence of
 * current Cloudflare deployment or Access policy. No network calls.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validateStagingConfig} from '../src/staging-config-audit.js';

try {
 const src=readFileSync(new URL('../wrangler.staging.jsonc',import.meta.url),'utf8');
 const result=validateStagingConfig(src);
 let gitSha='unavailable';
 try{
   gitSha=execFileSync('git',['rev-parse','HEAD'],{
     encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:2000
   }).trim();
 }catch{}
 const configDigest=createHash('sha256').update(src).digest('hex');
 console.log('PASS: isolated fictional staging configuration');
 console.log(JSON.stringify({
   ...result,
   candidateGitCommit:gitSha,
   checkedInConfigSha256:configDigest,
   note:'This checks local repository configuration, NOT deployed Cloudflare D1 identity, Access policy or live Worker provenance.'
 },null,2));
} catch (err) {
 console.error('FAIL: staging configuration is not eligible for review:',err?.message||'Unknown error');
 process.exitCode=1;
}
