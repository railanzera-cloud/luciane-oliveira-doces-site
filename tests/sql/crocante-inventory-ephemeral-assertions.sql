-- Acoes e verificacoes apenas no banco descartavel da CI.
-- Reimpressao de uma compra anterior ao inicio do estoque segue possivel.
do $$
begin
 if not public.lod_crocante_print_allocation_ready((select id from public.orders where order_id='legacy')) then
   raise exception 'pedido historico foi bloqueado pelo novo estoque';
 end if;
end $$;

do $$
begin
 if (select count(*) from public.crocante_inventory where total_stock=0)=2
    and (select count(*) from public.menu_availability
         where item_key in ('crocante_copo_ninho','crocante_copo_chocolate') and status='sold_out')=2 then
   null;
 else raise exception 'estoques iniciais precisam estar zerados e bloqueados'; end if;
end $$;

select public.admin_set_crocante_inventory('crocante_copo_ninho', 2, 1, true);
do $$
begin
 if (select status::text from public.menu_availability where item_key='crocante_copo_ninho') <> 'available'
 then raise exception 'adicionar producao nao liberou Ninho'; end if;
 if (select total_stock from public.crocante_inventory where item_key='crocante_copo_chocolate') <> 0
 then raise exception 'alteracao de Ninho atingiu Chocolate'; end if;
end $$;

insert into public.orders (order_id,order_number,sales_channel,payment_method,payment_status,order_status)
values ('cup1',2301,'whatsapp','manual_pix','pending','new'),
       ('cup2',2302,'whatsapp','manual_pix','pending','new'),
       ('cup3',2303,'whatsapp','manual_pix','pending','new'),
       ('cup4',2304,'whatsapp','manual_pix','pending','new'),
       ('cup5',2305,'whatsapp','manual_pix','pending','new');

insert into public.order_items(order_uuid,item_key,name,quantity)
select id,'crocante_copo_ninho','Crocante Ninho',1 from public.orders where order_id='cup1';
insert into public.order_items(order_uuid,item_key,name,quantity)
select id,'crocante_copo_ninho','Crocante Ninho',1 from public.orders where order_id='cup2';
do $$
begin
 if (select (public.public_crocante_inventory()->0->>'available')::int from public.crocante_inventory c
       where c.item_key='crocante_copo_chocolate') is null then
   null; -- json arrays order by item_key; actual asserts use jsonb_to_recordset below
 end if;
 if (select (c->>'available')::int from jsonb_array_elements(public.public_crocante_inventory()) c
      where c->>'item_key'='crocante_copo_ninho') <> 0 then
   raise exception 'reservas concorrentes nao esgotaram disponibilidade';
 end if;
end $$;
do $$
begin
  begin
    insert into public.order_items(order_uuid,item_key,name,quantity)
    select id,'crocante_copo_ninho','Crocante Ninho',1 from public.orders where order_id='cup3';
    raise exception 'permissao indevida para terceira unidade';
  exception when check_violation then
    if sqlerrm <> 'crocante_sem_estoque' then raise; end if;
  end;
end $$;

-- Confirmacao de Pix diminui estoque real, mas nao libera o que esta reservado.
update public.orders set payment_status='paid' where order_id='cup1';
do $$
begin
 if (select total_stock from public.crocante_inventory where item_key='crocante_copo_ninho')<>1
 then raise exception 'pagamento nao abateu saldo'; end if;
 if (select state from public.crocante_inventory_holds
    where order_uuid=(select id from public.orders where order_id='cup1'))<>'committed'
 then raise exception 'pagamento nao consolidou reserva'; end if;
end $$;

update public.orders set order_status='cancelled' where order_id='cup2';
do $$
begin
 if (select (c->>'available')::int from jsonb_array_elements(public.public_crocante_inventory()) c
    where c->>'item_key'='crocante_copo_ninho')<>1 then
   raise exception 'cancelamento de reserva nao devolveu unidade'; end if;
end $$;

insert into public.order_items(order_uuid,item_key,name,quantity)
select id,'crocante_copo_ninho','Crocante Ninho',1 from public.orders where order_id='cup4';

-- A expiracao deve devolver disponibilidade por calculo, sem cron.
update public.crocante_inventory_holds
set expires_at=now()-interval '1 minute'
where order_uuid=(select id from public.orders where order_id='cup4');
do $$
begin
 if (select (c->>'available')::int from jsonb_array_elements(public.public_crocante_inventory()) c
    where c->>'item_key'='crocante_copo_ninho')<>1 then
   raise exception 'reserva expirada nao liberou unidade'; end if;
end $$;

insert into public.order_items(order_uuid,item_key,name,quantity)
select id,'crocante_copo_ninho','Crocante Ninho',1 from public.orders where order_id='cup5';
-- Pix tardio de cup4 nao pode sobrepor a reserva valida de cup5.
update public.orders set payment_status='paid' where order_id='cup4';
do $$
begin
 if (select state from public.crocante_inventory_holds
     where order_uuid=(select id from public.orders where order_id='cup4')) <> 'shortage'
 then raise exception 'Pix atrasado foi alocado sem saldo'; end if;
 if public.lod_crocante_print_allocation_ready((select id from public.orders where order_id='cup4'))
 then raise exception 'cozinha recebeu compra sem estoque'; end if;
end $$;

update public.orders set payment_status='paid',order_status='confirmed' where order_id='cup5';
do $$
begin
 if (select total_stock from public.crocante_inventory where item_key='crocante_copo_ninho')<>0
 then raise exception 'ultima unidade nao foi abatida'; end if;
 if (select status::text from public.menu_availability where item_key='crocante_copo_ninho')<>'sold_out'
 then raise exception 'ultima unidade nao esgotou produto'; end if;
end $$;

-- Pedidos ja pagos e alocados, quando cancelados, NAO voltam fisicamente
-- sem confirmacao administrativa: poderiam ja estar produzidos/entregues.
update public.orders set order_status='cancelled' where order_id='cup5';
do $$
begin
 if (select total_stock from public.crocante_inventory where item_key='crocante_copo_ninho')<>0
 then raise exception 'cancelamento de pedido pago restaurou estoque sem conferencia'; end if;
end $$;

-- Ajuste otimista nao pode ser duplicado.
do $$
begin
 begin
   perform public.admin_set_crocante_inventory('crocante_copo_ninho',3,1,true);
   raise exception 'controle de versao deixou gravacao ultrapassada passar';
 exception when serialization_failure then
   if sqlerrm <> 'crocante_inventory_conflict_reload' then raise; end if;
 end;
end $$;

select public.admin_set_crocante_inventory('crocante_copo_chocolate',2,1,true);
do $$
begin
 if (select total_stock from public.crocante_inventory where item_key='crocante_copo_chocolate')<>2
 then raise exception 'Chocolate nao recebeu duas unidades'; end if;
 if (select status::text from public.menu_availability where item_key='category_pipocas')<>'available'
 then raise exception 'categoria Pipocas foi alterada indevidamente'; end if;
end $$;
