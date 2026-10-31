/**
 * Pure, read-only audit of one EXISTING fictional staging Worker.
 *
 * Cloudflare returns script settings, a D1 record, and workers.dev subdomain
 * settings via GET endpoints. These checks must not be described as an audit of
 * Access policies, production routes, billed usage, or deployment provenance.
 *
 * Never serialize raw Worker settings: they can contain secrets and account data.
 */
const EXPECTED_BINDINGS=Object.freeze({
  APP_MODE:'synthetic_demo',LIVE_CLINICAL_ENABLED:'false',
  OPENROUTER_ENABLED:'false',OPENROUTER_MODEL:''
});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ALLOWED_BINDING_TYPES=Object.freeze({
 DB:'d1',ASSETS:'assets',
 APP_MODE:'plain_text',LIVE_CLINICAL_ENABLED:'plain_text',
 OPENROUTER_ENABLED:'plain_text',OPENROUTER_MODEL:'plain_text',
 // Optional server-side secrets are names only; never inspect their values.
 DEMO_API_TOKEN:'secret_text',OPENROUTER_API_KEY:'secret_text'
});
const DB_NAME='nchenne_demo';
const WORKER_NAME='nchenne-staging';
function ensure(ok,message){ if(!ok)throw new Error(message); }
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function plainText(binding){
 return binding?.type==='plain_text'&&typeof binding.text==='string'?binding.text:undefined;
}
export function auditCloudflareStagingMetadata(workerSettings,database,subdomain,expectedDbId){
 ensure(object(workerSettings)&&Array.isArray(workerSettings.bindings),
   'Worker settings/bindings unavailable (do not deploy)');
 ensure(object(database)&&UUID.test(expectedDbId),
   'Expected isolated D1 identifier not configured');
 ensure(database.uuid===expectedDbId && database.name===DB_NAME,
   'Remote D1 name/UUID does not match the checked-in fictional database');
 const bindings=workerSettings.bindings;
 // Do not approve an unknown resource, secret, duplicate name, extra live
 // feature flag, or unexpected binding type in this isolated demo Worker.
 const seen=new Set();
 for(const binding of bindings){
   ensure(object(binding)&&typeof binding.name==='string'&&
     Object.hasOwn(ALLOWED_BINDING_TYPES,binding.name)&&
     ALLOWED_BINDING_TYPES[binding.name]===binding.type&&
     !seen.has(binding.name),
     'Unexpected or duplicated staging binding; do not deploy');
   seen.add(binding.name);
 }
 const dbBindings=bindings.filter(b=>b?.type==='d1');
 ensure(dbBindings.length===1 && dbBindings[0].name==='DB'&&
   (dbBindings[0].database_id??dbBindings[0].id)===expectedDbId,
   'Existing Worker D1 binding is not the expected isolated fictional D1');
 const assets=bindings.filter(b=>b?.type==='assets');
 ensure(assets.length===1&&assets[0].name==='ASSETS',
   'Fictional Worker static assets binding missing or unexpected');
 for(const [name,wanted] of Object.entries(EXPECTED_BINDINGS)){
   const values=bindings.filter(b=>b?.name===name);
   ensure(values.length===1&&plainText(values[0])===wanted,
     'Staging safe-mode variable mismatch: '+name);
 }
 ensure(object(subdomain)&&subdomain.enabled===true&&
   subdomain.previews_enabled===false,
   'Staging workers.dev must remain on and preview URLs must remain disabled');
 // Protected sign-in page only proves *some* access enforcement. The exact
 // Worker-wide allowlist and Access policy must be independently validated.
 return Object.freeze({
   worker:WORKER_NAME,
   databaseNameMatched:true,
   databaseIdMatched:true,
   workerBindingMatched:true,
   syntheticModeVerified:true,
   clinicalDisabled:true,
   openRouterDisabled:true,
   assetsBindingMatched:true,
   workersDevEnabled:true,
   previewUrlsDisabled:true,
   workerLevelAccessVerified:false,
   deployVersionProvenanceVerified:false,
   productionRoutesVerified:false,
   remoteWriteTestPerformed:false
 });
}
export function cloudflareReadPaths(accountId,expectedDbId){
 ensure(/^[a-f0-9]{32}$/i.test(accountId),'Invalid Cloudflare account ID format');
 ensure(UUID.test(expectedDbId),'Invalid fictional staging D1 UUID');
 // All paths are a fixed whitelist under the account. The production
 // Worker name cannot be supplied through an argument.
 const prefix='/client/v4/accounts/'+accountId;
 return Object.freeze({
   settings:prefix+'/workers/scripts/'+WORKER_NAME+'/settings',
   database:prefix+'/d1/database/'+expectedDbId,
   subdomain:prefix+'/workers/scripts/'+WORKER_NAME+'/subdomain'
 });
}
export async function fetchCloudflareReadOnly({
 accountId,token,expectedDbId,fetchImpl=globalThis.fetch
}={}){
 ensure(typeof fetchImpl==='function','Fetch unavailable');
 ensure(typeof token==='string'&&token.length>=16,
   'A private, read-only Cloudflare API token is required in the shell environment');
 const paths=cloudflareReadPaths(accountId,expectedDbId);
 const results={};
 for(const [key,path] of Object.entries(paths)){
   const response=await fetchImpl('https://api.cloudflare.com'+path,{
     method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
     redirect:'error',cache:'no-store',signal:AbortSignal.timeout(9000)
   });
   ensure(response.status===200,
     'Cloudflare '+key+' read failed (HTTP '+response.status+'). Check read-only permissions.');
   ensure((response.headers.get('content-type')||'').toLowerCase().includes('json'),
     'Cloudflare '+key+' response was not JSON');
   const raw=await response.text();
   ensure(raw.length<=512*1024,'Cloudflare response too large');
   let envelope;
   try{envelope=JSON.parse(raw);}
   catch{throw Error('Cloudflare returned invalid JSON');}
   ensure(envelope?.success===true&&object(envelope.result),
     'Cloudflare '+key+' returned an unsuccessful response');
   results[key]=envelope.result;
 }
 return auditCloudflareStagingMetadata(
   results.settings,results.database,results.subdomain,expectedDbId);
}
