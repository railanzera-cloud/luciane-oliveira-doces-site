import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const auth=read('supabase/functions/_shared/recovery-scheduler-auth.mjs');
const worker=read('cloudflare/recovery-scheduler/worker.mjs').replace(/^import \{signSchedulerRequest,boundedText\} from '[^']+';\r?\n/,'');
const result='// GENERATED: node scripts/build-recovery-scheduler-dashboard.mjs\n// No secrets. Default OFF; production fetch is always 404.\n'+(auth+'\n'+worker).replace(/^export (const|function|async function) /gm,'$1 ');
const target=new URL('../cloudflare/recovery-scheduler/dashboard-worker.mjs',import.meta.url);
if(process.argv.includes('--check')){
 if(readFileSync(target,'utf8')!==result)throw Error('dashboard_bundle_stale');
}else writeFileSync(target,result);
