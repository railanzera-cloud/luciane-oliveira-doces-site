"""Actual local GoTrue -> signed JWT -> PostgREST -> PostgreSQL; synthetic data only."""
import concurrent.futures, datetime as dt, hashlib, hmac, json, os, pathlib, time, base64, uuid
import psycopg, requests
root=pathlib.Path(__file__).resolve().parents[2]
out=root/'activation-results';out.mkdir(exist_ok=True)
DSN='postgresql://postgres:synthetic_ci_only@127.0.0.1:5432/postgres'
db=psycopg.connect(DSN,autocommit=True)
results=[]
def record(name,passed,**details):
 results.append({'name':name,'passed':bool(passed),**details});print(('PASS ' if passed else 'FAIL ')+name)
 (out/'results.json').write_text(json.dumps(results,indent=2,default=str))
 assert passed,name

def jwt(claims):
 enc=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
 unsigned=enc(b'{"alg":"HS256","typ":"JWT"}')+'.'+enc(json.dumps(claims).encode())
 return unsigned+'.'+enc(hmac.new(os.environ['LOD_QA_JWT_SECRET'].encode(),unsigned.encode(),hashlib.sha256).digest())

def rpc(name,args={},token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 return requests.post('http://127.0.0.1:3000/rpc/'+name,json=args,headers=headers,timeout=12)

def signup(name,metadata={}):
 r=requests.post('http://127.0.0.1:9999/signup',json={'email':name+'@example.com','password':'Synthetic-Qa-Only!'+uuid.uuid4().hex,'data':metadata},timeout=15)
 if not r.ok:raise RuntimeError('Auth signup failed: '+r.text)
 return r.json()

staff=signup('lod-qa-staff');outsider=signup('lod-qa-outsider',{'crm_staff_access':True,'role':'service_role'})
token=staff['access_token'];sub=staff['user']['id'];other=outsider['access_token']
record('actual GoTrue JWT accepted by Auth',requests.get('http://127.0.0.1:9999/user',headers={'Authorization':'Bearer '+token},timeout=10).status_code==200)
db.execute('INSERT INTO crm_staff_access(user_id) VALUES(%s)',(sub,))
service=jwt({'role':'service_role','exp':int(time.time())+3600})
record('staff RPC via PostgREST',rpc('crm_list_opportunities',token=token).status_code==200)
record('anonymous RPC denied',rpc('crm_list_opportunities').status_code in [401,403,404])
record('authenticated outsider and forged user_metadata denied',rpc('crm_list_opportunities',token=other).status_code==403)
record('expired JWT denied',rpc('crm_list_opportunities',token=jwt({'role':'authenticated','sub':sub,'exp':int(time.time())-60})).status_code==401)
record('bad JWT signature denied',rpc('crm_list_opportunities',token=token[:-3]+'bad').status_code==401)
for role_token,label in [(None,'anonymous'),(token,'staff')]:
 r=requests.get('http://127.0.0.1:3000/crm_customers?select=id',headers={'Authorization':'Bearer '+role_token} if role_token else {},timeout=10)
 record('direct private table denied: '+label,r.status_code in [401,403,404])

counter=0
def eligible():
 global counter
 counter+=1;phone='55919999'+str(counter).zfill(5)
 customer=db.execute("INSERT INTO crm_customers(phone_e164,display_name,consent_status,consent_evidence,consent_at) VALUES(%s,'FIXTURE ONLY','granted','SYNTHETIC TEST EVIDENCE',now()) RETURNING id",(phone,)).fetchone()[0]
 conv=db.execute("INSERT INTO crm_conversations(customer_id,status,interest_label,interest_basis,last_inbound_at,last_outbound_at) VALUES(%s,'waiting_customer','Prestígio','staff_confirmed',now()-interval '2 hours',now()-interval '1 hour') RETURNING id",(customer,)).fetchone()[0]
 follow=db.execute("INSERT INTO crm_follow_ups(conversation_id,due_at) VALUES(%s,now()-interval '15 minutes') RETURNING id",(conv,)).fetchone()[0]
 db.execute("INSERT INTO crm_tintim_message_events(fingerprint,phone_e164,conversation_id,direction,time_basis,occurred_at) VALUES(%s,%s,%s,'inbound','provider_timestamp',now()-interval '2 hours')",(uuid.uuid4().hex+uuid.uuid4().hex,phone,conv))
 return {'customer':customer,'conv':conv,'follow':follow,'phone':phone}

def send(f):return rpc('crm_assisted_record_send',{'p_follow_up_id':str(f['follow']),'p_expected_phone':f['phone'],'p_expected_interest':'Prestígio'},token)
def review(f):return rpc('crm_assisted_followup_review',{'p_follow_up_id':str(f['follow'])},token)
def action(f,kind,**extra):return rpc('crm_record_action',{'p_conversation_id':str(f['conv']),'p_action':kind,**extra},token)

# Full path uses actual RPCs from an Auth login. Advance only synthetic clocks,
# preserving the 45-minute difference; never rewrite production/provider evidence.
phone='5591988880000'
r=rpc('crm_open_opportunity',{'p_name':'FIXTURE FULL FLOW','p_phone':phone},token);record('identify interested contact',r.ok)
conv=r.json();cust=db.execute('SELECT customer_id FROM crm_conversations WHERE id=%s',(conv,)).fetchone()[0]
f={'customer':cust,'conv':conv,'phone':phone}
record('confirm product independently',rpc('crm_confirm_interest',{'p_conversation_id':conv,'p_interest':'Prestígio'},token).ok)
record('reject short consent evidence',action(f,'consent_granted',p_evidence='sim').status_code==400)
evidence='FIXTURE ONLY — explicit authorization to one follow-up, reviewed by QA staff'
record('register synthetic consent through staff RPC',action(f,'consent_granted',p_evidence=evidence).ok)
stored=db.execute('SELECT consent_status,consent_evidence,consent_at,commercial_opt_out FROM crm_customers WHERE id=%s',(cust,)).fetchone()
record('consent evidence, date and opt-out state retained',stored[0]=='granted' and stored[1]==evidence and stored[2] is not None and stored[3] is False)
for direction,seconds in [('inbound',120),('business_outbound',60)]:
 stamp=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(seconds=seconds)).isoformat()
 r=rpc('crm_record_tintim_message_v2',{'p_fingerprint':uuid.uuid4().hex+uuid.uuid4().hex,'p_phone':phone,'p_direction':direction,'p_occurred_at':stamp,'p_account_key':'2c956a42-229f-4d21-ade6-4442f8c048ed','p_time_basis':'provider_timestamp'},service)
 record('ingest synthetic verified '+direction,r.ok and r.json()['accepted'])
