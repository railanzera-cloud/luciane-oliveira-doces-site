// Minimal server-only PostgREST adapter: SELECT and the three private RPCs only.
// Reuses native fetch like the existing webhook; no additional runtime SDK.
const tables=new Set(['crm_customers','crm_conversations','crm_whatsapp_message_events',
  'crm_tintim_message_events','tintim_order_links','orders','menu_availability',
  'store_settings','crm_follow_ups','tintim_conversations','crm_automation_settings']);
const rpcs=new Set(['crm_recovery_store_observation','crm_recovery_read_observations','crm_recovery_purge_expired','crm_recovery_permission_evidence','public_crocante_inventory']);
const dueRpcs=new Set(['crm_recovery_claim_due','crm_recovery_finish_due','crm_recovery_read_due','crm_recovery_consume_scheduler_nonce']);
const atom=value=>{const s=String(value);if(!/^[A-Za-z0-9_.:+-]+$/.test(s))throw Error('invalid_filter');return s;};
/** @param {string} url @param {string} key @param {{fetchImpl?:typeof fetch,signal?:AbortSignal,allowDueRpc?:boolean}} options */
export function createRecoveryServerClient(url,key,{fetchImpl=fetch,signal,allowDueRpc=false}={}) {
  const origin=new URL(url);
  if(origin.protocol!=='https:' || origin.username || origin.password || origin.search || origin.hash || !key)
    throw Error('server_configuration_invalid');
  const request=async(path,params,body)=>{
    try{
      const target=new URL('/rest/v1/'+path,origin);target.search=params.toString();
      const r=await fetchImpl(target.href,{method:body===undefined?'GET':'POST',signal,redirect:'error',
        headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'count=exact'},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(!r.ok)return {data:null,error:{code:'source_http_failed'}};
      const data=await r.json();
      const total=r.headers.get('content-range')?.split('/').at(-1);
      return {data,count:total && /^\d+$/.test(total)?Number(total):null,error:null};
    }catch{return {data:null,error:{code:'source_request_failed'}};}
  };
  return {
    from(table){
      if(!tables.has(table))throw Error('table_not_allowed');
      const params=new URLSearchParams();
      const q={select(columns){if(!/^[a-z_][a-z0-9_]*(?:,[a-z_][a-z0-9_]*)*$/.test(columns))throw Error('columns_invalid');params.set('select',columns);return q;},
        eq(k,v){params.append(atom(k),'eq.'+atom(v));return q;},
        in(k,values){params.append(atom(k),'in.('+values.map(atom).join(',')+')');return q;},
        gte(k,v){params.append(atom(k),'gte.'+atom(v));return q;},
        lte(k,v){params.append(atom(k),'lte.'+atom(v));return q;},
        order(k,{ascending=true}={}){params.set('order',atom(k)+(ascending?'.asc':'.desc'));return q;},
        range(a,b){if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<a)throw Error('range_invalid');params.set('offset',String(a));params.set('limit',String(b-a+1));return q;},
        limit(n){return q.range(0,n-1);},
        then(resolve,reject){return request(table,params).then(resolve,reject);}};
      return q;
    },
    rpc(name,args={}){if(!rpcs.has(name) && !(allowDueRpc && dueRpcs.has(name)))throw Error('rpc_not_allowed');return request('rpc/'+name,new URLSearchParams(),args);},
  };
}
