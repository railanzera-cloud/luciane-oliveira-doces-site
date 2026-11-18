import fs from 'node:fs';
import { recoveryCatalog } from '../supabase/functions/_shared/recovery-interest.mjs';
import { CATALOG_VERSION, POPCORN_SIZES } from '../supabase/functions/_shared/commerce-catalog.mjs';
const catalog=recoveryCatalog(),candidates=[];
for(const {sizes,aliases,...p} of catalog){candidates.push(p);if(sizes)for(const s of Object.values(sizes))candidates.push({...p,item_key:s.itemKey,variant_id:s.id});}
const source=fs.readFileSync('supabase/functions/_shared/recovery-interest.mjs','utf8');
const literals=[...new Set([...source.matchAll(/'([a-z][a-z0-9_]*)'/g)].map(m=>m[1]))];
const array=a=>JSON.stringify([...new Set(a.filter(v=>v!=null))]);
const sqlJson=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const allowed={categories:[...new Set(catalog.map(p=>p.category))],
 variant_ids:[...catalog.map(p=>p.variant_id),'p','m','g',...Object.keys(POPCORN_SIZES)],
 option_ids:catalog.map(p=>p.option_id),
 availability_keys:[...catalog.map(p=>p.item_key),...catalog.flatMap(p=>Object.values(p.sizes??{}).map(s=>s.itemKey)),...Object.values(POPCORN_SIZES).map(s=>s.itemKey),'category_cones','category_fatias','category_natal','category_pipocas']};
let guard=`\n -- Generated closed vocabulary: no free text or arbitrary nested fields.\n IF NOT (p_semantic ?& ARRAY['version','catalog_version','status','intent','categories','candidates','variant_ids','option_ids','availability_keys','reason'])\n OR p_semantic->'catalog_version' IS DISTINCT FROM ${sqlJson(CATALOG_VERSION)}\n OR NOT (${sqlJson(literals)} @> jsonb_build_array(p_semantic->'reason'))\n THEN RAISE EXCEPTION 'semantic_vocabulary_invalid'; END IF;\n`;
for(const [key,values] of Object.entries(allowed))guard+=` IF jsonb_typeof(p_semantic->'${key}') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'${key}')>32 OR NOT ('${array(values).replaceAll("'","''")}'::jsonb @> (p_semantic->'${key}')) THEN RAISE EXCEPTION 'semantic_array_invalid'; END IF;\n`;
guard+=` IF jsonb_typeof(p_semantic->'candidates') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'candidates')>32 THEN RAISE EXCEPTION 'semantic_candidates_invalid'; END IF;\n FOR candidate IN SELECT value FROM jsonb_array_elements(p_semantic->'candidates') LOOP\n IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(${sqlJson(candidates)}) a WHERE a.value=candidate) THEN RAISE EXCEPTION 'semantic_candidate_invalid'; END IF;\n END LOOP;\n`;
const path='supabase/prepared/recovery-private-observations.sql';let sql=fs.readFileSync(path,'utf8').replace(/DECLARE inserted integer;(?: candidate jsonb;)*/,'DECLARE inserted integer; candidate jsonb;');
sql=sql.replace(/\n -- BEGIN GENERATED GUARD[\s\S]*? -- END GENERATED GUARD\n/,'\n');
sql=sql.replace(' INSERT INTO crm_recovery_private.observations','\n -- BEGIN GENERATED GUARD'+guard+' -- END GENERATED GUARD\n INSERT INTO crm_recovery_private.observations');
fs.writeFileSync(path,sql);
