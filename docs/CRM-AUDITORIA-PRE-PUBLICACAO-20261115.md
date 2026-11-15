# Auditoria de pré-publicação — CRM Luciane Oliveira Doces (15/11/2026)

**Escopo:** revisão somente leitura de GitHub (PR #62 e bases), Supabase comercial `edqiwvccmboyayojvuea`, funções RPC/Edge, código de UI e disponibilidade. **Nenhum ZIP produzido, nenhuma publicação, nenhum envio e nenhum consentimento alterado nesta auditoria.**

## Verificações positivas
- Projeto Supabase `ACTIVE_HEALTHY`; Edge `crm-whatsapp-webhook` v8 ativa; 57 eventos oficiais de entrada em um único telefone de teste; fluxo de saída ainda não homologado.
- 18.340 eventos associados ao Tintim; atividade capturada, sem prova integral de atribuição.
- `automatic_sends_enabled=false`; 0 tentativas de entrega; outbox: 7.260 `canceled`, 306 `held`. Não interpretar outbox como envio.
- 644 clientes; 659 conversas; 213 follow-ups pendentes; 0 opt-ins `granted` no CRM; 0 eventos de entrada Tintim com `time_basis='provider_timestamp'`.
- RPC `crm_list_opportunities_page` aplicada e testada previamente para 659/659 IDs únicos, 250+250+159; sem `EXECUTE` para `anon` e com gate `crm_require_staff`.
- CI do PR #62 no SHA `badec6639799bfbbefd7303b768773903fdae4fe`: testes CRM, TypeScript isolado e frontend build aprovados. Isso não comprova uso real no Safari nem deploy.
- `menu_availability` tem acesso SELECT autorizado (anon e authenticated) e política de leitura; estado `sold_out` é visível, mas não prova quantidade física.

## Bloqueadores identificados

**P0 — base comercial divergente; não publicar ZIP do PR #62 isoladamente.**
- PR #62 é descendente do PR #61 sobre a linha V4.7.14.1.
- PR #59: imagem Kinder Bueno/Nutella V4.7.14.2.
- PR #60: novos enquadramentos dos Cascões V4.7.14.3.
- `compare_commits` entre PR #62 e PR #60 retornou `diverged`; diferenças relevantes em `app/catalog.ts` e `app/page.tsx`, além de testes.
- Não há prova do Cloudflare Production ID/ZIP/hash atual. A tentativa de consulta pública do domínio não forneceu verificação confiável neste ambiente. Não afirmar que PR #59/#60 foram publicados.
- Imagens de pacotes manuais podem não estar no GitHub; preservar e reconciliar a última fonte ZIP antes de gerar um pacote de publicação.

**P1 — bloqueio de indisponibilidade não é abrangente.**
- `crmCatalogAvailability` em `lib/crm-operacao.ts` só aceita comparação exata do nome normalizado.
- Exemplo real: frontend/código registra Folheado `Folheado com Ninho e Morango`, enquanto `menu_availability` e Edge v46 usam `Folheado — Geleia de Morango com Ninho` para a chave `cascao_folheado_geleia_morango_ninho`.
- Quando não existe correspondência (`null`), `canPrepare` não usa bloqueio de disponibilidade. Portanto o gate visual deixa de reconhecer um item esgotado mesmo quando `menu_availability.status = sold_out`.
- **Correção:** vincular interesse confirmado ao `item_key` inequívoco (SKU); exigir revisão/conferência em correspondência ambígua ou ausente. Status `available` não comprova estoque físico ou quantidade, não gerar escassez automática.
- O bloqueio de catálogo no frontend é apenas consultivo; a revisão assistida em RPC ainda preserva consentimento, janela, resposta, compra e deduplicação.

**P1 — backlog desatualizado, não é fila pronta para enviar.**
- 212 dos 213 follow-ups pendentes já vencidos, 191 vencidos há mais de 1 dia e 126 há mais de 7 dias.
- 70 conversas abertas/ativas têm última entrada observada nas últimas 48h. Recência observada não comprova automaticamente timestamp original do provedor.
- Priorizar recentes com interesse real, compra não confirmada e elegibilidade documentada; arquivar/reavaliar lembretes antigos sem dispará-los indiscriminadamente.

**P1 — inconsistência de versões de pedido.**
- Edge `create-whatsapp-order` ACTIVE v46 no Supabase, posterior à v38 descrita no checkpoint da conversa; diferenças de nomes de produto devem ser reconciliadas.
- Sem alterar Edge ou catálogo nesta auditoria. Conferir paridade SKU/preço/nome com frontend publicado e fazer teste controlado do fluxo de cotação, sem pedido real não autorizado.

**P1 — requisitos pendentes de operação.**
- 0 opt-ins comprovados no CRM; não preencher artificialmente a base; recuperar evidências válidas de conversas/site quando existirem.
- Ausência de timestamp original do Tintim na tabela não permite declarar todos os históricos elegíveis; há mensagens Meta recebidas para teste específico.
- Fluxo assistido ainda não foi testado sob login real/Safari iPhone; abrir WhatsApp ≠ mensagem enviada.
- Tintim continua produzindo eventos, mas atribuição comercial pós-inscrição da WABA ainda não está homologada.
- Não houve acesso a um Deployment ID/hash da Cloudflare; o código aprovado pelo CI não equivale à versão pública.

## Decisão de release
**BLOQUEADO PARA ZIP PUBLICÁVEL nesta fotografia.** Próximo incremento recomendado, nesta ordem:
1. Conciliar linha comercial PR #59/#60 + PR #61 legais + PR #62 CRM, preservando assets do ZIP realmente publicado.
2. Corrigir vínculo SKU/disponibilidade e adicionar casos de teste Folheado e nomes ambíguos.
3. Checar fluxo de lista completa, revisão assistida, registro manual, resposta, compra e bloqueios em ambiente autenticado; CI/build e Safari físico.
4. Confirmar Cloudflare Production ID/ZIP de origem antes de gerar ZIP final completo e verificar arquivos, fotos e checkout.

**Nenhuma alteração de produção foi feita por esta auditoria.** Migração paginada anterior segue aplicada e o transporte automático segue desligado.
