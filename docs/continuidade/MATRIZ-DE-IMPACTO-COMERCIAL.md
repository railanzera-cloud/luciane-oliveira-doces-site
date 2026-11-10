# Matriz de impacto comercial — Luciane Oliveira Doces

**Instituída em 05/11/2026** · **Objetivo:** impedir a regressão “adicionou o produto, mas o cliente não conseguiu pedi-lo”.  
**Não é uma lista de testes a executar integralmente em todo commit.** Selecionar o conjunto real de dependências **a partir da mudança solicitada**, preservando contratos contíguos. Para dúvida de arquitetura, ler o código e a RPC antes de assumir conexão.

## 1. Estados a manter separados

| Estado | Não confundir com |
|---|---|
| Produto/foto aparece na vitrine | SKU realmente aceito no backend, estoque disponível, pedido concluído |
| Loja/categoria visível | Venda permitida pelo backend/estoque/horário |
| Item no carrinho | Reserva efetiva, pedido criado, receita |
| Pedido persistido | Mensagem WhatsApp enviada, pagamento aprovado, comanda impressa |
| WhatsApp aberto | Mensagem efetivamente enviada, conversa recebida, opt-in comercial |
| Aceite operacional | Pix/cartão aprovado, dinheiro recebido |
| Estoque reservado | Estoque consumido, pagamento confirmado |
| QZ informa job/conclusão | Papel fisicamente impresso |
| Conversa de cliente no CRM | Compra, consentimento, atribuição orgânica |
| Pixel/CAPI Purchase | Pedido criado, pagamento pendente, clique |
| Teste aprovado em commit | Deploy da mesma revisão |
| ZIP construído | Edge Function e migrations efetivamente compatíveis e instaladas |

## 2. Mapa de dependências por tipo de trabalho

**Use esta tabela ao planejar e ao revisar a entrega.** Caminhos são referências da base cumulativa vista em 05/11; confirme se arquivos/contratos foram renomeados em commits posteriores.

