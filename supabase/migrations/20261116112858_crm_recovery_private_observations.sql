-- Authorized private structure only. No scheduler or active ingress changes.
BEGIN;
CREATE SCHEMA crm_recovery_private;
REVOKE ALL ON SCHEMA crm_recovery_private FROM PUBLIC,anon,authenticated;
CREATE TABLE crm_recovery_private.observations (
 conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
 message_id text NOT NULL CHECK (message_id ~ '^wamid\.[A-Za-z0-9=+/_-]+$' AND length(message_id) BETWEEN 9 AND 296),
 occurred_at timestamptz NOT NULL,
 semantic jsonb NOT NULL CHECK (jsonb_typeof(semantic)='object' AND octet_length(semantic::text)<=6000),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 PRIMARY KEY(conversation_id,message_id)
);
ALTER TABLE crm_recovery_private.observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON crm_recovery_private.observations FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.crm_recovery_store_observation(p_conversation_id uuid,p_message_id text,p_occurred_at timestamptz,p_semantic jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inserted integer; candidate jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 IF p_semantic IS NULL OR jsonb_typeof(p_semantic)<>'object'
 OR p_semantic - ARRAY['version','catalog_version','status','intent','categories','candidates','variant_ids','option_ids','availability_keys','reason'] <> '{}'::jsonb
 OR p_semantic->>'version' IS DISTINCT FROM 'shadow-1'
 OR coalesce(p_semantic->>'intent','') NOT IN ('unknown','interest','opt_out','possible_purchase','declined')
 OR coalesce(p_semantic->>'status','') NOT IN ('unconfirmed','resolved','partial','ambiguous')
 OR p_occurred_at IS NULL OR p_occurred_at>now()+interval '1 minute' OR p_occurred_at<now()-interval '7 days'
 THEN RAISE EXCEPTION 'invalid_observation'; END IF;



 -- BEGIN GENERATED GUARD
 -- Generated closed vocabulary: no free text or arbitrary nested fields.
 IF NOT (p_semantic ?& ARRAY['version','catalog_version','status','intent','categories','candidates','variant_ids','option_ids','availability_keys','reason'])
 OR p_semantic->'catalog_version' IS DISTINCT FROM '"2026-11-14.cascaos-folheado-bueno-nutella"'::jsonb
 OR NOT ('["slice","fatia","cone","unidade","christmas","porcao","gourmet","package","drink","unconfirmed","unknown","no_evidence","string","unsupported_text","opt_out","explicit_opt_out","possible_purchase","purchase_statement_not_payment","declined","negative_or_mixed_intent","link_context_unverified","commercial_intent_missing","interest","ambiguous","multiple_categories_or_customization","category_ambiguous","product_not_identified","resolved","partial","explicit_combination","size_or_combination_unresolved","p","m","g","package_or_size_unresolved","explicit_package","variant_incompatible_with_product","explicit_product","multiple_products"]'::jsonb @> jsonb_build_array(p_semantic->'reason'))
 THEN RAISE EXCEPTION 'semantic_vocabulary_invalid'; END IF;
 IF jsonb_typeof(p_semantic->'categories') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'categories')>32 OR NOT ('["slice","cone","christmas","gourmet","package","drink"]'::jsonb @> (p_semantic->'categories')) THEN RAISE EXCEPTION 'semantic_array_invalid'; END IF;
 IF jsonb_typeof(p_semantic->'variant_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'variant_ids')>32 OR NOT ('["fatia","unidade","porcao","220ml","200ml","350ml","p","m","g","500ml","750ml","1l"]'::jsonb @> (p_semantic->'variant_ids')) THEN RAISE EXCEPTION 'semantic_array_invalid'; END IF;
 IF jsonb_typeof(p_semantic->'option_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'option_ids')>32 OR NOT ('["leitinho","choco-nute","ovomaltine","kinder-bueno","choco-cookies-branco","choco-cookies-leite","kinder-bueno-crisp","nutella"]'::jsonb @> (p_semantic->'option_ids')) THEN RAISE EXCEPTION 'semantic_array_invalid'; END IF;
 IF jsonb_typeof(p_semantic->'availability_keys') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'availability_keys')>32 OR NOT ('["slice_chocolate_morango","slice_ninho_morango","slice_prestigio","slice_chocolate_maracuja","slice_chocolatudo","slice_coco_cremoso_morango","slice_chocolate_cenoura","slice_bombom_uva","slice_abacaxi_doce_leite","cone_prestigio","cascao_folheado_geleia_morango_ninho","cone_ferrero_rocher","cascao_kinder_bueno","cascao_ninho_morango","cascao_ninho_nutella_chocotone","chocotone_ninho_nutella","chocotone_ferrero_rocher","chocotone_casadinho","chocotone_morango_brigadeiro_branco_chocolate","popcorn_flavor_leitinho","popcorn_flavor_choco_nute","popcorn_flavor_ovomaltine","popcorn_flavor_kinder_bueno","popcorn_flavor_choco_cookies_branco","popcorn_flavor_choco_cookies_leite","popcorn_flavor_kinder_bueno_crisp","popcorn_flavor_nutella","drink_coca_cola_zero_220","drink_fanta_laranja_220","drink_guarana_antarctica_200","drink_coca_cola_350","trufada_ninho_p","trufada_ninho_m","trufada_ninho_g","trufada_pacoca_p","trufada_pacoca_m","trufada_pacoca_g","trufada_coco_queimado_p","trufada_coco_queimado_m","trufada_coco_queimado_g","popcorn_size_500ml","popcorn_size_750ml","popcorn_size_1l","category_cones","category_fatias","category_natal","category_pipocas"]'::jsonb @> (p_semantic->'availability_keys')) THEN RAISE EXCEPTION 'semantic_array_invalid'; END IF;
 IF jsonb_typeof(p_semantic->'candidates') IS DISTINCT FROM 'array' OR jsonb_array_length(p_semantic->'candidates')>32 THEN RAISE EXCEPTION 'semantic_candidates_invalid'; END IF;
 FOR candidate IN SELECT value FROM jsonb_array_elements(p_semantic->'candidates') LOOP
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements('[{"category":"slice","product_id":"fatia-chocolate-morango","item_key":"slice_chocolate_morango","name":"Chocolate com Morango","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-ninho-morango","item_key":"slice_ninho_morango","name":"Brigadeiro Branco com Morango","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-prestigio","item_key":"slice_prestigio","name":"Prestígio","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-chocolate-maracuja","item_key":"slice_chocolate_maracuja","name":"Chocolate com Maracujá","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-chocolatudo","item_key":"slice_chocolatudo","name":"Chocolatudo","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-coco-cremoso-morango","item_key":"slice_coco_cremoso_morango","name":"Geleia de Morango com Coco Cremoso","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-chocolate-cenoura","item_key":"slice_chocolate_cenoura","name":"Chocolate com Cenoura","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-bombom-uva","item_key":"slice_bombom_uva","name":"Bombom de Uva","variant_id":"fatia","option_id":null},{"category":"slice","product_id":"fatia-abacaxi-doce-leite","item_key":"slice_abacaxi_doce_leite","name":"Abacaxi com Brigadeiro Branco","variant_id":"fatia","option_id":null},{"category":"cone","product_id":"cone-trufado-prestigio","item_key":"cone_prestigio","name":"Prestígio","variant_id":"unidade","option_id":null},{"category":"cone","product_id":"cascao-folheado-geleia-morango-ninho","item_key":"cascao_folheado_geleia_morango_ninho","name":"Folheado com Ninho e Morango","variant_id":"unidade","option_id":null},{"category":"cone","product_id":"cone-trufado-ferrero-rocher","item_key":"cone_ferrero_rocher","name":"Ferrero Rocher","variant_id":"unidade","option_id":null},{"category":"cone","product_id":"cascao-trufado-kinder-bueno","item_key":"cascao_kinder_bueno","name":"Kinder Bueno e Nutella","variant_id":"unidade","option_id":null},{"category":"cone","product_id":"cascao-trufado-ninho-morango","item_key":"cascao_ninho_morango","name":"Ninho com Morango","variant_id":"unidade","option_id":null},{"category":"cone","product_id":"cascao-trufado-ninho-nutella-chocotone","item_key":"cascao_ninho_nutella_chocotone","name":"Ninho Nutella e Chocottone","variant_id":"unidade","option_id":null},{"category":"christmas","product_id":"chocotone-ninho-nutella","item_key":"chocotone_ninho_nutella","name":"Ninho com Nutella","variant_id":"porcao","option_id":null},{"category":"christmas","product_id":"chocotone-ferrero-rocher","item_key":"chocotone_ferrero_rocher","name":"Ferrero Rocher","variant_id":"porcao","option_id":null},{"category":"christmas","product_id":"chocotone-casadinho","item_key":"chocotone_casadinho","name":"Casadinho","variant_id":"porcao","option_id":null},{"category":"christmas","product_id":"chocotone-morango-brigadeiro-branco-chocolate","item_key":"chocotone_morango_brigadeiro_branco_chocolate","name":"Morango com Brigadeiro Branco e Chocolate","variant_id":"porcao","option_id":null},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_leitinho","name":"Leitinho","variant_id":null,"option_id":"leitinho"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_choco_nute","name":"Choco Nute","variant_id":null,"option_id":"choco-nute"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_ovomaltine","name":"Ovomaltine","variant_id":null,"option_id":"ovomaltine"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_kinder_bueno","name":"Kinder Bueno","variant_id":null,"option_id":"kinder-bueno"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_choco_cookies_branco","name":"Choco Cookies Branco","variant_id":null,"option_id":"choco-cookies-branco"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_choco_cookies_leite","name":"Choco Cookies ao Leite","variant_id":null,"option_id":"choco-cookies-leite"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_kinder_bueno_crisp","name":"Crispy Bueno","variant_id":null,"option_id":"kinder-bueno-crisp"},{"category":"gourmet","product_id":"pipoca-gourmet","item_key":"popcorn_flavor_nutella","name":"Nutella","variant_id":null,"option_id":"nutella"},{"category":"package","product_id":"crocante-ninho","item_key":null,"name":"Ninho","variant_id":null,"option_id":null},{"category":"package","product_id":"crocante-ninho","item_key":"trufada_ninho_p","name":"Ninho","variant_id":"p","option_id":null},{"category":"package","product_id":"crocante-ninho","item_key":"trufada_ninho_m","name":"Ninho","variant_id":"m","option_id":null},{"category":"package","product_id":"crocante-ninho","item_key":"trufada_ninho_g","name":"Ninho","variant_id":"g","option_id":null},{"category":"package","product_id":"trufada-pacoca","item_key":null,"name":"Paçoca","variant_id":null,"option_id":null},{"category":"package","product_id":"trufada-pacoca","item_key":"trufada_pacoca_p","name":"Paçoca","variant_id":"p","option_id":null},{"category":"package","product_id":"trufada-pacoca","item_key":"trufada_pacoca_m","name":"Paçoca","variant_id":"m","option_id":null},{"category":"package","product_id":"trufada-pacoca","item_key":"trufada_pacoca_g","name":"Paçoca","variant_id":"g","option_id":null},{"category":"package","product_id":"trufada-coco-queimado","item_key":null,"name":"Coco Queimado","variant_id":null,"option_id":null},{"category":"package","product_id":"trufada-coco-queimado","item_key":"trufada_coco_queimado_p","name":"Coco Queimado","variant_id":"p","option_id":null},{"category":"package","product_id":"trufada-coco-queimado","item_key":"trufada_coco_queimado_m","name":"Coco Queimado","variant_id":"m","option_id":null},{"category":"package","product_id":"trufada-coco-queimado","item_key":"trufada_coco_queimado_g","name":"Coco Queimado","variant_id":"g","option_id":null},{"category":"drink","product_id":"coca-cola-zero-220","item_key":"drink_coca_cola_zero_220","name":"Coca-Cola Zero","variant_id":"220ml","option_id":null},{"category":"drink","product_id":"fanta-laranja-220","item_key":"drink_fanta_laranja_220","name":"Fanta Laranja","variant_id":"220ml","option_id":null},{"category":"drink","product_id":"guarana-antarctica-200","item_key":"drink_guarana_antarctica_200","name":"Guaraná Antarctica","variant_id":"200ml","option_id":null},{"category":"drink","product_id":"coca-cola-350","item_key":"drink_coca_cola_350","name":"Coca-Cola tradicional","variant_id":"350ml","option_id":null}]'::jsonb) a WHERE a.value=candidate) THEN RAISE EXCEPTION 'semantic_candidate_invalid'; END IF;
 END LOOP;
 -- END GENERATED GUARD
 INSERT INTO crm_recovery_private.observations(conversation_id,message_id,occurred_at,semantic)
 VALUES(p_conversation_id,p_message_id,p_occurred_at,p_semantic) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 IF inserted=0 AND NOT EXISTS (
   SELECT 1 FROM crm_recovery_private.observations o WHERE o.conversation_id=p_conversation_id
   AND o.message_id=p_message_id AND o.occurred_at=p_occurred_at AND o.semantic=p_semantic
 ) THEN RAISE EXCEPTION 'observation_conflict'; END IF;
 RETURN inserted=1;
