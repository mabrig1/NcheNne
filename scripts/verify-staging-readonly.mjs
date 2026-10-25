/**
 * Five safe GET requests against the one private NcheNne staging hostname.
 * Never disables Cloudflare Access. Never performs POSTs, seed, or migrations.
 * Optional Cloudflare Access service credentials must be scoped by the owner to
 * this staging application only; never paste them into chat or logs.
 */
import {runStagingReadOnly,STAGING_ORIGIN} from '../src/staging-preflight.js';
try {
  const checks=await runStagingReadOnly({
    clientId:process.env.CF_ACCESS_CLIENT_ID,
    clientSecret:process.env.CF_ACCESS_CLIENT_SECRET
  });
  console.log('PASS: NcheNne fictional staging read-only checks at',STAGING_ORIGIN);
  for(const {path,status,...summary} of checks)
    console.log(`${status.toUpperCase()}: ${path} ${JSON.stringify(summary)}`);
  console.log('NOTE: Version string is NOT a deployment commit SHA; verify commit in Cloudflare deployments.');
} catch(e) {
  // Never log response contents or credentials.
  console.error('FAIL: '+(e instanceof Error ? e.message : 'Unknown staging verification error'));
  process.exitCode=1;
}