follow=db.execute("SELECT id FROM crm_follow_ups WHERE conversation_id=%s AND status='pending'",(conv,)).fetchone()[0];f['follow']=follow
record('45 minute interval retained',db.execute('SELECT extract(epoch FROM(f.due_at-c.last_outbound_at)) FROM crm_follow_ups f JOIN crm_conversations c ON c.id=f.conversation_id WHERE f.id=%s',(follow,)).fetchone()[0]==2700)
record('not eligible before 45 minutes','not_due' in review(f).json()['reasons'])
db.execute("UPDATE crm_conversations SET last_inbound_at=last_inbound_at-interval '46 minutes',last_outbound_at=last_outbound_at-interval '46 minutes' WHERE id=%s",(conv,))
db.execute("UPDATE crm_tintim_message_events SET occurred_at=occurred_at-interval '46 minutes' WHERE conversation_id=%s",(conv,))
db.execute("UPDATE crm_follow_ups SET due_at=due_at-interval '46 minutes' WHERE id=%s",(follow,))
r=review(f);record('eligible after synthetic 45 minute clock advance',r.ok and r.json()['eligible'])
record('server reviewed correct recipient and saved product',r.json()['phone_e164']==phone and r.json()['interest_label']=='Prestígio')
record('opening/review does not mark sent',db.execute('SELECT status FROM crm_follow_ups WHERE id=%s',(follow,)).fetchone()[0]=='pending')
record('manual send recorded over PostgREST',send(f).status_code==204)
record('manual retry rejected',send(f).status_code==403)
record('one manual send event only',db.execute("SELECT count(*) FROM crm_events WHERE conversation_id=%s AND event_type='sent_manually'",(conv,)).fetchone()[0]==1)

# Explicit opt-out must never be reversed by consent registration.
fopt=eligible();record('opt-out recorded',action(fopt,'opt_out').ok)
record('opt-out blocks consent grant',action(fopt,'consent_granted',p_evidence=evidence).status_code==403)
record('opt-out blocks assisted send',send(fopt).status_code==403)

# Two real HTTP transactions for the same pending follow-up.
fdup=eligible()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 statuses=list(pool.map(lambda _:send(fdup).status_code,range(2)))
record('concurrent duplicate submit: one success only',sorted(statuses)==[204,403],statuses=statuses)