END; $$;
CREATE FUNCTION public.crm_recovery_read_observations(p_conversation_id uuid)
RETURNS TABLE(message_id text,occurred_at timestamptz,semantic jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT o.message_id,o.occurred_at,o.semantic FROM crm_recovery_private.observations o
 WHERE o.conversation_id=p_conversation_id AND o.expires_at>now() AND o.occurred_at>=now()-interval '24 hours' AND o.occurred_at<=now()
 ORDER BY o.occurred_at,o.message_id LIMIT 1001;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_store_observation(uuid,text,timestamptz,jsonb),public.crm_recovery_read_observations(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_store_observation(uuid,text,timestamptz,jsonb),public.crm_recovery_read_observations(uuid) TO service_role;
CREATE FUNCTION public.crm_recovery_purge_expired()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE deleted integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'provider_only' USING ERRCODE='42501'; END IF;
 WITH expired AS (
  SELECT conversation_id,message_id FROM crm_recovery_private.observations
  WHERE expires_at<=now() ORDER BY expires_at,conversation_id,message_id LIMIT 1000 FOR UPDATE SKIP LOCKED
 ) DELETE FROM crm_recovery_private.observations o USING expired e
 WHERE o.conversation_id=e.conversation_id AND o.message_id=e.message_id;
 GET DIAGNOSTICS deleted = ROW_COUNT; RETURN deleted;
END; $$;
REVOKE ALL ON FUNCTION public.crm_recovery_purge_expired() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crm_recovery_purge_expired() TO service_role;
-- No scheduler is created. Calling purge in production requires an authorized cut.
COMMIT;
