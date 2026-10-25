/**
 * Offline-only review of the checked-in Cloudflare staging config.
 * Validates isolation. Cannot inspect deployed Cloudflare Access policy,
 * billing, Worker version, production routes, or actual remote D1 identity.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function ensure(ok,detail){if(!ok)throw Error(detail);}
function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
export function validateStagingConfig(source){
 ensure(typeof source==='string','Missing staging configuration');
 const json=source.replace(/^\s*\/\/[^\n]*\n/,'');
 let c;
 try{c=JSON.parse(json);}catch{throw Error('Invalid staging JSONC');}
 ensure(object(c),'Invalid staging configuration');
 ensure(c.name==='nchenne-staging','Refusing any non-staging Worker name');
 ensure(c.main==='worker/index.js','Unexpected Worker entrypoint');
 ensure(c.workers_dev===true && c.preview_urls===false,
  'Staging URL/preview setting diverged; re-audit Cloudflare Access');
 ensure(c.route===undefined&&c.routes===undefined&&
  c.custom_domain===undefined&&c.triggers===undefined,
  'Staging must not configure production custom domains or routes');
 ensure(object(c.assets)&&c.assets.directory==='./public'&&
  c.assets.binding==='ASSETS'&&
  Array.isArray(c.assets.run_worker_first)&&
  c.assets.run_worker_first.length===1&&c.assets.run_worker_first[0]==='/api/*',
  'Static assets or API precedence not as reviewed');
 ensure(object(c.vars)&&c.vars.APP_MODE==='synthetic_demo'&&
  c.vars.LIVE_CLINICAL_ENABLED==='false'&&
  c.vars.OPENROUTER_ENABLED==='false'&&c.vars.OPENROUTER_MODEL==='',
  'Staging must be fictional-only, with AI disabled');
 ensure(Array.isArray(c.d1_databases)&&c.d1_databases.length===1,
  'Expected one isolated fictional D1 binding');
 const db=c.d1_databases[0];
 ensure(object(db)&&db.binding==='DB'&&db.database_name==='nchenne_demo'&&
  typeof db.database_id==='string'&&UUID.test(db.database_id)&&
  db.migrations_dir==='migrations','Unreviewed D1 target');
 // Secret *names* belong in Cloudflare's encrypted secret store, never JSONC.
 ensure(!/(?:DEMO_API_TOKEN|OPENROUTER_API_KEY|CF_ACCESS_CLIENT_SECRET|CF_ACCESS_CLIENT_ID|nchenne\.mabrigkorie\.org)/i.test(source),
   'Staging config may contain credentials or a production-domain reference');
 return Object.freeze({
  worker:c.name,mode:c.vars.APP_MODE,liveClinicalEnabled:false,
  aiEnabled:false,workersDev:true,previewUrls:false,
  d1Binding:db.binding,d1Name:db.database_name,d1Id:db.database_id,
  accessPolicyVerified:false,remoteDatabaseVerified:false,
  deployedCommitVerified:false
 });
}
