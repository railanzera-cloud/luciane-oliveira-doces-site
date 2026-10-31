-- READ ONLY: all body_hash_matches must be true before applying the pinned migrations.
WITH expected(signature,definition_md5) AS (VALUES
('crm_automation_evaluate_pending()','d5174c5200494a885c805ffb94cf07bd'),
('crm_automation_operational_report()','0459bc970dd2a41aa96a6836b53125a4'),
('crm_automation_queue_items()','6eb6a0237709bcbc69a0b3a279548ee9'),
('crm_cancel_customer_followups_on_conversion()','979e984da42d4f47da389630e416033f'),
('crm_confirm_interest(uuid,text)','37cb6b3a974be9cddc15e85ef405c194'),
('crm_delivery_prepare_holds()','aa40e27440b751a2b2732d9cb1f0f7d7'),
('crm_delivery_readiness()','05839000a00a83eba5bcab216c35b7cc'),
('crm_delivery_receipt_summary()','f40d4133fadf5028dc88085eca9d68bf'),
('crm_followup_send_preflight(uuid)','e85a3a88c2f27a76980c3816b1d321ae'),
('crm_hold_tintim_purchase_signals()','a3bf3ed06f18dfd34bd971b73f896793'),
('crm_ingest_tintim_on_change()','117c20bfb1517a5bee105b203e6acbae'),
('crm_list_opportunities()','e0646184c85540faaba55988cd6e2280'),
('crm_list_tintim_candidates(integer)','faf42b83d28e6fe47425d6e9f55ccca2'),
('crm_list_tintim_product_hints()','256dd63dce48bf0bd3e4b6aaf31c78a7'),
('crm_list_tintim_signals()','bebcea85b3831df86c69b7c5258bb918'),
('crm_normalize_br_phone(text)','ad0ea52560e4d5f7c215abe972b1d877'),
('crm_open_opportunity(uuid,text,text)','b311d10c3688a285bfaa2d1d45d27f94'),
('crm_protect_purchase_signal_followup()','c597fc14a3cb36a6b0697a28bb896bff'),
('crm_record_action(uuid,text,text,integer,text)','b9900df5014f7a133543dd3c11e3628c'),
('crm_record_meta_delivery_status(text,text,timestamp with time zone)','f3b460ca4f17baaee72de01c6e1c3037'),
('crm_record_meta_message(text,text,text,timestamp with time zone)','2e0467e54fb35f15f6337a72d6d0e263'),
('crm_record_tintim_message(text,text,text,timestamp with time zone,text)','eb9ee0f20c415f913aea76dff9dc4b6b'),
('crm_record_tintim_message_diagnostic(text,text)','8468ea3f279d34087eb06bfd60eea48f'),
('crm_record_tintim_message_v2(text,text,text,timestamp with time zone,text,text)','508ed6b352cece6ee1f2026f2aab01c8'),
('crm_record_tintim_product_mention(text,text,text)','84a6a6d6363dad58b57dcb5a8727839a'),
('crm_require_staff()','2c8656e657a0f9c5cb653c49b5bab128'),
('crm_sync_recent_tintim(integer,integer)','a3fe5be0ae9ad6b962ed17d416abbe11'),
('crm_tintim_message_diagnostic_summary()','5517b0ae4d30e821d0eb85850b280e2d'),
('crm_tintim_message_diagnostics()','e9d48a79a0d425f6dfe92ddb5bcab59d')
) SELECT signature,definition_md5 AS expected_md5,md5(pg_get_functiondef(to_regprocedure(signature))) AS current_md5,md5(pg_get_functiondef(to_regprocedure(signature)))=definition_md5 AS body_hash_matches FROM expected ORDER BY signature;
SELECT to_regprocedure('public.crm_assisted_followup_review(uuid)') IS NULL AS guard_not_applied,to_regprocedure('public.crm_record_action_core(uuid,text,text,integer,text)') IS NULL AS core_name_available,to_regclass('public.crm_consent_audit') IS NULL AS hardening_not_applied;
SELECT c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') AS anon_select,has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'crm_%' ORDER BY c.relname;
SELECT follow_up_minutes,automatic_sends_enabled FROM public.crm_automation_settings;
