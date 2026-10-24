/**
 * OpenRouter integration for NcheNne's FICTIONAL coordination exercises ONLY.
 * Never transmit patient data, facility details, real referrals, free text,
 * browser prompts, or secrets to third-party models.
 *
 * Disabled unless manually enabled. Model must be an explicit :free model.
 * Never route to an automatic/paid fallback, and require ZDR.
 */
const URL="https://openrouter.ai/api/v1/chat/completions";
const SCENARIOS=Object.freeze({
  capacity_stale:"A fictional facility capacity report has expired.",
  capacity_unavailable:"A fictional facility has zero simulated capacity.",
  offer_unacknowledged:"A fictional referral offer lacks a simulated acknowledgment.",
  arrival_unconfirmed:"A fictional accepted offer lacks a simulated arrival update.",
  escalation_needs_review:"A fictional escalation awaits administrative review."
});
const MODEL=/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+:free$/;
const SYSTEM="You explain FICTIONAL software administrative handoffs. Output ONE short plain-English sentence (under 180 characters) about a human checking or updating a made-up coordination status. Never offer medical advice, triage, clinical urgency, treatment, provider availability, dispatch, real-world instructions, or a claim that any patient is safe. No markdown, names, links or personal data.";
const NOT_ALLOWED=/\b(?:diagnos\w*|prescri\w*|medicine\w*|medication\w*|dosage|symptoms?|patient\w*|bleeding|pregnan\w*|ambulanc\w*|emergenc\w*|treat(?:ment)?|clinician\w*|real[- ]world|safe to wait)\b/i;

export function openRouterStatus(env={}){
  const enabled=env.OPENROUTER_ENABLED==="true";
  const model=typeof env.OPENROUTER_MODEL==="string"&&MODEL.test(env.OPENROUTER_MODEL)
    ?env.OPENROUTER_MODEL:null;
  const hasKey=typeof env.OPENROUTER_API_KEY==="string"&&env.OPENROUTER_API_KEY.length>=24;
  return Object.freeze({demoOnly:true,mode:"fictional_only",
    enabled,ready:enabled&&!!model&&hasKey,freeModelOnly:true,
    requiresHumanReview:true,
    // Do not return the model slug, credentials or any billing information.
    reason:!enabled?"disabled":!model?"explicit_free_model_required":!hasKey?"secret_not_configured":"ready"});
}
function checkScenario(value){
  if(!value||Array.isArray(value)||typeof value!=="object"||
     Object.keys(value).sort().join()!=="demoOnly,scenario"||
     value.demoOnly!==true||typeof value.scenario!=="string"||
     !Object.hasOwn(SCENARIOS,value.scenario))
     throw Error("Only approved fictional administrative scenarios are supported");
  return value.scenario;
}
export async function explainFictionalScenario(env,body,fetcher=fetch){
  const scenario=checkScenario(body);
  const status=openRouterStatus(env);
  if(!status.ready) return {statusCode:503,body:{demoOnly:true,error:"OpenRouter demonstration is disabled or incomplete",reason:status.reason}};
  const payload={
    model:env.OPENROUTER_MODEL,
    messages:[{role:"system",content:SYSTEM},
      {role:"user",content:SCENARIOS[scenario]+" Explain only the administrative simulation step."}],
    stream:false,temperature:0,max_tokens:96,
    provider:{zdr:true,data_collection:"deny",allow_fallbacks:false}
  };
  try{
    const response=await fetcher(URL,{
      method:"POST",
      headers:{"Authorization":"Bearer "+env.OPENROUTER_API_KEY,
        "Content-Type":"application/json","X-Title":"NcheNne Fictional Demo"},
      body:JSON.stringify(payload),
      redirect:"error",
      signal:AbortSignal.timeout(8000)
    });
    if(!response.ok) throw Error("OpenRouter unavailable");
    const output=await response.json();
    let text=output?.choices?.[0]?.message?.content;
    if(typeof text!=="string")throw Error("Invalid model response");
    text=text.trim();
    if(text.length<8||text.length>180||/[<>\r\n]/.test(text)||
       /https?:\/\/|www\.|@|\+\d{7,}/i.test(text)||NOT_ALLOWED.test(text))
       throw Error("Unsafe or unexpected model response");
    return {statusCode:200,body:{
      demoOnly:true,clinicalUse:false,liveOperations:false,scenario,
      explanation:text,aiGenerated:true,
      disclaimer:"AI-generated fictional workflow commentary only. Not clinical advice, a real alert, or an indication of actual facility capacity."
    }};
  }catch{
    // A provider response must never be reflected verbatim: it may contain
    // sensitive billing errors, upstream details, or unexpected model output.
    return {statusCode:502,body:{demoOnly:true,error:"Fictional explanation unavailable",clinicalUse:false,liveOperations:false}};
  }
}
