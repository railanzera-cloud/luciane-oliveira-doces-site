import json, pathlib, re, hashlib
import psycopg
root=pathlib.Path(__file__).resolve().parents[2]
db=psycopg.connect('postgresql://postgres:synthetic_ci_only@127.0.0.1:5432/postgres',autocommit=True)
for row in json.loads((root/'tests/activation/live-auth-functions.json').read_text()):db.execute(row['definition'])
db.execute('GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role')
# All CRM structures and provider ingestion; no pg_cron job is created locally.
migrations=[
 '20261026203000_crm_followups_assistidos.sql','20261026213000_crm_observabilidade_meta_preparo.sql',
 '20261026221500_crm_tintim_short_names_fix.sql','20261026231500_crm_tintim_purchase_signal_guard.sql',
 '20261026235500_crm_tintim_live_sync.sql','20261027001000_crm_tintim_message_observe.sql',
 '20261027002000_crm_tintim_message_diagnostics.sql','20261027003000_crm_tintim_receipt_time.sql',
 '20261027004000_crm_followup_send_preflight.sql','20261027005000_crm_tintim_product_hints.sql',
 '20261027006000_crm_confirm_interest.sql','20261027007000_crm_automation_observer.sql',
 '20261027193000_crm_delivery_outbox_holds.sql','20261027195000_crm_meta_delivery_status.sql']
for name in migrations:db.execute((root/'supabase/migrations'/name).read_text())
# Compare actual deployed function BODIES, independent of pg_get_functiondef formatting.
comparison=[]
for row in json.loads((root/'tests/activation/live-crm-functions.json').read_text()):
 if row['signature'].startswith('record_tintim_webhook_event_v2'):continue
 local=db.execute('SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure(%s)',(row['signature'],)).fetchone()
 live=re.search(r'AS \$function\$\n?(.*)\$function\$',row['definition'],re.S).group(1)
 normalized=lambda s:re.sub(r'\s+',' ',s).strip()
 comparison.append({'signature':row['signature'],'body_equal':bool(local and normalized(local[0])==normalized(live)), 'deployed_sha256':hashlib.sha256(row['definition'].encode()).hexdigest()})
 # Restore the actual deployed definition, not a guessed source version.
 db.execute(row['definition'])
 # The original Supabase defaults also grant service_role; reproduce exactly.
 db.execute('REVOKE ALL ON FUNCTION '+row['signature']+' FROM PUBLIC,anon,authenticated,service_role')
 for role in ['service_role','authenticated']:
  if role+'=X/' in (row['acl'] or ''):db.execute('GRANT EXECUTE ON FUNCTION '+row['signature']+' TO '+role)
(root/'activation-results').mkdir(exist_ok=True)
(root/'activation-results/function-comparison.json').write_text(json.dumps(comparison,indent=2))
# Equivalent non-sending settings; no production account rows are copied.
db.execute("UPDATE crm_tintim_observation_settings SET apply_to_followups=true,allow_received_time_followups=true,received_time_enabled_at=now()-interval '1 hour'")
db.execute((root/'supabase/migrations/20261031175609_crm_assisted_followup_guard.sql').read_text())
db.execute("NOTIFY pgrst, 'reload schema'")
print('Isolated schema ready; deployed bodies compared:',len(comparison),'equal:',sum(x['body_equal'] for x in comparison))
