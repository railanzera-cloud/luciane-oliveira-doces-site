# Memória permanente de decisões — Site Comercial Luciane Oliveira Doces

**Instituída em 05/11/2026** · Não é inventário de tarefas nem prova de deploy.  
Fonte: Prompt Mestre Oficial **4.0 fornecido pelo proprietário nesta conversa**, documentos e commits do repositório consultados em 05/11, mais critérios de produto já explicitamente aprovados nas respectivas etapas. Ao contrário de uma gravação integral dos chats arquivados, estes registros têm **proveniência limitada à documentação/repositório acessíveis** e decisões dadas agora. Não alegar que cada imagem/conversa histórica foi revisada.

**Como manter:** novas decisões ganham ID, data, fonte, motivação, alternativa rejeitada, efeito UX/arquitetura, status (proposta / aprovada / implementada / validada / publicada) e provas. Não apagar uma decisão antiga por ter sido atualizada; criar adendo e referenciar a anterior. Um commit não é aprovação visual nem deploy.

## D-C01 — Evoluir um único produto, não ilhas de interface

- **Motivo:** alterações aparentemente simples (ex.: adicionar Trufadas) já deixaram diferenças de produtos e variantes entre vitrine e função de pedidos, causando falhas reais.
- **Decisão:** toda solicitação identifica o **percurso inteiro afetado**, antes de declarar concluída. Preços/variantes/identidades devem ser compatíveis entre catálogo, UI, carrinho, backend de pedido, estoque, painel e cozinha.
- **Rejeitado:** “o produto apareceu no catálogo, então está implementado”; refazer sistemas paralelos por conveniência.
- **Evidência:** `docs/INCIDENTE-CHECKOUT-TRUFADAS-20261101.md`: Edge Function v24 rejeitava variantes P/M/G; hotfix posterior documentado. `docs/TRUFADAS-PMG-PLANO-20261101.md`.
- **Estado:** decisão aprovada; **cobertura precisa ser aplicada em cada alteração nova**, não conferida apenas uma vez.

## D-C02 — Direção visual editorial e artesanal, sem recomeçar a cada conversa

- **Motivo:** o proprietário usa muitas conversas com refinamentos graduais e quer subir de qualidade, não retornar a cartões e posicionamentos antigos.
- **Decisão:** atmosfera chocolate/creme/cappuccino/cobre discreto; fotografia autêntica em destaque; hierarquia editorial, respiro equilibrado, interações com foco, leveza e CTA claro. Registrar aprovações por componente em `REFERENCIA-VISUAL-UX.md`.
- **Rejeitado:** regressar a lista branca ou adotar mudanças cosméticas sem problema demonstrado; ornamentação que ocupa espaço de escolha.
- **Fontes:** `ESTADO_ATUAL_VITRINE.md`; `docs/VITRINE-PREMIUM-REFINO-EQUILIBRIO-20261102.md`; `docs/VITRINE-COLECOES-20261102.md`.
- **Estado:** diretriz permanente aprovada; versões visuais **variam por branch e deployment**.

## D-C03 — Fotografias reais são ativos protegidos

- **Motivo:** fotos de potes/fatias e recortes aprovados já exigiram recuperação de ZIP anterior; gerar ou substituir sem necessidade introduz regressão perceptível e risco de falsa representação.
- **Decisão:** preservar assets reais com bytes/identidade no repositório, correspondência ao sabor/embalagem e enquadramento. Mudanças de CSS/corte só no escopo pedido e com comparação visual.
- **Rejeitado:** IA para recriar produto real sem autorização, cortes que escondam embalagem, misturar fotos de sabores e materializar apenas no ZIP.
- **Fonte:** `ESTADO_ATUAL_VITRINE.md` e `BOUTIQUE_EDITORIAL_PREVIEW_CONTINUIDADE.md` (histórico com recortes aprovados), `docs/ESTADO_INTEGRADO_COMERCIAL.md` (integração dos cinco WebP).
- **Estado:** referência aprovada para ativos específicos; verificar caminhos e SHA antes de reutilizar.

## D-C04 — Vitrine contínua e compacta favorece escolhas, não ruído

- **Motivo:** opções de categorias antes eram separadas por instruções longas, duplicações e foco exagerado de um único destaque.
- **Decisão:** entrada clara para Trufadas, Gourmet e Fatias, CTAs reais, imagens e títulos próximos; instruções secundárias depois da escolha; hierarquia pode destacar Trufadas **quando justificado**, sem bloquear as outras.
- **Rejeitado:** textões no topo, títulos duplicados, cards igualmente gigantes por padrão ou falsa urgência sem evidência.
- **Fonte:** `docs/VITRINE-COLECOES-20261102.md`, `docs/VITRINE-PREMIUM-RECONSTRUCAO-20261102.md`, `docs/VITRINE-PREMIUM-REFINO-EQUILIBRIO-20261102.md`.
- **Estado:** implementado em candidatas ancestrais da base integrada verificada em 05/11; **aprovação visual atual de produção ainda requer confronto com a versão publicada**.

