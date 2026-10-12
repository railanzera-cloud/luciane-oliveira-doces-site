# Tintim → CRM: observação comercial segura (12/10/2026)

## Estado

- Webhook Supabase `tintim-webhook`, **versão 5 ativa**, com o mesmo caminho,
  autenticação por hash de chave de webhook e `verify_jwt=false` que já eram usados.
- Código: `supabase/functions/tintim-webhook/core.mjs`; endpoint `index.ts` inalterado.
- Migração aplicada no banco:
  `supabase/migrations/20261012235500_tintim_commercial_observations.sql`.
- GitHub Actions de validação: execução 38307492290, **success**.
- Novo armazenamento `tintim_commercial_observations` só pode ser alimentado
  pelo trigger de recibos do webhook; leituras diretas bloqueadas para
  `anon` e `authenticated`.
- Teste reversível de registro `stage=Comprou, sale_amount=58.50` executado
  dentro de transação com `ROLLBACK`. Não criou venda fictícia no banco.
- Após deploy: 225 pedidos existentes, 15 recibos, quatro vínculos/snapshots,
  **zero observações comerciais reais ainda**. Esses números são um checkpoint,
  não uma promessa sobre eventos futuros.

## O que é preservado

Para eventos `lead_update`, o normalizador preserva:
- `status.name` / `stage.name` → `stage`
- `status.id` → `stage_id` quando disponível
- `sale_amount` → valor informado manualmente ou semiautomaticamente no Tintim
- `sale_amount_from_message` → valor estruturado extraído pelo próprio Tintim
- `updated_isoformat` e outros campos de tempo conhecidos.

Valores são sanitizados e devem ser positivos e plausíveis. Quando ambos
os campos de valor vierem preenchidos, a observação fica **ambígua** e sem
valor escolhido por nós. Conteúdo de mensagens privadas nunca é copiado.

A tabela contém somente uma referência ao recibo, etapa, valor declarado
(se inequívoco), modo de registro, horário e estado `unverified`.
Um recibo não produz duas observações (chave primária em `receipt_id`).

## O que NÃO foi feito

- Nenhuma atualização de `orders.payment_status`, `orders.order_status`,
  aceite/cancelamento, checkout ou venda comercial.
- Nenhum Purchase adicional para a Meta.
- Não somar observações do webhook como faturamento.
- Não atribuir automaticamente uma observação a um pedido, inclusive quando
  mesmo telefone/conversa já tiver múltiplos pedidos.

## Limite do webhook que exige observação real

A documentação do Tintim diz que `lead_update` é emitido na alteração da
etapa da jornada. Se o contato continuar na etapa `Comprou` e comprar
novamente, **não está confirmado que haverá um novo lead_update**; a ausência
desse evento não prova falha de pagamento nem de disparo Purchase.

O dado pode ser um valor atualizado na conversa, e não uma venda individual.
Registrar recorrência automaticamente exige sinais adicionais confiáveis.

## Validação na próxima compra real

1. Deixar Luciane operar normalmente e usar seu gatilho atual, sem repetir
   Purchase de teste e sem precisar entrar no painel do site.
2. Depois de uma compra real, consultar APENAS agregados de observação e
   último horário, sem expor telefone/mensagem:
   ```sql
   SELECT count(*)::int AS total,
      count(*) FILTER(WHERE stage_label ILIKE 'comprou')::int AS etapa_comprou,
      count(*) FILTER(WHERE reported_sale_amount IS NOT NULL)::int AS com_valor,
      max(observed_at) AS ultimo_evento
   FROM public.tintim_commercial_observations;
   ```
3. Validar se o evento realmente chegou, qual estágio e qual campo de valor;
   conferir horários com pedido e informação da Luciane, sem publicar dados
   pessoais.
4. Só então planejar conciliação por pedido, confirmação comercial e compras
   repetidas com deduplicação; a compra pelo Tintim não deve atualizar Pix
   do site sem prova separada do pagamento ou política expressa.

Referências oficiais: 
- https://tintim.app/base-de-conhecimento/como-funcionam-os-webhooks-do-tintim/
- https://tintim.app/base-de-conhecimento/como-classificar-uma-conversa-em-venda-e-pegar-automaticamente-o-valor/