| Mudança pedida | Verificações mínimas de contrato | Código / evidência inicial | Aceitação sem regressão |
|---|---|---|---|
| Foto, corte, cor, espaçamento, tipografia | Assets, largura/altura, contraste, estados visuais, foco, retorno | `app/page.tsx`, `app/storefront-*.css`, `public/images/`, `REFERENCIA-VISUAL-UX.md` | Mesma foto, CTA e produto; sem overflow, layout shift relevante ou perda de foco |
| Redesenho de vitrine/categoria | Destino `?categoria`, estado de loja, CTA verdadeiro, UTMs/fbclid/Tintim, histórico | `app/page.tsx`, `app/menu-navigation.ts`, `app/menu-availability.ts` | Ao entrar/voltar, categoria e primeira ação corretas; campanhas preservadas |
| Adicionar produto ou sabor | Catálogo frontend/backend, identificadores legados, fotos, variantes, preço, quantidade, disponibilidade, admin, cozinha, resumo e emissão | `app/catalog.ts`, `supabase/functions/_shared/commerce-catalog.mjs`, `app/order-checkout.ts`, `components/admin-orders-panel.tsx` | Seleção real → pedido autorizado com o **mesmo item e valor** → admin/WhatsApp/cozinha sem substituição errada |
| Alterar tamanho ou variante | SKU, gramagem exibida quando autorizada, preço centavos, pacote histórico, RPC, foto/estoque por combinação | `supabase/functions/_shared/trufadas-variants.mjs`, `components/admin-trufadas-stock.tsx`, catálogo | P, M e G não compartilham baixa; pedido antigo mantém identidade; sem preço inventado |
| Mudar preço/regra promocional | Cotação backend, grupo/recheio, relógio Belém, duração, site ordering vs WhatsApp, mensagem e desconto real | `supabase/functions/_shared/popcorn-promotion.mjs`, `app/catalog.ts`, `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md` | Sem `price_changed` por frontend/backend divergentes; expiração realmente remove oferta |
| Mudar estoque, pré-reserva ou categoria habilitada | Total, reservado, disponível, CAS/versão, lock, loja fechada, data/lote, estoque externo | `app/menu-availability.ts`, `components/admin-trufadas-stock.tsx`, `components/admin-strawberry-preorder.tsx`, SQL/RPC pertinentes | Concorrência não vende além de saldo; fechado ≠ esgotado; cancelamento libera conforme contrato |
| Carrinho, personalização ou valor | Identidades por item, preço, taxas, frete, quantidade, rollback de seleção, estado de sessão | `app/order-checkout.ts`, `app/catalog.ts`, `lib/site-order.ts` | Soma bate com fonte do servidor; refresh/clique repetido não cria duas compras |
| Checkout / criação de pedido | Disponibilidade e cotação transacionais, payload, pedidos, status, retries, Pix/cartão/dinheiro, resposta | `supabase/functions/create-whatsapp-order/index.ts`, `supabase/functions/create-order/index.ts`, `app/order-checkout.ts` | SKU/fonte aceita mesma variante; um evento idempotente, total correto, sem perder sessão |
| Pós-pedido / WhatsApp | Link Tintim, token/número de sessão, mensagem conforme pagamento, acompanhamento, consentimento | `components/whatsapp-order-result.tsx`, `lib/whatsapp-finalization.ts`, `app/pedido/` | “Ver pedido” → recuperar envio original ou assistência segura; sem novo pedido, sem falso pagamento |
| Mercado Pago / Pix / webhook | HMAC/autenticidade, `paid_at`, evento financeiro deduplicado, cancelamentos, CAPI | `components/mercado-pago-card-form.tsx`, `supabase/functions/mercadopago-webhook/index.ts`, backend | Pagamento só aprovado com prova válida; falha/retry não duplica Purchase ou pagamento |
| Painel / status de pedidos | Auth/RLS, estado pedido, busca, quantidade por SKU, cancelamento, estoque, repasse à cozinha | `app/admin/`, `components/admin-orders-panel.tsx`, `lib/admin-orders-client.ts` | Admin mostra o que cliente registrou; ações não alteram finanças por engano |
| Cozinha / impressão QZ | Seleção da impressora, certificado, claim, elegibilidade, hold, reconexão, ESC/POS 58 mm, reimpressão incerta | `lib/qz-print-client.ts`, `lib/kitchen-auto-client.ts`, `supabase/functions/qz-sign/index.ts` | Comanda fiel, sem duplicar, identifica Pix pendente; erro físico documentado |
| CRM, Tintim, Meta, follow-up | Origem, consentimento, opt-out, horário, resposta, compra, dedupe, envio assistido | `components/admin-crm-panel.tsx`, `lib/crm-assisted.ts`, `supabase/functions/tintim-webhook/`, `crm-whatsapp-webhook/` | Sem compra artificial/atribuição inventada; abertura ≠ envio; não disparar sem gate |
| Resultados / períodos / relatórios | America/Belem, status aprovado/pago/estornado, totais e comparações, dedupe, autorização | `app/admin/page.tsx`, relatórios/testes `tests/admin-results-*.test.mjs` | Receita não inclui pedidos pendentes como pagos; valores e linhas coincidem |
| Conteúdo editorial sem mudança funcional | Texto conciso, disponibilidade, preço, SEO quando pertinente, acessibilidade, links | Página/componente e estilos envolvidos | Nenhum atributo de produto/promoção fictício; CTA existente continua certo |

**A matriz é um checklist de investigação, não autorização para fazer integrações externas**. Uma modificação de CSS que não toca preço só necessita teste de navegação/semântica, mas um novo SKU **não** pode ignorar a cadeia de pedidos.

## 3. “Definição de pronto” para adicionar produto (caso concreto)

