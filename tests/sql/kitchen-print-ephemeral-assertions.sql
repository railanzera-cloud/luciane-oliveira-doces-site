-- Asserções sobre o banco EFÊMERO do CI, nunca executar em produção.
do $$
begin
 if (select count(*) from public.kitchen_print_control where enabled=false) <> 1 then
   raise exception 'A fila nao iniciou desativada';
 end if;
 if (select count(*) from public.print_jobs) <> 1 then
   raise exception 'A migracao mudou o backlog legado';
 end if;
end $$;

insert into public.orders(order_id,order_number,sales_channel,payment_method,payment_status,order_status)
values ('before-enable',1010,'whatsapp','cash','pending','confirmed');

do $$
begin
 if (select count(*) from public.print_jobs) <> 1 then
   raise exception 'A fila desativada gerou comanda';
 end if;
end $$;

select public.admin_set_kitchen_print_enabled(true);

insert into public.orders(order_id,order_number,sales_channel,payment_method,payment_status,order_status)
values
 ('abandoned',1100,'whatsapp','manual_pix','pending','new'),
 ('cash-accepted',1101,'whatsapp','cash','pending','confirmed'),
 ('card-accepted',1102,'whatsapp','card_on_delivery','pending','confirmed'),
 ('pix-unpaid',1103,'whatsapp','manual_pix','pending','confirmed'),
 ('pix-paid-unaccepted',1104,'whatsapp','manual_pix','paid','new'),
 ('mp-paid',1105,'site','mercado_pago_pix','paid','new'),
 ('mp-unpaid',1106,'site','mercado_pago_card','pending','payment_pending');

do $$
begin
 if (select count(*) from public.print_jobs) <> 4 then
   raise exception 'Insercao de comandas incorreta';
 end if;
 if exists (select 1 from public.print_jobs j join public.orders o on o.id=j.order_uuid
            where o.order_id in ('abandoned','pix-unpaid','pix-paid-unaccepted','mp-unpaid','before-enable')) then
   raise exception 'Pedido nao elegivel entrou na fila';
 end if;
end $$;

update public.orders set payment_status='paid' where order_id='pix-unpaid';
update public.orders set order_status='confirmed' where order_id='pix-paid-unaccepted';
update public.orders set order_status='preparing' where order_id='cash-accepted';
update public.orders set order_status='preparing' where order_id='cash-accepted';

do $$
begin
 if (select count(*) from public.print_jobs) <> 6 then
   raise exception 'Comanda faltante ou duplicada no aceite/pagamento';
 end if;
 if (select count(*) from public.print_jobs j join public.orders o on o.id=j.order_uuid
     where o.order_id='cash-accepted') <> 1 then
   raise exception 'Idempotencia de cash falhou';
 end if;
end $$;

do $$
declare
 v_claim jsonb;
 v_job uuid;
 v_token uuid;
 v_order text;
begin
 v_claim := public.claim_print_job('test-worker-0001');
 if v_claim is null then raise exception 'Nao foi possivel reclamar comanda'; end if;
 v_order := v_claim->'order'->>'order_id';
 if v_order = 'legacy' or v_order = 'before-enable' then
   raise exception 'Comanda antiga foi reclamada';
 end if;
 v_job := (v_claim->'job'->>'id')::uuid;
 v_token := (v_claim->'job'->>'claim_token')::uuid;
 if not public.admin_verify_print_claim(v_job,v_token) then
   raise exception 'Claim valido nao foi autorizado';
 end if;
 update public.orders set order_status='cancelled' where order_id=v_order;
 if public.admin_verify_print_claim(v_job,v_token) then
   raise exception 'Pedido cancelado continuou autorizado para impressao';
 end if;
end $$;

select public.admin_set_kitchen_print_enabled(false);
do $$
begin
 if (select enabled from public.kitchen_print_control) then
   raise exception 'Fila nao pausou';
 end if;
 if public.claim_print_job('test-worker-0002') is not null then
   raise exception 'Fila pausada ainda liberou comanda';
 end if;
end $$;

-- Novos cenários, exclusivamente no banco descartável.
select public.admin_set_kitchen_print_enabled(true);
insert into public.orders(order_id,order_number,sales_channel,payment_method,payment_status,order_status)
values ('mp-card-paid',1200,'site','mercado_pago_card','paid','new');
do $$
declare v_claim jsonb; v_again jsonb; v_job uuid; v_token uuid; v_order uuid;
begin
 v_claim := public.claim_print_job('runtime-worker-1');
 if v_claim->'order'->>'order_id' <> 'mp-card-paid' then
   raise exception 'Cartao aprovado nao foi liberado ou houve consumo antigo';
 end if;
 v_job := (v_claim->'job'->>'id')::uuid;
 v_token := (v_claim->'job'->>'claim_token')::uuid;
 v_order := (select id from public.orders where order_id='mp-card-paid');
 if public.claim_print_job('runtime-worker-2') is not null then
   raise exception 'Tentativa duplicada do mesmo claim';
 end if;
 if public.admin_verify_print_claim(v_job,gen_random_uuid()) then
   raise exception 'Token incorreto autorizado';
 end if;
 -- Interrupcao depois de enviar: printing nao deve expirar para pending.
 update public.print_jobs set claimed_at=now()-interval '1 day' where id=v_job;
 if public.claim_print_job('runtime-worker-3') is not null then
   raise exception 'Claim interrompido foi reenviado automaticamente';
 end if;
 update public.print_jobs set status='failed' where id=v_job;
 if public.claim_print_job('runtime-worker-4') is not null then
   raise exception 'Falha ambigua foi reenviada automaticamente';
 end if;
 -- Apenas simula confirmacao de spooler para ensaiar reimpressao solicitada.
 update public.print_jobs set status='printed',printed_at=now() where id=v_job;
 insert into public.print_jobs(order_uuid,job_key,kind,requested_by)
 values(v_order,'reprint:ephemeral-only','reprint',public.lod_require_authenticated_staff());
 v_again:=public.claim_print_job('runtime-worker-5');
 if v_again->'job'->>'kind' <> 'reprint' then raise exception 'Reimpressao valida ausente'; end if;
 if not public.admin_verify_print_claim((v_again->'job'->>'id')::uuid,(v_again->'job'->>'claim_token')::uuid) then
   raise exception 'Reimpressao valida bloqueada';
 end if;
 update public.orders set order_status='cancelled' where id=v_order;
 if public.admin_verify_print_claim((v_again->'job'->>'id')::uuid,(v_again->'job'->>'claim_token')::uuid) then
   raise exception 'Reimpressao de cancelado autorizada';
 end if;
end $$;
select public.admin_set_kitchen_print_enabled(false);
