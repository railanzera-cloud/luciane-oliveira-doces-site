# Incidente urgente — checkout Pipocas Trufadas — 01/11/2026

## Sintomas em produção
- Ao finalizar Ninho G + Coco Queimado P: HTTP 400 e mensagem
  "Escolha um pacote de Pipocas Trufadas válido."
- Ao finalizar Paçoca M: HTTP 400 e "Escolha uma fatia válida."
- Site público e banco permitiam nove SKUs P/M/G; o erro acontecia no
  servidor do pedido, **antes** da inserção de pedido na RPC.

## Causa raiz verificada
Supabase comercial `edqiwvccmboyayojvuea`, Edge Function
`create-whatsapp-order` versão 24, publicada com
`functions/_shared/commerce-catalog.mjs` de 24/10/2026:
- entendia somente `crocante-ninho` e `crocante-chocolate` com
  variante histórica `400ml`;
- não carregava o módulo `trufadas-variants.mjs` dos nove SKUs.
O entrypoint, `receipt-card.mjs` e `popcorn-promotion.mjs`
eram **idênticos** aos arquivos homologados no GitHub.
Logs de `function_edge_logs` confirmaram múltiplos POST 400
em `create-whatsapp-order` por volta de 14:33–14:35 (Belém).

## Correção aplicada em produção
Publicada somente a Edge Function `create-whatsapp-order` versão 25
no mesmo projeto, preservando `verify_jwt=false`, entrypoint e
bibliotecas não relacionadas, mas substituindo:
- `functions/_shared/commerce-catalog.mjs` pelo arquivo homologado
  `supabase/functions/_shared/commerce-catalog.mjs`, versão
  `2026-11-01.trufadas-pmg`;
- adicionando `functions/_shared/trufadas-variants.mjs` do GitHub.

Fonte: `work/trufadas-ux-safari-20261101`
(que incorpora a branch `work/trufadas-variantes-pmg-20261101`).
Verificação pós-deploy: função ACTIVE versão 25; conteúdo de ambos os
módulos comparado byte a byte com o GitHub, com resultado **idêntico**.
Estoques novos no banco permanecem habilitados conforme cadastro da loja;
nenhum saldo, pedido ou pagamento foi alterado pelo hotfix.

## Garantias e limites
- Sem nova publicação Cloudflare, alteração do catálogo do frontend,
  mudanças SQL, novos pedidos sintéticos ou mudanças em Mercado Pago/QZ.
- CI do frontend e backend GitHub previamente aprovada:
  https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/41331553419
- Validação em produção limitada a código deployado e SELECT no banco,
  **não equivale** a pedido real completo.
- Confirmar com Luciane que um pedido real P/M/G agora conclui,
  aparece no admin e é tratado no WhatsApp/cozinha.
- Se persistir falha, coletar código HTTP e texto retornado antes
  de qualquer outra alteração; evitar pedido de teste com efeitos reais.
- **Não reimplantar** Edge `create-whatsapp-order` com catálogo 24/10
  ao publicar ZIPs antigos do Cloudflare. O deploy da Edge Function
  deve manter 2026-11-01.trufadas-pmg e os dois arquivos compatíveis.