Antes de declarar integração:
1. **Produto:** confirmar com o proprietário nome, sabor, foto real, apresentação, variante e preço. Se estiver ausente e for indispensável, perguntar **apenas o dado faltante**. Nunca inventar gramagem ou saldo.
2. **Identidade:** mapear `product_id` e `sku` existentes, distinguindo os antigos; aceitar pedidos históricos.
3. **Fonte de preço:** definir a mesma cotação frontend/backend para o método de pedido ativo, inclusive promoção e data.
4. **Disponibilidade:** backend/RPC, item habilitado e loja aberta; verificar resposta a esgotamento e concorrência. Estoque não consultado não vira saldo positivo.
5. **Jornada:** exibir foto/nome/valor, selecionar, adicionar, visualizar carrinho, revisar total, registrar idempotentemente, recuperar retorno após WhatsApp/pagamento.
6. **Operação:** verificar representação no admin, estoque reservado/baixado conforme contrato, cozinha/etiqueta 58 mm e resultados sem duplicidade.
7. **Integrações:** metas/campanhas/UTM e CAPI apenas quando realmente afetados; webhook/CRM sem status inventado.
8. **Teste:** SQL isolado e concorrência se migração, unit/DOM/render, checkout de SKU, falha/retentativa, visual mobile, integração sintética; ausência de pedido real sem autorização.
9. **Release:** CI + artefato do mesmo SHA; compatibilidade das Edge Functions e SQL **efetivamente instalados**; aprovação para deploy/validação real separada.

Se qualquer elo estiver **sem prova**, declarar “produto integrado no frontend, mas fluxo total pendente”, não “finalizado”.

## 4. Jornada de teste orientada por risco

**UX-only:**
- Uma captura/caminho base e uma da candidata (se ferramentas disponíveis); 320/375/390/430/desktop conforme layout.
- Revisar botão, alvo, fonte, foto, label, estado selecionado, fechamento da loja, back/forward, baixa conectividade, leitor/teclado.
- Executar testes específicos de UI e build/TypeScript do SHA quando publicável. Não tocar em SQL/pagamento sem dependência.

**Mudança de contrato:**
- Comparar módulos frontend, Edge e SQL/RPC; testar status válido/inválido, dados ausentes, dois pedidos concorrentes, replay idempotente, bloqueio RLS, estorno/cancelamento; teste de restauração/rollback.
- Conferir que a área gerencial e a impressão consomem os mesmos dados sem criar outro produto.
- Não acionar número comercial, pedido real ou QZ físico por default.

**Mudança de pagamentos/estoque:**
- Exigir evidências de instalação real, backup apropriado, autorização do corte, monitoramento, reversibilidade e validação de pós-deploy; não “corrigir” por CSS/flag.

## 5. Testes e fluxos já existentes na base candidata 03/11 (não assumir que sempre passam)

- Catálogo: `tests/trufadas-variants-pmg-20261101.test.mjs`, `tests/trufadas-stock-controls.test.mjs`, `tests/popcorn-premium-pricing.test.mjs`.
- Vitrine: `tests/home-premium-reconstrucao-20261102.test.mjs`, `tests/gourmet-rolagem-contextual-20261103.test.mjs`, `tests/storefront-vitrine-editorial-experiment.test.mjs`.
- WhatsApp: `tests/whatsapp-finalization-20261102.test.mjs`, `tests/checkout-premium-unificado-20261018.test.mjs`.
- Admin: `tests/admin-disponibilidade-premium-20261102.test.mjs`, `tests/admin-order-items-slice-quantity-20261024.test.mjs`.
- QZ/cozinha: `tests/kitchen-auto-mode-20261017.test.mjs`, `tests/cozinha-worker-id-20261102.test.mjs`, `tests/qz-printer-recovery-20261102.test.mjs`.
- CRM/Meta: `tests/crm-assisted-client-20261031.test.mjs`, `tests/crm-followup-preflight-20261026.test.mjs`, `tests/crm-meta-delivery-status-20261027.test.mjs`.
- Integração: `.github/workflows/design-boutique-preview.yml` (build/testes/pacote/preview) e `.github/workflows/trufadas-pmg-isolated-db.yml` (PostgreSQL isolado) quando aplicáveis.

