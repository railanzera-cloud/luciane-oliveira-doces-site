# Trufadas — expansão por sabor e tamanho P/M/G (01/11/2026)

## Estado desta intervenção
Contrato comercial preparado em `supabase/functions/_shared/trufadas-variants.mjs`.
**Ainda não integrado ao frontend/backend; não liberado para vendas.**
Flag de preparação `TRUFADAS_RELEASE_ENABLED=false`.
Não alterar produção, main, Cloudflare ou migrar dados com esta etapa.

Base: `work/homologacao-followup-assistido-20261031`, commit `ad2e7e0de0b0ff6f44473368c355a9f2b3045b57`.
A linha de Últimas Fatias e a de diagnóstico de impressão de 31/10 são divergentes;
reconciliar cuidadosamente antes de um ZIP publicável, sem descartar alterações.

## Matriz de venda confirmada
| Sabor | P | M | G |
| --- | ---: | ---: | ---: |
| Ninho | R$ 15,90 | R$ 18,90 | R$ 20,90 |
| Paçoca | R$ 14,90 | R$ 16,90 | R$ 18,90 |
| Coco Queimado | R$ 14,90 | R$ 16,90 | R$ 18,90 |

Pesos informados somente para o pacote P: Ninho 173 g, Paçoca 240 g,
'Cocada' 187 g. Confirmar se 'Cocada' é exatamente o sabor vendido como
'Coco Queimado' antes de publicar a gramagem. M e G sem peso confirmado.
Não converter P/M/G para 400 ml, nem estimar peso. Não exibir gramagem
não confirmada.

Nome comercial: Ninho (sem prefixo Caramelo), Paçoca e Coco Queimado.
Caramelo e Chocolate deve ficar indisponível para novas vendas, mas seu ID,
sua chave antiga e todos os pedidos históricos devem permanecer intactos.
O ID histórico `crocante-ninho` também é preservado; a variante legada
`400ml` não é reutilizada como `p`.

## Contrato preparado
- Cada combinação sabor × tamanho é um SKU/estoque distinto (9 chaves
  `trufada_<sabor>_<tamanho>`), com preço fixo em centavos.
- Uma unidade de `trufada_pacoca_p` nunca deve diminuir
  `trufada_pacoca_m` ou `trufada_ninho_p`.
- Cada SKU inicia sem quantidade inventada e sem autorização de venda;
  somente a proprietária/gestor registra o total físico de pacotes prontos.
- `TRUFADAS_LEGACY` preserva `crocante_copo_ninho` e
  `crocante_copo_chocolate`, sem migração retroativa dos pedidos.

## Contratos do banco verificados em leitura
- `public.crocante_inventory` tem CHECK permitindo apenas dois item_keys
  históricos; não comporta os novos SKUs ainda.
- `lod_hold_crocante_on_item_insert` contém lista fixa de dois sabores.
- `admin_set_crocante_inventory` também tem validação fixa de dois sabores.
- `public_crocante_inventory` e `admin_get_crocante_inventory` já agregam
  a partir de linhas cadastradas, mas o frontend exige exatamente duas.
- `create_whatsapp_store_order` verifica chaves disponíveis, depois
  `create_store_order`; reserva deve ocorrer atomicamente no insert.
- `lod_reconcile_crocante_on_order_status` converte reservas em baixas
  físicas após aprovação/conclusão conforme regra atual. Pedido registrado
  compromete disponibilidade via hold, não equivale a pagamento aprovado.
- Impressão está vinculada à elegibilidade de alocação e deve manter
  a garantia de não imprimir sem reserva válida.

## Sequência segura de implementação
1. Inspecionar/conciliar branches de Últimas Fatias, impressão e CRM; proteger
   o arquivo de foto Coco Cremoso com Morango e seus dois usos na vitrine.
2. Criar migration aditiva **não aplicada** que permita nove SKUs, preserve
   chaves/holds antigos, proteja RLS/RPCs, inclua estoque inicial 0/desativado
   e não altere pedidos antigos.
3. Trocar listas rígidas por contratos de SKU em RPCs, admin e trigger;
   manter validação de versão, trava `FOR UPDATE`, idempotência e contagem física.
4. Adaptar `commerce-catalog.mjs`, `app/catalog.ts` e disponibilidade para
   conferir os nove itens contra o backend, com `p|m|g` e preço em centavos.
5. Refatorar seleção mobile: **Sabor → Tamanho → Quantidade → Carrinho**;
   fotos aprovadas individuais e links reais dos assets. Seleção indisponível
   quando estoque não consultado; sem fallback liberando vendas.
6. Atualizar admin para nove SKUs agrupados por sabor, sem exibir Chocolate
   no painel operacional; preservar histórico e acesso protegido.
7. Garantir que pedidos, WhatsApp, comanda 58 mm, resultados, Meta/Tintim
   carreguem nomes/preços/tamanhos corretos, sem Purchase artificial.
8. Testar com PostgreSQL isolado, concorrência, recontagem, reserva, retorno
   de estoque, cancelamento e situações sem QZ. Fazer regressões e CI.
9. Aplicar migração em produção apenas com autorização específica, backup,
   janela segura e verificação. Carregar quantidades reais pela Luciane.
10. Somente depois produzir ZIP fiel ao commit validado e pedir autorização
    explícita para Cloudflare.

## Pendente comercial
Quantidades prontas de cada uma das nove combinações e identificação final
'Cocada' versus 'Coco Queimado'. Pesos M/G só são necessários se forem exibidos
na comunicação comercial, não para implementar o controle por pacote.

## Estado de publicação
Nenhuma migração aplicada; nenhum pedido de teste criado; nenhum deploy.
