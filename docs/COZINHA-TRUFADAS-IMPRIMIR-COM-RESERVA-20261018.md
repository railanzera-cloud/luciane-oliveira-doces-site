# Produção 18/10/2026 — Trufadas aceitas mas não impressas

## Diagnóstico confirmado nos dados reais (sem expor clientes)
- Pedido #1327 (fatia) imprimiu, `initial:printed`, 1 tentativa.
- Pedido #1326 (Trufada Ninho) e #1328 (Trufada Ninho) passaram pelo painel mas permaneceram `initial:pending`, 0 tentativas. Posteriormente foram cancelados; NÃO disparar retroativos.
- A proteção original `lod_crocante_print_allocation_ready` só liberava `crocante_inventory_holds.state='committed'`, enquanto Pix manual pendente permanece em `held` até a confirmação. O Modo Cozinha autoaceita o pedido, mas `claim_print_job` excluía o trabalho. O alerta de atraso não distinguia esse bloqueio.
- A função `qz-sign` e o QZ Tray não são a causa do bloqueio específico dessas Trufadas; uma fatia imprimiu pela mesma fila.

## Correção
Migration `20261018164000_kitchen_trufadas_reserved_print.sql`.
Somente a função booleana `lod_crocante_print_allocation_ready(uuid)` é revisada. Conserva `committed` para pagamentos normais; permite `held` exclusivamente se:
- Quantidade reservada é pelo menos a soma pedida daquele item e a reserva ainda não expirou.
- O pedido WhatsApp está ativo, pendente de pagamento, com método manual Pix/dinheiro/cartão na entrega.
- Fila de impressão e modo automático estão explicitamente ligados.
- O pedido foi criado depois das ativações da fila e do modo automático.
Não libera `released`, `shortage`, reservas expiradas, pedidos cancelados nem qualquer pedido anterior à ativação.
A impressão não confirma Pix, não mexe em `orders.payment_status`, `paid_at`, movimentação financeira, `crocante_inventory`, nem em histórico de trabalhos da fila.

## Implantação e homologação
- Aplicar migration pelo Supabase e validar SQL retornado. O arquivo é o registro versionado para continuidade e outros ambientes; sem alteração de frontend e **sem necessidade de novo ZIP Cloudflare**.
- Os pedidos #1326/#1328 já foram cancelados; não devem ser impressos por este patch.
- Em um próximo pedido legítimo de Pipoca Trufada com reserva válida, conferir o fluxo `confirmed` + `print_jobs.initial:printed`; não criar testes artificiais durante a produção.
- O status `printed` só confirma sucesso do envio QZ, não comprova fisicamente saída de papel. Conferir etiqueta real.
- Se existirem pedidos pendentes anteriores à correção ainda elegíveis, a fila pode processá-los após a alteração: checar antes de reaplicar. Para impedir saídas retroativas, conservar filtros de elegibilidade por criação pós-ativação e cancelamento.
- Se outro tipo de erro persistir, conferir QZ local, autorização e os jobs `failed` separadamente.
