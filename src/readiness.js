/**
 * NcheNne fictional Worker readiness check.
 * A D1 binding object alone does not prove migrations exist. This endpoint
 * checks only four expected synthetic schema table names. No patient or
 * actual facility data is accessed, returned or logged.
 */
export const REQUIRED_DEMO_TABLES=Object.freeze([
  'capacity_reports','facilities','referral_events','referrals'
]);
export const READINESS_QUERY=
  "SELECT name FROM sqlite_master WHERE type='table' "+
  "AND name IN ('capacity_reports','facilities','referral_events','referrals') "+
  "ORDER BY name";
export async function checkFictionalReadiness(env={}) {
  if(env?.APP_MODE!=='synthetic_demo'||env?.LIVE_CLINICAL_ENABLED!=='false'){
    return Object.freeze({ready:false,schemaReady:false});
  }
  if(!env?.DB||typeof env.DB.prepare!=='function'){
    return Object.freeze({ready:false,schemaReady:false});
  }
  try {
    const stmt=env.DB.prepare(READINESS_QUERY);
    if(!stmt||typeof stmt.all!=='function')
      return Object.freeze({ready:false,schemaReady:false});
    const result=await stmt.all();
    const names=result?.results?.map(row=>row?.name);
    const ready=Array.isArray(names)&&names.length===REQUIRED_DEMO_TABLES.length&&
      names.every((name,i)=>name===REQUIRED_DEMO_TABLES[i]);
    return Object.freeze({ready,schemaReady:ready});
  } catch {
    // A broken or unmigrated database is unhealthy. Fail closed and never
    // leak internal SQL errors, database identifiers or Cloudflare account info.
    return Object.freeze({ready:false,schemaReady:false});
  }
}