**Cuidado:** qualquer workflow ou teste daqui pode ter mudado após 05/11. Verifique arquivo e SHA, não apenas nome.

## 6. Gate de release e evidências

```text
[ ] Base correta e diferenças/PRs comparadas
[ ] Critérios de UX e componentes protegidos definidos
[ ] Contratos adjacentes relevantes mapeados
[ ] Assets aprovados presentes e referenciados no repositório
[ ] Código completo no SHA, sem conflito ou dados fictícios produtivos
[ ] Testes focados e globais requeridos no SHA (erros e limites declarados)
[ ] SQL/Edge instalada compatível com frontend (verificação do estado real)
[ ] ZIP/artefato corresponde ao SHA e inclui frontend/admin/pedido/assets/worker
[ ] Identidade do deployment Cloudflare anterior conhecida para rollback
[ ] Permissão específica para migração, Edge e/ou publicação, se necessárias
[ ] Safari/iPhone/QZ/pagamento reais homologados ou pendência explicitamente aberta
[ ] Memória, referência visual e checkpoint atualizados sem inventar estados
```

**Não mover qualquer checkbox apenas porque uma mensagem anterior disse “concluído”.** Evidências devem ser verificadas no contexto da mudança.


## 7. Novo contrato de seleção de localidade e entrega — 05/11/2026

**Escopo:** `docs/ENTREGA-BAIRROS-BUSCA-20261105.md`. Ao alterar nome/alias/bairro, testar busca, ambiguidade, IDs persistidos, restauro de sessão e aviso de localidade sem tarifa. Ao alterar vínculo zona/tarifa, testar **frontend + `quoteFulfillment`** e preço cotado em ambos os pedidos (site e WhatsApp), total, cartão, troco, painel, comanda e histórico.

**Invariantes:** `locality_id` é obrigatório para a interface nova; o servidor verifica se a localidade existe, tem tarifa autorizada e corresponde ao `zone_id`; valor monetário vem da tabela do servidor, nunca do navegador. Taxa pendente não vira R$ 8 genéricos. Retirada mantém frete zero. IDs legados permanecem estáveis; guardas de nomes especiais no fluxo anterior não podem ser removidos durante a migração.

**Rollout:** backend compatível → frontend → conferência de sessões antigas → ativação específica de `DELIVERY_REQUIRE_LOCALITY_ID`; antes de ativar o flag, não afirmar resistência absoluta a payloads legados fabricados. Exigir validação da tabela urbana e teste de Safari físico, especialmente quando teclado e dropdown abrem próximos ao rodapé do checkout.

### 07/11/2026 — promoção Gourmet por tamanho, Nutella excluída

Contrato temporário de negócio (sem atualizar tabelas permanentes): `POPCORN_PROMOTION` vale de 07/11 00:00 a 08/11 00:00 em `America/Belem`. Para cada pedido e SKU Gourmet, calcular grupo normal máximo validando todos os `option_ids`; **se houver Nutella em qualquer posição**, manter preço normal do grupo 3 (500ml R$33, 750ml R$48, 1L R$58). Caso contrário, durante a janela aplicar o preço-base R$25/R$39/R$49, incluindo sabores de grupos 2 e 3. Após a janela usar o preço normal do grupo mais alto. Não modificar limite de sabores, estoque, tarifas, quantidade nem identidade de SKU.

**Paridade obrigatória:** catálogo cliente `app/catalog.ts` + preview do configurador + carrinho/totais + mensagem WhatsApp + `commerce-catalog.mjs` autoritativo (Edge `create-whatsapp-order`) + helper site `popcorn-quote-campaign.mjs` (não ativar modo de checkout site sem contrato backend compatível). A peça editorial e preço normal riscado devem concordar com a cotação. Excluir Nutella também da comunicação de economia. Revalidar preço na Edge imediatamente antes de persistir e rejeitar total desatualizado, nunca aceitar desconto informado pelo cliente.

