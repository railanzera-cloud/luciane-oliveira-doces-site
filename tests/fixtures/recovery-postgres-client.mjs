import assert from 'node:assert/strict';
// Parameterized SELECT/RPC adapter exercising real SQL in PGlite, no financial writes.
export function clientFor(db){
 const calls=[],errors=[];const name=n=>{assert.match(n,/^[a-z_][a-z0-9_]*$/);return '"'+n+'"';};
 return {calls,errors,async rpc(fn,args={}){
  calls.push(fn);try{const entries=Object.entries(args),sqlArgs=entries.map(([k],i)=>name(k)+'=> $'+(i+1)).join(',');
   const table=['crm_recovery_read_order_references','crm_recovery_read_observations'].includes(fn);
   const q=table?'select * from public.'+name(fn)+'('+sqlArgs+')':'select public.'+name(fn)+'('+sqlArgs+') value';
   const r=await db.query(q,entries.map(([,v])=>v));return {data:JSON.parse(JSON.stringify(table?r.rows:r.rows[0].value)),error:null};
  }catch(e){errors.push({fn,message:e.message});return {data:null,error:{code:e.code??'query_failed'}};}
 },from(table){
  let columns=[],conditions=[],values=[],offset=0,limit=200,key='id';
  const add=(k,op,v)=>{values.push(v);conditions.push(name(k)+op+'$'+values.length);return q;};
  const q={select(c){columns=c.split(',').map(name);return q;},eq(k,v){return add(k,'=',v);},
   in(k,v){values.push(v);conditions.push(name(k)+'=any($'+values.length+')');return q;},
   gte(k,v){return add(k,'>=',v);},lte(k,v){return add(k,'<=',v);},
   order(k){key=k;return q;},range(a,b){offset=a;limit=b-a+1;return q;},
   then(resolve,reject){const where=conditions.length?' where '+conditions.join(' and '):'';
    return (async()=>{try{const total=await db.query('select count(*)::int n from public.'+name(table)+where,values);
     const rows=await db.query('select '+columns.join(',')+' from public.'+name(table)+where+' order by '+name(key)+' limit '+limit+' offset '+offset,values);
     // Native PostgREST serializes timestamps as strings.
     return {data:JSON.parse(JSON.stringify(rows.rows)),count:total.rows[0].n,error:null};
    }catch(e){errors.push({table,message:e.message});return {data:null,count:null,error:{code:e.code??'query_failed'}};}})().then(resolve,reject);
   }};return q;
 }};
}

