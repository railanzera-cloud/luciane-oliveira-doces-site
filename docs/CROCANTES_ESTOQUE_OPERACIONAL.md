# Copos Crocantes — estoque e continuidade

## Contexto e segurança
Site comercial Luciane Oliveira Doces. Projeto Supabase `edqiwvccmboyayojvuea`. Não modificar Luciane Gestão ou Boutique 4.6.

Em 16/10/2026, com a loja aberta, ambos os Copos Crocantes foram temporariamente marcados como `sold_out` em `public.menu_availability`, por item_key, sem alterar `category_pipocas`. Isso protege o checkout existente enquanto a quantidade automática ainda não é publicada. Ninho e Chocolate começam com quantidade **zero** na implementação de estoque, conforme última informação operacional recebida.

Branch isolada: `work/crocantes-estoque-20261016` (base `work/cozinha-integracao-segura-20261015`, preservando impressora QZ, painel e vitrine Premium).

## Regra implementada nesta branch (não inferir publicação automática)

- Ninho: `crocante_copo_ninho`, 400 ml.
- Chocolate: `crocante_copo_chocolate`, 400 ml.
- Controle no painel, separado dos tamanhos e sabores das Pipocas Gourmet.
- Operador define unidades físicas ainda em mãos (inclui as unidades temporariamente reservadas), e pode pausar somente um sabor.
- Toda criação de pedido com um ou mais copos precisa reservar as unidades em uma única transação de banco; `AFTER INSERT` de `order_items` protege mesmo checkout antigo.
- A reserva em pedidos não confirmados vale **30 minutos**. A disponibilidade é calculada por `expires_at > now()`, sem cron. O carrinho apenas informa o saldo, não reserva estoque.
- A confirmação do pagamento ou aceite presencial consolida a reserva e abate o saldo físico.
- Cancelamento de pedido com reserva não consolidada devolve disponibilidade de imediato.
- Cancelamento após consolidação **não repõe automaticamente** o produto físico, pois ele pode já ter sido produzido ou entregue. A Luciane deve conferir e atualizar o saldo se a unidade realmente voltou a estar disponível.
- Se um Pix for confirmado depois de uma reserva expirada e não restarem unidades, o pagamento continua registrado, mas a reserva vira `shortage` e o pedido **não pode ir para impressão automaticamente**. O painel apresenta um aviso de pendência de estoque para atendimento manual.
- A fila QZ/segurança contra impressões antigas é preservada. Pedidos criados antes da migração preservam a possibilidade de reimpressão.

## Publicação coordenada

1. Conferir CI `sql-estoque` no Postgres descartável, suíte de regressão, TypeScript, build e integridade do pacote.
2. Conferir estado da loja e `menu_availability` no Supabase comercial; ambos os copos precisam continuar `sold_out` e com estoque inicial zero. Nunca inserir automaticamente quantidade presumida.
3. Aplicar migração `supabase/migrations/20261016133000_crocante_inventory_individual.sql` uma única vez, **após validação**, mantendo zero. Não reaplicar `kitchen_print_preparation` nem reexecutar seeds do catálogo.
4. Confirmar diretamente no backend ambos com `total_stock=0`, RPC pública devolvendo zero, estado dos potes Gourmet preservado e fila QZ sem alteração.
5. Gerar ZIP de Cloudflare Pages do HEAD final validado e entregar para publicação manual. Não publicar automaticamente.
6. Após publicação, no painel > Disponibilidade > Copos Crocantes: conferir quantidade zero; quando a produção estiver pronta, informar unidades físicas corretas e salvar individualmente.
7. Homologar último copo, dois compradores concorrentes, carrinho misto, pedido pendente, pagamento tardio e cancelamento com um pedido controlado, sem mexer nos pedidos históricos.

## Observações
- Esta etapa muda apenas copos Crocantes. Não altera preços, Pix, Mercado Pago, Tintim, Meta Pixel/CAPI, disponibilidade dos Potes Gourmet ou histórico de pedidos.
- O estoque exibido no site nunca substitui a validação atômica no servidor.
- Atualização da interface leva no máximo o ciclo de consulta/refresh; checkout sempre decide pelo banco.
- Os testes automatizados não equivalem ao Safari físico. Registrar separadamente a homologação manual.

## Implantação verificada em 16/10/2026

- **Banco comercial atualizado:** tabelas `crocante_inventory` e `crocante_inventory_holds`, funções RPC e gatilhos ativos. Não reaplicar a migração.
- **Estoque registrado:** Ninho 0, Chocolate 0; sem reservas. `menu_availability` dos copos em `sold_out`, `category_pipocas` em `available`, `orders_open = true`.
- **Pedidos legados:** havia itens anteriores à instalação; a rotina considera `installed_at` e não exige reserva retroativa.
- **Edge Function `create-whatsapp-order`:** versão 21 ACTIVE, com tratamento HTTP 409 para `crocante_sem_estoque`. Os três módulos compartilhados foram comparados com a versão anterior e não tiveram mudanças.
- **GitHub:** branch `work/crocantes-estoque-20261016`; testes SQL em PostgreSQL efêmero, fila da cozinha, TypeScript e suíte de regressão passaram no checkpoint de implementação.
- **Cloudflare Pages:** site público **não foi publicado automaticamente**. Entregar e aplicar manualmente ZIP validado do commit final da branch. Até aplicar o novo frontend, manter os Copos Crocantes em `sold_out` e não lançar saldo positivo no banco.
- **Estoque físico:** nenhuma unidade é presumida; quando houver produção confirmada, a Luciane define a quantidade pelo novo painel após a publicação. Não registrar 2 unidades de Chocolate apenas por relato anterior à conferência atual.