# Deterministic probe of the old lock order: existing action holds conversation,
# new assisted endpoint holds customer and waits. Captures a REAL deadlock, if any.
def lock_probe(canonical=False):
 f=eligible();a=psycopg.connect(DSN);a.execute("SET deadlock_timeout='150ms'");a.execute("SET statement_timeout='5s'")
 a.execute("SELECT set_config('request.jwt.claims',%s,true)",(json.dumps({'sub':sub,'role':'authenticated'}),))
 a.execute('SELECT 1 FROM '+('crm_customers' if canonical else 'crm_conversations')+' WHERE id=%s FOR UPDATE',(f['customer'] if canonical else f['conv'],))
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
  future=pool.submit(send,f)
  for _ in range(60):
   if db.execute("SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%%crm_assisted_record_send%%'").fetchone()[0]:break
   time.sleep(.025)
  code=None
  try:a.execute("SELECT crm_record_action(%s,'replied')",(f['conv'],));a.commit()
  except psycopg.Error as e:code=e.sqlstate;a.rollback()
  r=future.result();a.close()
 return {'sqlstate':code,'http':r.status_code,'http_code':r.json().get('code') if r.content else None,'state':db.execute('SELECT status FROM crm_follow_ups WHERE id=%s',(f['follow'],)).fetchone()[0]}
probe=lock_probe();deadlock=probe['sqlstate']=='40P01' or probe['http_code']=='40P01'
(out/'baseline-findings.json').write_text(json.dumps({'original_guard_lock_probe':probe,'deadlock_reproduced':deadlock,'consent_audit_actor_column_present':db.execute("SELECT count(*) FROM information_schema.columns WHERE table_name='crm_events' AND column_name IN ('actor_id','actor_user_id')").fetchone()[0]>0},indent=2))
print('BASELINE ORIGINAL GUARD lock probe:',json.dumps(probe))

# Supplemental corrective migration, if prepared, is applied only to THIS fixture DB.
patches=sorted((root/'supabase/migrations').glob('*crm_assisted_activation_hardening.sql'))
if patches:
 db.execute(patches[-1].read_text());db.execute("NOTIFY pgrst, 'reload schema'");time.sleep(.5)
 probe2=lock_probe(canonical=True)
 record('corrected lock order: reply commits and blocked sender revalidates',probe2['sqlstate'] is None and probe2['http']==403 and probe2['state']=='canceled',probe=probe2)
 f=eligible()
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(lambda _:send(f).status_code,range(2)))
 record('corrected migration duplicate transactions',sorted(statuses)==[204,403],statuses=statuses)
 # Record two DIFFERENT fixture evidences and opt-out; every version must survive.
 audit=eligible();ev1='FIXTURE CONSENT A — explicit one-off follow-up authorization';ev2='FIXTURE CONSENT B — reviewed again by same synthetic attendant'
 record('audited consent A',action(audit,'consent_granted',p_evidence=ev1).ok)
 record('audited consent B',action(audit,'consent_granted',p_evidence=ev2).ok)
 record('audited opt-out',action(audit,'opt_out').ok)
 rows=db.execute('SELECT actor_user_id,new_evidence,new_opt_out FROM crm_consent_audit WHERE customer_id=%s ORDER BY recorded_at,id',(audit['customer'],)).fetchall()
 record('immutable consent evidence and actor retained',len(rows)==3 and str(rows[0][0])==sub and rows[0][1]==ev1 and rows[1][1]==ev2 and rows[2][2])
 record('staff cannot rewrite consent audit',requests.patch('http://127.0.0.1:3000/crm_consent_audit',json={'new_evidence':'rewrite'},headers={'Authorization':'Bearer '+token},timeout=10).status_code in [401,403,404])
 # Roll back only the two prepared migrations, keeping synthetic operational rows.
 for name in ['rollback-hardening.sql','rollback-guard.sql']:
  db.execute((root/'tests/activation'/name).read_text())
 db.execute("NOTIFY pgrst, 'reload schema'");time.sleep(.5)
 record('rollback restores original action function',db.execute("SELECT to_regprocedure('public.crm_record_action(uuid,text,text,integer,text)') IS NOT NULL AND to_regprocedure('public.crm_record_action_core(uuid,text,text,integer,text)') IS NULL").fetchone()[0])
 record('rollback preserves consent audit evidence',db.execute('SELECT count(*) FROM crm_consent_audit WHERE customer_id=%s',(audit['customer'],)).fetchone()[0]==3)
 record('rollback preserves operational records',db.execute('SELECT count(*) FROM crm_follow_ups').fetchone()[0]>0)
 record('rollback makes new RPC fail closed',rpc('crm_assisted_followup_review',{'p_follow_up_id':str(f['follow'])},token).status_code in [400,403,404])
else:
 print('No hardening migration provided. Baseline findings must be resolved before activation.')
(out/'summary.json').write_text(json.dumps({'tests':len(results),'passed':sum(x['passed'] for x in results),'baseline_deadlock':deadlock,'hardening_tested':bool(patches),'services':{'postgres':db.execute('SELECT version()').fetchone()[0],'auth':requests.get('http://127.0.0.1:9999/health',timeout=10).json()}},indent=2,default=str))