**Gate de publicação:** somente com versão Cloudflare adequada e Edge sincronizada, backup/rollback da Edge v29, testes da janela e exceção, captura em WebKit e verificação final em Safari/iPhone; publicar frontend isolado ou backend isolado pode provocar `409 price_changed`.

## Recuperação de impressão QZ (08/11/2026)

- Pedido `confirmed` não garante pagamento; confirmação Pix fica independente.
- `print_jobs.printing` com `claimed_at` há 5 min ou mais **não** é automaticamente reenviado; exibir diagnóstico, identificar número do pedido e solicitar verificação física.
- RPC de equipe `admin_recover_stalled_print_job`: `paper_confirmed` só depois de observação de papel; `retry_no_paper` só depois de confirmar ausência de papel. Lock da tarefa, controle de concorrência, validação de pedido/estoque/fila e auditoria.
- Ao reenviar, apenas a tarefa travada é marcada `cancelled` e uma única nova tarefa `initial` com `job_key` determinística entra em `pending`. A função de claim já existente continua impondo elegibilidade. Não recriar pedido ou alterar pagamento, não tocar pedidos saudáveis.
- `printed` do QZ registra resposta da API, não garantia de papel. Confirmação manual deve ser diferenciada e auditada.
- RPC produtiva aplicada em 08/11/2026 sem modificar comandas. A UI só conseguirá recuperar tarefas após atualização manual do frontend Cloudflare; ainda exige confirmação humana da saída física do papel e controle de duplicidade. Preservar assets acumulados.


## Refrigerantes como complementos (10/11/2026)

- Identidade/preço/apresentação: `drinks-catalog.mjs` compartilhado por catálogo cliente e cotação autoritativa; IDs novos para Coca Zero 220, Fanta 220 e Guaraná Antarctica 200; Coca tradicional 350 conserva identidade. Antigos 220 tradicional/Fanta350 não são relançados.
- Disponibilidade: cada chave `drink_*` usa `item_type=product`, `category_key=extras_drinks`; ausência de linha ou consulta offline mantém bebidas ocultas; `sold_out` mostra sem permitir adicionar. Nenhuma quantidade física é suposta. Loja fechada bloqueia adição.
- Persistência: `order_items.item_type=drink` exige migration `20261110124038_refrigerantes_complementos.sql`; trigger `SECURITY INVOKER` verifica status sob lock compartilhado antes de inserir em qualquer canal. A função pública não ganha permissões de RPC; nenhuma RLS/auth existente foi alterada.
- Pedidos: ambos os handlers usam o mesmo quote; WhatsApp v34 ainda necessita catálogo atualizado + novo módulo. `create-order` candidato também reconhece bebidas e rejeita total desatualizado quando elas existem; gateway produtivo v14 continua inalterado/desativado no pacote. Ativação online exige revisão própria, sem deploy cego da linha cumulativa.
- Carrinho: merge por produto/variante, limite 99, remoção e quantidades existentes, subtotal e frete preservados, reconsulta antes de finalizar; teste de payload misto nos dois entrypoints reais em VM sem rede. Mensagem, admin e comanda usam nome e volume autoritativos sem inferir pagamento.
- Release: backend autorizado antes da liberação; migration começa hidden. Somente após homologação conjunta e confirmação operacional a proprietária libera cada bebida no painel. Pré-requisito não instalado não pode ser declarado integrado em produção.

### Ativação produtiva conferida — 10/11/2026
A migration de bebidas e a complementar de permissões foram aplicadas com autorização. WhatsApp v35 ACTIVE e sete arquivos conferidos; quatro bebidas hidden. Além de PUBLIC, revogar EXECUTE explícito de anon/authenticated na função de trigger (privilégios padrão do ambiente concediam acesso). Sem mudança em RLS, autenticação ou gateway online. Não confundir instalação pronta com disponibilidade física ou validação de impressão.