## D-C05 — A rolagem deve revelar o próximo controle acionável

- **Motivo:** visitantes escolhiam um tamanho Gourmet ou tocavam um CTA e eram levados a uma seção com título/imagem, sem ver onde configurar recheio/quantidade.
- **Decisão:** scroll contextual para cartão de tamanho e primeira escolha acessível; em viewport curto priorizar primeiro controle útil; respeitar cabeçalhos/sticky e `prefers-reduced-motion`. Não presumir que rolagem suave por si só melhora conversão.
- **Rejeitado:** ir a uma âncora genérica que deixa o visitante preso, rolar para o topo decorativo da categoria.
- **Fonte:** `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md`, cabeçalho 03/11 de `docs/ESTADO_INTEGRADO_COMERCIAL.md`.
- **Estado:** implementação candidata com teste `tests/gourmet-rolagem-contextual-20261103.test.mjs`, workflow específico aprovado no SHA `62f7780...`; Safari físico requer evidência própria.

## D-C06 — Gourmet precifica pelo grupo mais alto e promoções têm regras reais

- **Motivo:** preço variável conforme grupo de recheio já foi confundido com soma de adicionais e campanha temporária gerou telas redundantes e risco de preço divergente.
- **Decisão:** grupo mais caro define preço do pote; catálogo, UI e backend têm de concordar; promoções expiram por data/horário `America/Belem` e não devem reabrir por copy antiga.
- **Rejeitado:** soma de adicionais, valor riscado sem desconto verdadeiro, botão “promoção” sem regra backend, reativação automática do desconto após prazo.
- **Fonte:** `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md`, `docs/PROMO-GOURMET-FINADOS-20261102.md`, `supabase/functions/_shared/popcorn-promotion.mjs`.
- **Estado:** regra permanente e campanha histórica; **preços/ações vigentes devem ser consultados, não herdados deste documento**.

## D-C07 — Trufadas P/M/G são SKUs reais, não só opções visuais

- **Motivo:** três sabores × três tamanhos e estoques separados precisam ser reconhecidos no contrato de pedido; IDs legados não devem ser alterados, e embalagem P/M/G não pode ser inferida de 400 ml histórico.
- **Decisão:** cada SKU possui preço, estoque e identidade próprios. Antes de disponibilizar, conferir migration real, Edge Function, disponibilidade e estoque físico autorizado. Loja fechada ≠ item esgotado ≠ estoque não consultado.
- **Rejeitado:** mapear tamanho novo para variante antiga, reduzir estoque de SKU errado, inventar quantidade/gramagem, perder pedidos históricos.
- **Fonte:** `docs/TRUFADAS-PMG-PLANO-20261101.md`, `docs/TRUFADAS-CONFIGURADOR-PREMIUM-20261102.md`, `docs/INCIDENTE-CHECKOUT-TRUFADAS-20261101.md`.
- **Estado:** contrato integrado em candidato; há **registro de hotfix Edge v25 produtivo** na data do incidente, enquanto outros documentos históricos ainda dizem migration pendente. Resolver conflito por inspeção real atualizada, sem assumir nenhum desses como presente.

## D-C08 — A tela de finalização WhatsApp precisa ser recuperável

- **Motivo:** um cliente podia registrar o pedido e abrir “Ver pedido” e não encontrar caminho para enviar a mensagem original, causando abandono.
- **Decisão:** ação principal compacta e direta “Enviar pedido pelo WhatsApp”, conteúdo condicionado ao método (Pix/cartão/dinheiro), recuperação de sessão quando número/token correspondem e assistência sem expor link errado quando não correspondem.
- **Rejeitado:** muitos botões com destinos equivalentes, mostrar chave Pix fora de Pix, criar pedido duplicado para recuperar mensagem, considerar abertura do WhatsApp prova de envio.
- **Fonte:** `docs/WHATSAPP-FINALIZACAO-RECUPERAVEL-20261102.md`.
- **Estado:** implementado na linha candidata; exigir verificação de Safari/iPhone real e contrato de pedido antes de afirmar produção.

## D-C09 — O painel deve traduzir estoque físico em disponibilidade operável

