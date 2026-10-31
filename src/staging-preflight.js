/** Read-only contract checks for the one isolated fictional staging origin. */
export const STAGING_ORIGIN = 'https://nchenne-staging.victoryonline1.workers.dev';
export const READ_PATHS = Object.freeze([
  '/api/health', '/api/demo/ai/status', '/api/demo/summary', '/api/facilities',
  '/api/demo/watchlist', '/api/referrals'
]);
const PRIVATE_KEYS = new Set([
  'patient', 'patientname', 'fullname', 'phone', 'phonenumber', 'email',
  'address', 'dateofbirth', 'dob', 'symptoms', 'pregnancy', 'diagnosis',
  'medicalrecord', 'medication', 'contact', 'latitude', 'longitude'
]);
const SIM_ID = /^SIM-[A-Z0-9-]{6,25}$/;
const DEMO_FACILITY_ID = /^(?:PHC|REF)-[A-C]$/;
const STATES = new Set(['offered','accepted','arrived','completed','declined','escalated','expired']);

function ensure(ok, message) { if (!ok) throw new Error(message); }
function record(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
function scanKeys(data, depth = 0) {
  ensure(depth < 12, 'Unexpectedly nested staging response');
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    ensure(data.length <= 1000, 'Overlong staging response collection');
    for (const v of data) scanKeys(v, depth + 1);
    return;
  }
  for (const [key,value] of Object.entries(data)) {
    ensure(!PRIVATE_KEYS.has(key.toLowerCase().replace(/[_-]/g,'')),
      'Response contains forbidden identifying/clinical fields');
    scanKeys(value, depth + 1);
  }
}
export function validateStagingResponse(path, body) {
  ensure(READ_PATHS.includes(path), 'Unapproved staging verification route');
  ensure(record(body), 'Expected JSON object from staging');
  scanKeys(body);
  if (path === '/api/health') {
    ensure(body.name === 'NcheNne' && body.mode === 'fictional_only', 'Invalid fictional health response');
    ensure(body.clinicalUse === false && body.liveOperations === false, 'Clinical/live flag must remain false');
    ensure(body.ready === true && body.schemaReady === true,
      'Staging has not proven fictional D1 schema readiness; do not promote');
    ensure(typeof body.version === 'string', 'Missing Worker version');
    return {path, status:'passed',version:body.version};
  }
  ensure(body.demoOnly === true, 'Expected explicitly fictional response');
  if (path === '/api/demo/ai/status') {
    const keys=['demoOnly','mode','enabled','ready','freeModelOnly',
      'requiresHumanReview','reason'];
    ensure(Object.keys(body).length===keys.length&&
      Object.keys(body).every(key=>keys.includes(key))&&
      body.mode==='fictional_only'&&body.enabled===false&&
      body.ready===false&&body.freeModelOnly===true&&
      body.requiresHumanReview===true&&body.reason==='disabled',
      'Remote fictional AI must be explicitly disabled without additional fields');
    return {path,status:'passed',enabled:false};
  }
  if (path === '/api/demo/summary') {
    ensure(body.mode === 'fictional_only' && body.clinicalUse === false && body.liveOperations === false,
      'Summary must refuse clinical/live operations');
    ensure(record(body.facilities) && Number.isSafeInteger(body.facilities.total) && body.facilities.total >= 0,
      'Invalid fictional facility count');
    ensure(record(body.referrals) && Number.isSafeInteger(body.referrals.total) && body.referrals.total >= 0,
      'Invalid fictional referral count');
    return {path,status:'passed',facilities:body.facilities.total,referrals:body.referrals.total};
  }
  if (path === '/api/facilities') {
    ensure(Array.isArray(body.facilities) && body.facilities.length <= 100, 'Invalid fictional facility list');
    ensure(body.facilities.every(f => record(f) && f.demoOnly === true && DEMO_FACILITY_ID.test(f.id)),
      'Unapproved facility or non-fictional facility');
    return {path,status:'passed',count:body.facilities.length};
  }
  if (path === '/api/demo/watchlist') {
    ensure(body.mode === 'fictional_only' && body.clinicalUse === false && body.liveOperations === false &&
      body.operationalCueOnly === true && Array.isArray(body.cues) && body.cues.length <= 50,
      'Invalid fictional review queue');
    return {path,status:'passed',count:body.cues.length};
  }
  ensure(Array.isArray(body.referrals) && body.referrals.length <= 100, 'Invalid fictional referral list');
  ensure(body.referrals.every(r => record(r) && r.demoOnly === true && SIM_ID.test(r.id) &&
    DEMO_FACILITY_ID.test(r.facilityId) && STATES.has(r.status)),
    'Unapproved referral or non-fictional referral');
  return {path,status:'passed',count:body.referrals.length};
}

/**
 * This deliberately has NO arbitrary base URL parameter: sending Access tokens
 * to another hostname (particularly production) must not be an option.
 * Only HEADERS used are Accept and optionally Cloudflare Access service tokens.
 */
export async function runStagingReadOnly({fetchImpl=globalThis.fetch,clientId,clientSecret}={}) {
  ensure(typeof fetchImpl === 'function', 'Fetch implementation unavailable');
  ensure(Boolean(clientId) === Boolean(clientSecret),
    'Both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are required together');
  const headers={Accept:'application/json'};
  if (clientId) {
    headers['CF-Access-Client-Id'] = clientId;
    headers['CF-Access-Client-Secret'] = clientSecret;
  }
  const reports=[];
  for(const path of READ_PATHS){
    const response=await fetchImpl(STAGING_ORIGIN+path,{
      method:'GET',headers,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)
    });
    if ([301,302,303,307,308,401,403].includes(response.status))
      throw new Error('Staging Access authentication required or denied. Stop: do not disable Access.');
    ensure(response.status === 200, `Staging ${path} returned HTTP ${response.status}`);
    ensure((response.headers.get('content-type')||'').toLowerCase().includes('application/json'),
      'Staging response was not JSON');
    const claimedSize=Number(response.headers.get('content-length') || 0);
    ensure(Number.isFinite(claimedSize) && claimedSize <= 524288,
      'Staging response too large');
    const raw=await response.text();
    ensure(raw.length <= 524288, 'Staging response too large');
    let body;
    try { body=JSON.parse(raw); }catch{ throw new Error('Staging response has invalid JSON'); }
    reports.push(validateStagingResponse(path,body));
  }
  return reports;
}

/**
 * Explicitly forbid accidental production writes from the existing mutating
 * smoke-demo script. Remote fictional writes need a deliberate opt-in and may
 * still fail if Access does not authorize the caller; never weaken Access.
 */
export function assertSmokeOrigin(input, remoteOptIn) {
  const url = input instanceof URL ? input : new URL(input);
  ensure(!url.username && !url.password && url.pathname === '/' &&
    !url.search && !url.hash, 'Smoke origin must be a bare URL without credentials');
  const local = url.protocol === 'http:' &&
    ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  const staging = url.origin === STAGING_ORIGIN &&
    remoteOptIn === 'WRITE_SYNTHETIC_STAGING_ONLY';
  ensure(local || staging,
    'Refusing mutable smoke against remote origin. Only local or explicitly approved private staging is allowed.');
  return url;
}