- **Motivo:** para Trufadas, interface antiga exigia que a proprietária somasse fisicamente unidades reservadas ao editar o total; mostrava nove editores extensos.
- **Decisão:** apresentação por categoria/sabor/tamanho com um editor ativo, quantidade **livre** informada e `total = livre + reservado`, reconsulta antes de escrever, revisão e proteção de rascunho; não reinterpreta a reserva como pagamento.
- **Rejeitado:** UI que exige contas manuais, alteração de SKU com fonte de reserva desatualizada, liberar item ao alterar apenas o visual.
- **Fonte:** `docs/ADMIN-DISPONIBILIDADE-PREMIUM-20261102.md`, `lib/trufadas-stock-calculation.mjs`, `tests/admin-disponibilidade-premium-20261102.test.mjs`.
- **Estado:** candidata ancestral à base de 03/11; não prova estado publicado.

## D-C10 — A cozinha é consequência do pedido, não mecanismo de confirmar pagamento

- **Motivo:** integração QZ/Windows/POS-58 exige aceite/fila/assinatura/reconexão, com diferentes situações de Pix pendente e pagamento online.
- **Decisão:** preservar semântica de `pedido recebido/confirmado operacionalmente` diferente de `Pix confirmado`; não imprimir novamente automaticamente com resultado físico incerto; idempotência, diagnósticos e rastreio.
- **Rejeitado:** marcar como pago quando a comanda imprime, considerar `printed` prova de papel físico, remover guardas para solucionar atraso, aceitar pedido de teste sem estoque.
- **Fonte:** `docs/COZINHA-AUTOMATICA-CONTINUIDADE-20261017.md`, `docs/COZINHA-QZ-INCIDENTE-1544-20261102.md`, `docs/COZINHA-QZ-DIAGNOSTICO-INTERMITENCIA-20261031.md`.
- **Estado:** contratos operacionais com checkpoints vários; hardware Windows e produção precisam de prova independente.

## D-C11 — CRM e mensuração não devem fabricar compras nem autorizar envios

- **Motivo:** Tintim e eventos Meta indicam origem/interesse/resposta, mas não necessariamente consentimento, venda ou pagamento; repetição cria contatos/abordagens indevidas.
- **Decisão:** separar status, mensagem e pessoa; dedupe por evento; abertura do WhatsApp ≠ mensagem enviada; follow-up assistido considera consentimento, compra e resposta; observabilidade oficial e disparos automáticos exigem gates próprios.
- **Rejeitado:** `Purchase` em clique, atribuição orgânica por desconhecido, disparo automático apenas por prazo, marcar pagamento por etiqueta CRM.
- **Fonte:** `docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md`, `docs/CRM-META-OBSERVABILIDADE-CONTINUIDADE-20261026.md`, `docs/FOLLOWUP-CHECKLIST-ATIVACAO-20261031.md`.
- **Estado:** código candidato com ativações/consentimentos que devem ser reconfirmados; sem inferir deploy por existência de Edge Function.

## D-C12 — Versão de código, pacote, migração e produção nunca são o mesmo estado

- **Motivo:** `main` ficou muito atrás da linha de desenvolvimento; há documentos de datas diferentes com conclusões aparentemente conflitantes; ZIP local pode não conter fotos presentes só em conversa anterior.
- **Decisão:** preservar SHA, base ancestral, CI do commit, migrações instaladas, Edge Function atual, ZIP com inventário/hash e deployment real **como evidências separadas**. Se uma linha de alteração conflitar, inspecionar os diffs antes de integrar.
- **Rejeitado:** “a última branch é automaticamente a produção”, “o ZIP de ontem é o HEAD”, mesclar branches cegamente, atualizar README para relatar deploy não comprovado.
- **Prova observada em 05/11:** `main` no SHA `26730be48be7f694ed92d9a23b0b8789bdbb7239`, base cumulativa `work/gourmet-rolagem-contexto-premium-20261103` no SHA `62f7780c6d6ede5dceea9eba19212e67cd20f77a`, **715 commits à frente** no histórico `main...branch`. O backend/Cloudflare são independentes.
- **Estado:** regra de governança adotada; last-mile produtivo precisa ser lido/validado em cada release.

## D-C13 — O modelo visual aprovado não é um template rígido para toda categoria

- **Motivo:** Gourmet, Trufadas e Fatias têm escolhas e restrições diferentes; a mesma hierarquia de três etapas poderia alongar desnecessariamente outras jornadas.
- **Decisão:** design system consistente, **componentes adaptados ao conteúdo**. Trufadas: sabor → tamanho → quantidade. Gourmet: tamanho → grupo/recheios → quantidade. Fatias: disponibilidade por sabor/unidade e regras de pré-reserva. CTA e breadcrumb seguem destino real.
- **Rejeitado:** colocar controles irrelevantes em todas as categorias, tratar toda categoria como campanha prioritária, mudar cabeçalho compartilhado sem solicitação.
- **Fonte:** `docs/TRUFADAS-CONFIGURADOR-PREMIUM-20261102.md`, `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md`, `docs/REFINAMENTOS-CALDA-FINALIZACAO-2026-09-29.md`.
- **Estado:** princípio aprovado; registrar aprovações específicas em `REFERENCIA-VISUAL-UX.md`.

## D-C14 — Memória durável para trabalhar sem recontar centenas de ajustes

- **Motivo:** conversas longas e frequentes mudanças de prompt perdem o estado e deixam os assistentes divergir mesmo diante de pedidos semelhantes.
- **Decisão de 05/11/2026:** versionar Prompt Mestre, Memória de Decisões, Referência Visual, Matriz de Impactos e Checkpoint Vivo; `AGENTS.md` e `README.md` apontam ao conjunto. A cada mudança relevante, registrar por quê, quais partes se alteraram, provas e próximo passo.
- **Rejeitado:** gerar prompt novo por reflexo a cada chat, arquivar apenas listas de commits, tratar conversa/áudio como única fonte de decisão.
- **Estado:** política documental instituída em branch isolada; não é mecanismo mágico de memória nem prova de que todos os chats apagados foram lidos.

## Apêndice — detalhes que não devem virar “regras eternas”

- Data, preço e prazo da promoção de Finados de 02/11 são **históricos**; não usar como promoção atual.
- Quantidade de estoque das Trufadas e fotografias de ofertas específicas requerem confirmação atual.
- Versões v24/v25/v26 da Edge `create-whatsapp-order` descrevem eventos **em momentos diferentes**; verificar o deploy real antes de afirmar qual existe agora.
- A aprovação visual v10.7 em `ESTADO_ATUAL_VITRINE.md` é válida para **aquele enquadramento/foto**, não significa que todas as páginas 2026-11-03 herdaram a mesma homologação Safari.
- Novo documento não substitui a autorização humana para mudanças em dados, publicação, webhooks, QZ ou pagamento real.

## Modelo de manutenção

```md
### D-CXX — Nome
- Quando / origem / confiabilidade:
- Problema observado e impacto:
- Solução escolhida e por quê:
- Alternativa rejeitada e risco prevenido:
- UX, arquivos, RPCs, contratos afetados:
- Prova: branch, SHA, testes, screenshots aprovados e deployment (se houver):
- Estado por dimensão: decidido / implementado / validado / aprovado visualmente / publicado:
- Lacuna e gatilho para reavaliar:
```


## D-C15 — Bairro primeiro, tarifa pelo servidor; entrega com exceções explícitas

- **Origem:** relato do proprietário em 05/11/2026 sobre cliente informando bairro especial na opção genérica R$ 8; aprovação em conversa para busca de localidades e validação no backend.
- **Decisão:** cliente pesquisa um bairro/localidade identificada, nunca escolhe diretamente o valor da taxa. A tarifa deriva do ID estável vinculado ao contrato do servidor, com R$ 8 para região urbana e exceções comerciais registradas. Áreas ainda sem correspondência suficiente oferecem confirmação pelo WhatsApp, **não um pagamento supostamente validado**.
- **Rejeitado:** nome livre determinando frete, GPS obrigatório, trocar preços de todas as zonas por distância em linha reta, supor que todo bairro oficial custa R$ 8, considerar um nome parecido como local correto sem escolha consciente.
- **Implementação candidata:** `supabase/functions/_shared/delivery-localities.mjs`, `components/delivery-locality-picker.tsx`, `app/page.tsx`, `commerce-catalog.mjs`. Preserva IDs das 21 zonas existentes, distingue bairros de localidades especiais e envia `locality_id` em pedidos pelo site e WhatsApp.
- **Limites e estado:** 114 nomes pesquisáveis; 20 especiais com valores atuais de código, 59 mapeamentos urbanos **candidatos** pela regra geral do proprietário, 35 pendentes de confirmação. A segurança definitiva contra clients legados depende de rollout backend → frontend → flag `DELIVERY_REQUIRE_LOCALITY_ID`, sem quebrar pedidos abertos. Não há garantia de localização física real sem geocodificação. Estado: **aprovado em conceito e implementado em branch candidata**, QA/revisão visual e publicação devem ser registrados separadamente.
- **Detalhes e fontes:** `docs/ENTREGA-BAIRROS-BUSCA-20261105.md` e teste `tests/delivery-localities-20261105.test.mjs`; não alterar histórico financeiro/estoque para cumprir esta decisão.
