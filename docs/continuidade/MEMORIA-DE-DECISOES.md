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
- **Limites e estado (incremento posterior de 05/11):** 114 nomes pesquisáveis; 20 regiões especiais conservam preços históricos do código e cinco exemplos urbanos foram mencionados pelo proprietário como dentro da cidade (R$ 8). **Outras 54 associações urbanas candidatas e 35 localidades sem tarifa — 89 ao todo — estão marcadas "A confirmar" e não podem gerar cobrança automática no novo contrato.** Registrar cada homologação antes de liberar cotação. A proteção definitiva contra payloads legados depende de rollout backend → frontend → flag `DELIVERY_REQUIRE_LOCALITY_ID`, sem quebrar pedidos abertos. Não há garantia de localização física real sem geocodificação. Estado: **aprovado em conceito e implementado em branch candidata**, QA/revisão visual e publicação devem ser registrados separadamente.
- **Detalhes e fontes:** `docs/ENTREGA-BAIRROS-BUSCA-20261105.md`, `docs/ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md` e teste `tests/delivery-localities-20261105.test.mjs`; não alterar histórico financeiro/estoque para cumprir esta decisão.


## D-C16 — Taxas confirmadas pelo proprietário em áudio/texto (05/11/2026)

- **Decisão comercial expressa:** os 33 locais priorizados no relatório de histórico foram revisados pelo proprietário. Os **24 candidatos urbanos** e os **9 nomes sem vínculo anterior** foram classificados: **28 a R$ 8** e **5 a R$ 10**. Exceções: **Ouro Preto**, **Juparanã (bairro)**, **Aragão**, **Laércio Cabeline** e **Sidney Rosa** a **R$ 10**; todos os demais 28 da lista a R$ 8.
- **Distinção obrigatória:** **Juparanã Empresa** é diferente do bairro **Juparanã**; ambos R$ 10, com IDs/zones próprios. **Laércio Cabeline II** não foi aprovado automaticamente. Preservar Jaderlândia/Jardelandia/Jardim Elândia como entradas distintas, até evidência de sinônimos.
- **Reconciliação dos números do D-C15:** 114 nomes pesquisáveis, **58 cotáveis (20 especiais legados, 5 urbanos anteriores, 33 novos confirmados)**, **56 pendentes (30 urbanos candidatos e 26 sem associação)**; frontend e backend têm **26 zonas tarifárias**. O checkpoint D-C15 de 25/89 e 21 zonas é HISTÓRICO, não o estado atual.
- **Efeito técnico:** `delivery-localities.mjs`, `commerce-catalog.mjs`, `app/catalog.ts` e testes atualizados; preços de pedidos anteriores **não** são reescritos. Não há autorização implícita para publicar Edge/Cloudflare, ativar flag ou fazer merge somente porque a tabela foi confirmada.
- **Evidência:** `docs/ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md` e CI do HEAD da PR #6. `docs/ENTREGA-RELEASE-GATE-20261105.md` descreve o corte coordenado e o rollback.


## D-C17 — Liberação progressiva de localidades e compatibilidade do checkout legado (05/11/2026)

- **Problema encontrado:** o frontend novo envia `locality_id` e o backend bloqueia os 56 destinos pendentes; abas antigas não enviam esse identificador. Ativar a obrigatoriedade imediatamente após o backend quebraria pedidos antigos, inclusive de bairros aprovados.
- **Decisão técnica implementada:** criar classificação *somente por correspondência exata ou alias* via `deliveryLegacyReviewState` (`quoted`, `pending`, `ambiguous`, `unknown`) e flag **`DELIVERY_LEGACY_REVIEW_GUARD`**. A flag está **desligada por padrão**; quando autorizada, bloqueia apenas nomes conhecidos não homologados ou ambíguos enviados por checkout antigo, sem impedir antigas abas com bairros confirmados. Os nomes desconhecidos continuam aceitos nessa etapa intermediária; a flag final `DELIVERY_REQUIRE_LOCALITY_ID` é a única que exige ID para todas as entregas.
- **Princípio de lançamento parcial:** não é necessário transformar as 56 pendências em preços inventados para oferecer as **58 cotáveis**. A publicação parcial só pode ser avaliada após aceitar operacionalmente a confirmação manual para as pendentes e homologar Safari, Edge, rollback, pagamento, estoque e WhatsApp. Não é uma autorização de publicação já concedida.
- **Rejeitado:** aplicar a flag estrita no primeiro deploy, aceitar o nome pendente como R$ 8 sem verificação, declarar todos os nomes desconhecidos bloqueados no modo intermediário ou afirmar que uma região digitada corresponde à localização física.
- **Evidência:** [CI do código `efe7f453`](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42094262731) aprovou 18 testes de entrega e 732 testes comerciais, build, Deno check e guarda de novos erros TS. `docs/ENTREGA-RELEASE-GATE-20261105.md` contém a ordem de ativação e rollback.


## D-C18 — Fonte de rollback verificável antes do corte de Edge (05/11/2026)

- **Motivo:** as Edge produtivas v14 e v26 não têm locality_id, e a v14 de Mercado Pago também difere em catálogo/promoções; rollback só por número de versão não é seguro.
- **Decisão:** versionar a árvore exata dos arquivos retornados pelo Supabase comercial, com hashes e teste de integridade/imports, conservando 21 preços/zonas legados e a cotação WhatsApp de 40 combinações. Antes do deploy reconfirmar hash/versão; mudança produtiva = novo NO-GO até reconciliação.
- **Rejeitado:** publicar ambas como simples atualização de frete, confiar em main ou ZIP como backup, reverter funções para versões antigas enquanto o frontend novo requer locality_id.
- **Estado:** código de rollback e teste preparados na branch; deploy, homologação em Safari físico, pagamentos e restauração não executados. CI do novo SHA precisa ser consultada. Referências: `docs/EDGE-ROLLBACK-BUNDLE-20261105.md` e `docs/edge-release/rollback/20261105/manifest.json`.


## D-C19 — Corte limitado ao canal WhatsApp, sem mexer no gateway Mercado Pago (05/11/2026)

- **Motivo:** o pacote comercial anterior mais recente disponível para inspeção (03/11) tinha `siteOrderingEnabled=false` e `mercadoPagoPublicKey=''`, enquanto o backend `create-order` v14 possui diferenças de promoções e catálogo além das entregas.
- **Decisão:** implantação autorizada e efetivada somente da função WhatsApp `create-whatsapp-order` v27, preservando as fontes v26 para rollback; manter `create-order` v14 intacta. O ZIP conectado replica o perfil **WhatsApp-only do pacote de referência** e é oferecido ao proprietário para Cloudflare manual, com identificação clara do SHA/CI e das restrições. A versão efetivamente publicada no Cloudflare **não foi verificada**.
- **Não fazer:** presumir pagamentos online ativos e alterá-los, forçar `SITE_ORDERING_ENABLED=true` sem public key test validada, ativar flags estritas ou tentar rollback backend antes de retornar frontend antigo.
- **Evidência:** CI 42107709877, Supabase v27 SHA256 `3a9f2b6d683e6f675bbbd81dc1bf38edaf7cce94229a4de2a9b35b3b5469c3e3`, ZIP SHA256 `c634e77541de945602f1451469772ea21db3751f17e642b64a4c3fd2a58b3669`.


## D-C20 — Homologação progressiva dos bairros efetivamente demandados (05/11/2026)

- O proprietário confirmou **Módulo I (Centro)** e **Trecho Seco** dentro da cidade, com frete **R$ 8,00** para ambos. `Centro` é alias do Módulo I; `Trecho Seco` sai da lista sem zona e é vinculado à zona urbana existente. Não cria zona nova nem modifica valor da zona `cidade`.
- Política: o proprietário pode confirmar os bairros pendentes em lotes por frequência real de pedidos; **não** atribuir R$ 8 por pressuposição de urbanidade. Após estas duas confirmações, 60 nomes passam a ser cotáveis e 54 continuam pendentes.
- Para reduzir deploys desnecessários, deixar alterações do novo lote preparadas na branch e aguardar as demais tarifas fornecidas na conversa antes de trocar novamente o bundle de Edge e o ZIP de Cloudflare. Não alterar pagamentos, estoque ou Luciane Gestão.


## D-C21 — Tarifas dos grupos numerados e filtro de referências subordinadas (05/11/2026)

- Confirmações comerciais do proprietário: R$ 8 para Promissão I–IV, Camboatã I–III, Jardim Camboatã/II, Uraim I–III, Módulos I/II e Parque IV; R$ 10 para Laércio Cabeline/II e Sidilândia I/II, além das exceções já aprovadas (Aragão, Açaizal, Sidney Rosa, etc.). A regra vale **somente para as localidades listadas**, sem usar proximidade de nomes como autorização genérica para criar tarifas. Camboatã III tem ID novo porque foi mencionado pelo proprietário.
- **Identidade versus preço:** Sidilândia I e II mantêm ID/nome próprios e usam a zona comercial de R$ 10 do Açaizal; não se tornam Sidney Rosa. O documento municipal relaciona Sidilândia I e II a Açaizal e Jardim Camboatã a Camboatã, mas **não define os preços**.
- **Checkout:** os IDs de Alan Kardec, Condomínio Residencial Alto do Lago, Condomínio Residencial Tropical e Distrito Industrial Moveleiro são preservados para histórico/recuperação de dados, porém os nomes deixam de aparecer como bairros autônomos no seletor. Ao buscá-los, o site orienta escolher o bairro e informar o local no Complemento. Os nomes restantes sem tarifa não se tornam R$ 8 automaticamente.
- Após os ajustes, matriz interna esperada: 115 IDs; 71 cotáveis, 44 pendentes. **Ainda não há implantação destas mudanças** no Supabase WhatsApp v27 nem no Cloudflare. Agrupar publicação com as confirmações finais e validar backend + ZIP no mesmo corte.


## D-C22 — Corte WhatsApp v28, ZIP Cloudflare manual, rollback v27 preservado (05/11/2026)

- Após validação no commit `93674bb33e10eaa80e1e0651ba5e12860e503de2` (CI 42119880626 SUCCESS), foi implantada somente a Edge de pedidos WhatsApp v28, com `delivery-localities.mjs` atualizado, sem alterar handler principal, outros compartilhados, pagamentos ou SQL. Conferidos todos os arquivos instalados, hash `4280c753e967c42ba07c5ce359afda9a13bba9139f3323edd8c2fdf6b950da94`.
- O código exato anterior da v27 foi arquivado em `docs/edge-release/rollback/20261105/create-whatsapp-order-v27/` antes do corte. ZIP manual Cloudflare `luciane-oliveira-doces-bairros-agrupados-20261105-cloudflare.zip` corresponde ao código testado e ao backend, checksum `fa0f28fd8c28eecded874edbcf6c7d333ca47d0658d235824d1dbdc87ee6990d`; produção Cloudflare ainda não foi alterada pelo agente.
- Não inferir aprovação de Safari físico ou comportamento de pedidos reais a partir da CI. As flags estritas seguem sem alteração. Reverter frontend antes de reverter Edge se necessário.

## D-C23 — Correção prioritária de Juparanã, mantendo Empresa separada (06/11/2026)

- A decisão expressa atual substitui o valor anterior de Juparanã bairro em D-C19: **bairro R$ 8; Juparanã Empresa R$ 10**.
- Permanecem IDs `juparana` e `juparana-empresa`, zonas distintas, nenhuma migração de dados. O preço R$ 8 está na zona própria do bairro, sem fundir com `cidade` e sem redefinir a zona da empresa.
- Código e testes atualizados nos contratos frontend/backend; não mexer na loja Gestao, no gateway Mercado Pago, em pagamentos históricos nem em taxas de outros bairros.
- **Evitar divergência entre site e servidor:** a versão anterior do frontend calcula R$ 10 para o bairro; o backend novo precisa cobrar R$ 8 e rejeita total divergente. Não implantar Edge v29 antecipadamente enquanto o usuário não estiver pronto para subir o ZIP atualizado; publicar ambos em uma janela curta e verificar pedido real logo após.

## D-C24 — Complementos contextuais sem criar uma segunda finalização (06/11/2026)

- **Origem e motivação:** após vídeos reais de navegação no Instagram, proprietário explicou que o carrinho tem atalhos permanentes de recomprar/adicionar e que o aviso de item adicionado oferece atalhos **temporários**, apagados ao escolher entrega ou retirada. A categoria Fatias estava propositalmente esgotada e não se tratava de defeito.
- **Decisão autorizada:** melhorar a apresentação dos atalhos temporários como recomendações contextuais discretas, integradas à confirmação do último item, com fotografias reais já versionadas, microtexto sem pressão e próxima etapa do recebimento imediatamente disponível. Durante a confirmação, ocultar somente o conjunto permanente de atalhos do carrinho para não repetir as mesmas ações; restaurá-lo automaticamente quando a confirmação for dispensada. Não duplicar CTA de pagamento/checkout.
- **Critério inteligente:** prioridade de categorias diferentes antes da repetição; links apenas para produtos habilitados, com estoque/variante selecionável conforme estados já consultados. Trufadas usam o gate de estoque existente. Categorias esgotadas permanecem esgotadas — não simular escassez nem sugerir compra impossível. Fotografias: Gourmet v10.7, Fatias editorial e Trufadas Ninho já presentes no repositório.
- **Contrato preservado:** SKU, preço, frete, estoque, formulário, pagamento, registro de pedido, sessão, CRM, QZ, Meta e botão flutuante inalterados. Atalhos continuam acionando `startAnother`/`startAnotherCrocantes`, sem adicionar produtos ou emitir pedidos automaticamente.
- **Prova e estado:** PR [#7](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/7), branch `work/checkout-complementos-contextuais-premium-20261106`, testes unitários e oito cenários WebKit (320/375/390/430, Fatias com e sem disponibilidade) registrados na CI [42280557269](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42280557269) antes do ajuste tipográfico final. Design **candidato**, aprovação visual do novo resultado e produção Cloudflare **não presumidas**.
- **Alternativas rejeitadas:** grande vitrine extra dentro do checkout, fotos artificiais, ações que inserem produto sem escolha, novos pop-ups, reescrever a home ou interpretar “esgotado hoje” como falha.


## D-C25 — Revisão interativa de sabores Gourmet sem nova etapa (06/11/2026)

- **Decisão autorizada:** aprofundar configurador Gourmet, priorizando clareza de tamanho → sabores → quantidade e acabamento premium sem reconstruir o layout, a fotografia, a precificação ou o CTA flutuante aprovados.
- **Refinamento escolhido:** transformar as etiquetas já existentes em “Sua combinação” em ações conscientes de remoção de cada sabor selecionado, aproveitando **exatamente a mesma função** de seleção/desmarcação usada pelos checkboxes. O contador já existente passa a mostrar também uma trilha discreta de progresso de 2/3 sabores, segundo o tamanho realmente escolhido.
- **Por que não adicionar novo painel:** preço e foto continuam no preview aprovado; o resumo segue no lugar onde já existia, sem duplicar orçamento, criar ofertas, coletar outros dados ou acrescentar passos. Não exibir uma falsa composição de sabores na imagem nem inferir volumes.
- **Contratos protegidos:** 500/750ml/1L, limites 2/2/3, preço do grupo mais alto sem soma de adicionais, promoções somente reais, indisponibilidade, itens no carrinho, botão flutuante, rolagem contextual, entrega, WhatsApp, Supabase/Edge, estoque, Meta e impressão. A remoção pode deixar a etapa 3 bloqueada até que exista pelo menos um sabor; isso é o comportamento comercial já vigente.
- **Estado:** implementação isolada em `work/gourmet-progressao-revisao-premium-20261106` / PR #8. A aprovação desta direção **não significa** homologação visual em Safari real ou publicação Cloudflare; conferir QA e apresentação antes de enviar novo pacote.

## D-C26 — Comunicação do maior grupo no preço Gourmet (06/11/2026)

- **Regra reafirmada pelo proprietário:** o preço do pote inteiro é definido pelo **grupo de sabor mais caro da seleção**, sem somar o preço dos recheios. Exemplo do pote 1 litro (sem promoção): Leitinho R$ 49; Leitinho + Ovomaltine R$ 49; Leitinho + Nutella R$ 58. Essa precificação já estava correta e **não foi alterada**.
- **Decisão de UX:** preservar a referência por sabor e o valor atual do pote, alterando apenas a microcopy do selo de efeito da seleção: primeiro sabor de preço-base “Preço base”; primeiro sabor especial “Pote fica por R$ X”; outro sabor sem aumento “Mantém R$ X”; outro sabor que eleva o grupo “Pote vai para R$ X”. Rótulos de acessibilidade explicam que o total mantém ou passa a custar determinado valor; nunca dizer apenas “gratuito”/“Sem acréscimo” isoladamente.
- **Escopo técnico:** `app/page.tsx`, sem ajustes no catálogo, funções Supabase, checkout, carrinho, promoções, disponibilidade, fotos ou CSS. Candidato em `work/gourmet-clareza-impacto-preco-20261106` / PR #9, derivada da revisão Gourmet PR #8.
- **Status:** código e QA automatizados aprovados; publicação Cloudflare e avaliação final em Safari/Instagram físico continuam distintas.

## D-C27 — Continuação opcional de sabores Gourmet sem atrito (06/11/2026)

- **Decisão aprovada pelo proprietário:** copy exata `Escolha de 1 até 2 sabores. Você decide quantos combinar.` (limite 3 para o pote de 1 litro). Um sabor sempre constitui escolha válida, sem obrigação de completar 2/3 nem alterar preços.
- **Experiência:** compactar o resumo de sabores editável para `Seus sabores`, mantendo os chips removíveis, com alvo de toque de 44px e sem contagem/tip extra redundante. Não descartar a utilidade da revisão de sabores selecionados.
- **Navegação:** a barra flutuante existente passa a exibir `Continuar com N sabor(es)` somente enquanto o cliente está visualizando a grade, escolheu pelo menos 1 sabor válido e menos que o limite, e ainda não há botão de continuação ou quantidade acessível na área visível. A ação apenas rola até quantidade usando `gourmet-quantity-action`. O limite preenchido conserva o avanço automático original. Não há CTA adicional permanente ou finalização direta.
- **Segurança e isolamento:** não alterar catálogo, regra do maior grupo de preço, promoções, estoque, abertura de pedidos, Meta, WhatsApp, Supabase, CRM, cozinha nem Luciane Gestão. Implementação exclusivamente frontend e QA, em `work/gourmet-continuar-sabor-unico-20261106` / PR #10.
- **Aceite:** funcionamento e WebKit isolado homologados; estética final em Safari/Instagram físico e Cloudflare de produção ainda dependem de avaliação/publicação do proprietário.

## D-C28 — Recuperar profundidade editorial do resumo Gourmet sem duplicar instruções (06/11/2026)

- **Feedback visual do proprietário:** a compactação da PR #10 estava funcional, mas o bloco “Seus sabores” ficou simples demais e desalinhado em tela pequena. O proprietário autorizou refinar sua apresentação, **não** descartar a edição rápida nem voltar ao componente excessivamente alto.
- **Decisão:** preservar o mesmo resumo e os chips removíveis, restaurando o título **“Sua combinação”**, um selo discreto de confirmação e orientação curta dentro do cartão: **“Toque no × para remover um sabor e escolher outro.”** O cabeçalho ocupa linha própria e os sabores ficam abaixo, em grupo visual coerente.
- **Evitar redundância:** não repetir tamanho, preço nem indicador `3/3` no cartão; quando o limite for atingido e não houver erro, ocultar a frase separada “Limite preenchido. Desmarque um sabor para trocar.” O fluxo mantém mensagens reais de erro ou indisponibilidade.
- **Continuidade protegida:** a barra contextual de “Continuar com 1/2 sabores”, limite opcional 1 até 2/3, seleção individual, precificação pelo grupo mais caro, CTA e checkout continuam idênticos. A mudança é apresentação e microcopy, não regra de negócio.
- **Situação:** implementada como refinamento na própria PR #10; nova homologação WebKit e conferência no Instagram/iPhone permanecem etapas distintas da autorização conceitual.


## D-C29 — Bombom de Uva: produto novo, foto aprovada e disponibilidade independente (07/11/2026)

- **Origem:** proprietária enviou fotos da fatia, aprovou a primeira composição levemente melhorada e confirmou o preço **R$ 20,00**; autorizou registro completo no site e no Supabase comercial.
- **Decisão:** cadastrar novo `fatia-bombom-uva` / `slice_bombom_uva`, sem reutilizar identidade ou editar as demais fatias. Preservar as opções atuais de calda, a cotação autoritativa de R$ 2.000 centavos, a experiência de carrinho/WhatsApp, o painel de disponibilidade e a comanda pelo fluxo existente.
- **Imagem:** versão aprovada otimizada em `public/fatia-bombom-uva.avif` (800×1000), derivada de foto enviada pela loja, com refinamento editorial discreto; usar para o produto e seu cartão. Não substituir outras fotos nem presumir que a IA prove peso, quantidade ou estoque.
- **Segurança de publicação:** registrar linha individual inicialmente `hidden`; somente o controle autenticado do /admin poderá marcar `available` quando estoque real e versão compatível frontend/Edge estiverem confirmados. O frontend mantém fallback oculto até receber a linha remota. A existência do registro no Supabase não comprova venda liberada.
- **Rejeitado:** inventar estoque físico, marcar outras fatias disponíveis, reutilizar SKU ou publicar frontend que a Edge v30 não reconheça.
- **Prova inicial:** branch `feat/fatia-bombom-uva-20261107` descendente de `work/gourmet-editorial-economia-unica-20261107`; SQL individual no Supabase comercial criou `menu_availability.id=36`, `status=hidden`. CI, publicação e Edge posterior devem constar no checkpoint, não ser inferidos aqui.


## Adendo D-C03 / D-C15 — Foto natural do Bombom de Uva prevalece sobre tratamento (07/11/2026)

- **Origem:** novo pedido expresso com fotografia `Uva 01(1).jpeg` e captura do site; proprietário quer a mesma linguagem natural dos demais cards.
- **Decisão:** usar a foto real recebida, sem realce ou reconstituição, apenas redimensionamento/compressão de arquivo para o site; manter preço R$ 20 e indicar 380 g tanto no card quanto no carrinho.
- **Alternativa rejeitada:** fotografia aprimorada por IA embora inicialmente escolhida, porque destoou das demais fotos naturais ao ser vista na vitrine.
- **Proteções:** manter o produto `fatia-bombom-uva` / `slice_bombom_uva`, categoria, calda, preço, painel de disponibilidade, status atual e Edge comercial; não tocar em demais fatias.
- **Status:** código do peso alterado e testes de regressão aprovados; foto original aplicada no ZIP corrigido, **ainda pendente versionar a imagem natural no GitHub** para evitar regressão em rebuild futuro. Publicação do ZIP corrigido não comprovada.


## D-C16 — Fatias: nomes claros, calda de Ninho e rascunho seguro (08/11/2026)

- **Fonte/decisão aprovada:** pedido da Luciane enviado pelo proprietário, incluindo nomes oficiais `Brigadeiro Branco com Morango` e `Geleia de Morango com Coco Cremoso`; remover subtítulos repetidos de massa branca; adicionar `Com calda de Ninho` grátis. Manter `Com calda de chocolate` e `Sem calda, por favor`, sem descrições por opção, sem seleção automática. Uma única informação útil: `Escolha uma opção. Sem custo adicional.`
- **Ordem contextual:** Ninho primeiro nos IDs históricos `fatia-ninho-morango` e `fatia-coco-cremoso-morango`, chocolate primeiro nos demais. Sem bloquear combinações.
- **Proteções:** preços R$22/R$20 inalterados, IDs e fotos originais preservados, opções antigas aceitas, nomes novos no catálogo público, cotação do backend, carrinho e cozinha via `option_names`. CRM aceita nomes anteriores e novos sem mudar IDs ou atribuir compra a sinais de interesse.
- **Próximo sabor:** `Abacaxi com Doce de Leite` terá registro `slice_abacaxi_doce_leite` como rascunho oculto, sem preço e sem foto; não existe em `PRODUCTS` nem em `SLICES` de backend. O admin mostra a preparação e bloqueia disponibilização antes da confirmação de preço/foto.
- **Rejeitado:** preço presumido ou R$0 vendável; opção padrão escondida; descrições ornamentais; renomear IDs e perder históricos; liberar um produto futuro apenas por virar `available` no banco.
- **Produção:** SQL de nomenclatura e rascunho executado em `edqiwvccmboyayojvuea` com nomes conferidos, item #37 `hidden`; funções Edge e Cloudflare devem ter estado confirmado separadamente antes de declarar publicados.


## D-C17 — Cones Trufados como categoria permanente (08/11/2026)

- **Aprovação:** categoria nova **Cones Trufados**, permanente, com destaque editorial no lançamento. Home: Cones como vitrine principal, Gourmet e Fatias com seus cartões, Pipocas Trufadas ainda acessíveis de modo compacto. Não reconstruir outras jornadas.
- **Três SKUs independentes:** `cone-trufado-prestigio` **R$14**, `cone-trufado-dois-amores` **R$14**, `cone-trufado-ferrero-rocher` **R$16**; Dois Amores é o nome oficial do sabor que havia sido citado como Casadinho.
- **Fotografias:** imagens geradas para os três produtos foram confirmadas pela Luciane como correspondentes ao produto real. Prestígio **sem brigadeiro de coco no topo**. Usar os três arquivos exatos aprovados (sem novos retoques de iluminação) e cortes otimizados para cartão; não substituir por outras imagens.
- **Conversão:** escolher um cone, ajustar quantidade e adicionar ao carrinho compartilhado; permitir selecionar outro sabor, com destaque discreto após adição; checkout WhatsApp, sem pagamento online inventado. Integrar preço/identidade/quantidade ao banco e à impressão; Meta AddToCart usa SKU novo.
- **Disponibilidade:** categoria `category_cones` e sabores `cone_prestigio`, `cone_dois_amores`, `cone_ferrero_rocher` com controle independente no /admin. Começar TODOS ocultos até publicar frontend e confirmar produção. Não supor estoque, receita, peso, tamanho alternativo ou prazo específico.
- **Proteções:** preservar disponibilidade, fotos e preços existentes. Criar `item_type=cone` autoritativo; não mascarar Cones como fatias/pipocas. Evitar promessa de esgotamento ou urgência sem quantidades reais.
- **Limitação de origem:** binários dos 3 cones e das 3 fotos anteriormente aceitas (Bombom Uva natural; Maracujá prato branco full/card) precisam ser sincronizados com o GitHub. Enquanto não forem, somente o ZIP final validado deve ser publicado, nunca build cru do HEAD.

## D-C32 — Pausa de bebidas e âncora correta do recebimento (10/11/2026)

- A pedido do proprietário, **refrigerantes pausados**. Frontend baseado na linha PR #22 com `enabledExtras.drinks=false`; quatro itens remotos `drink_*` marcados `hidden` no Supabase comercial e reconferidos. IDs e preços preservados para futura revisão.
- **Não confundir contextos de rolagem:** adicionar um doce deve levar à confirmação e aos complementos (`#recebimento`); tocar em "Entrega ou retirada" ou reabrir o recebimento deve ir direto para as escolhas (`#recebimento-opcoes`), com margens seguras no mobile. Ao escolher entrega/retirada, seguir ao próximo dado necessário usando `nextCheckoutSection`.
- Esta decisão de navegação **substitui qualquer comando anterior** que mandava o CTA flutuante ao início do cartão de recebimento. Não mexer em pricing, pagamentos, QZ, frete, categorias, filtros ou carrinho para alcançar esse efeito.
- Baseline visual é o ZIP comercial anterior sem bebidas, com 29 ativos fotográficos previamente aprovados resincronizados na origem. PR #25 e `docs/CORRECAO-ROLAGEM-SEM-BEBIDAS-20261110.md` guardam evidências. Reintrodução futura de bebidas depende de novo desenho/testes e deve partir deste hotfix, não de ZIPs anteriores.

## D-C33 — Coleção natalina premium sazonal, sem quinta categoria fixa (11/11/2026)

- Decisão autorizada: quatro **porções individuais de chocotone** (não panetones inteiros) em uma coleção temporária especial, sem reduzir os quatro cartões principais da home. Entrada editorial festiva **compacta** (aprox. 86–97 px em QA) depois do título e antes da grade permanente, com identidade bordô/chocolate/champagne, fotografia real e CTA "Conhecer sabores". Fotos da loja nunca devem ser substituídas por criações artificiais.
- Coleção específica com quatro SKUs: Ninho com Nutella R$18,99; Ferrero Rocher R$18,99; Casadinho R$16,99; Morango com Brigadeiro Branco e Chocolate R$18,99. Variante porção individual `porcao`; incrementar, decrementar até zero e adicionar vários sabores sem rolagem involuntária.
- Uma só sacola e checkout WhatsApp, aplicando o hotfix de âncora `recebimento-opcoes` do PR #25. Os novos produtos devem ser cotados em centavos **no servidor**, validados por categoria e item de disponibilidade, representados em admin e cozinha, e controlados por `hidden/sold_out/available`.
- Controle de Natal via `category_natal` + 4 `chocotone_*` separados no Supabase. **Todos preparados hidden** até o proprietário publicar o ZIP e habilitar conscientemente a coleção e os sabores. Após Natal pode ocultar sem apagar históricos; não automatizar data sem confirmação.
- Preservar backend de refrigerantes previamente instalado (v35 → v36 adicionou Natal sem removê-lo). Refrigerantes continuam ocultos no frontend e banco; sem reativação.
- Fonte GitHub PR #27 `feat/colecao-natal-chocotones-20261111`, base PR #25 (não `main`), commit funcional `d44fcec0a0b990cc3f4c215ae0c7689153ec301a`; CI verde [43004281550](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/43004281550). Fotografias WebP aprovadas foram injetadas no ZIP final e **não estão como binários no GitHub**; consultar o ZIP da entrega para futuros pacotes.


## D-C34 — Natal V4: fatias recheadas de Chocottone, não unidade inteira (11/11/2026)

- **Origem:** proprietária esclareceu que cada produto é uma fatia recheada, e que a escrita comercial é **Chocottone**, com dois T. O título anterior “Chocotones Recheados” podia sugerir a venda do chocottone inteiro. O proprietário aprovou também um refinamento editorial da apresentação da coleção.
- **Decisão:** home “Fatias de Chocottone”, descrição de venda por fatia, introdução “Escolha suas fatias”, preço com unidade “por fatia” e status “fatia selecionada”. Ajustar também heading da categoria, complementar sazonal, metadados, descrição da seleção, admin e representação de pedido no código. Preservar os IDs `chocotone-*`, a variante técnica `porcao`, `item_type=chocotone`, os quatro SKUs, preços em centavos, disponibilidades e toda a jornada.
- **Direção visual:** manter fotos reais e grade 2×2; reduzir a dupla moldura dourada da faixa, substituir o cabeçalho interno em cartão pesado por introdução integrada, suavizar contornos dos produtos e compactar a barra flutuante na seleção de Natal. Manter ações de 44px, contraste, quantidade 0–99, ausência de rolagem automática por incremento e supressão de CTA duplicado.
- **Rejeitado:** mudar preços, tornar a campanha quinta categoria permanente, refazer fotografias, ampliar o banner, tratar Chocottone como `slice` no contrato técnico ou reativar refrigerantes.
- **Integração:** a edição dos textos da função autoritativa `commerce-catalog.mjs` é código candidato; **não** representa Edge publicada. A aplicação produtiva de nomenclatura no pedido requer autorização e verificação de versão separadas. Cloudflare manual, sem merge em `main`.
- **Branch:** `refine/natal-fatias-chocottone-editorial-v4-20261111`, derivada de PR #29 / SHA `34ca0b9a0a6e3f9ba860c56864bd43760ed68fef`. Resultado final, CI, ZIP e publicação devem ser comprovados no PR e checkpoint após a última alteração, não presumidos.


## D-C35 — Natal V4.1: comunicação sem redundância e confirmação por seleção (11/11/2026)

- **Decisão autorizada:** após revisão visual real no Instagram/Safari e observação da proprietária, remover “vendidos por fatia” dos textos introdutórios da coleção; preservar “por fatia” ao lado do preço dos quatro sabores. Retirada em endereço específico fica **fora do escopo**.
- **A confirmação após “Continuar pedido” no Natal** deixa de repetir a última fatia clicada como se fosse toda a compra. Calcula, a partir do carrinho existente, total de fatias e número de sabores distintos. Um sabor mostra nome e quantidade; múltiplos sabores mostram por exemplo “4 fatias de Chocottone · 4 sabores”, com ícone neutro em lugar da foto de um único sabor. Não replica a lista de itens; o carrinho/checkout continuam responsáveis pelo detalhamento e pelo subtotal.
- **Complementos:** para compras iniciadas no Natal, a sugestão de categoria usa “Adicionar fatia artesanal” / “Conhecer sabores artesanais” e preserva o destino anterior. Outras origens continuam com o texto e fluxo legados.
- **Mensagem WhatsApp registrada:** quando `kind=chocotone`, suprimir apenas o sufixo textual redundante “1 fatia” após o nome do produto. Preservar `1x`/`Nx`, quatro sabores, total, pagamento Pix, outras variantes, etiquetas de tamanhos das pipocas, Tintim e strings invisíveis de atribuição. Sem mudança na Edge publicada ou valores calculados pelo backend.
- **Preservado:** fotos WebP aprovadas byte a byte, quantidades livres, botão contextual/scroll, quatro categorias permanentes, complementos opcionais, disponibilidade remota, entrega/retirada, admin/cozinha, refrigerantes desligados e rastreamento.
- **Branch:** `refine/natal-v4-1-resumo-textos-whatsapp-20261111` a partir do V4 `5b70a545`. Não usar main como base. CI, SHA final e ZIP `LUCIANE_NATAL_V4_1.zip` devem ser verificados antes da publicação manual.


## D-C36 — Finalização WhatsApp: passagem direta com recuperação, sem sucesso antecipado (11/11/2026)

- **Problema de produção relatado pela proprietária:** clientes veem “Pedido # registrado”, acreditam que a encomenda já está concluída e não enviam a mensagem pré-preenchida no WhatsApp. A confusão recorrente ocorre apesar de textos de orientação e de botão destacado; status “Recebido pela loja” na consulta podia reforçar a percepção equivocada.
- **Decisão aprovada:** deixar de apresentar a confirmação de registro como etapa normal. O botão final passa a informar a ação verdadeira (“Abrir WhatsApp para enviar pedido”). O frontend mantém o registro idempotente e link Tintim e, **somente depois de receber/persistir o registro**, tenta navegar uma vez para o link aprovado. Ao voltar ao site ou se houver bloqueio, uma tela de recuperação explica que o envio da mensagem é necessário, com uma única ação principal.
- **Recuperação:** ícone neutro de conversa, título “Envie seu pedido pelo WhatsApp”, instrução visível “Abra o WhatsApp e toque em Enviar”, subtotal/pagamento secundários e ajuda recolhida em `details`; acesso ao acompanhamento continua existente, mas não compete com o CTA. Não afirmar que a mensagem não foi enviada quando o cliente retorna.
- **Acompanhamento:** distinguir status interno de mensagem confirmadamente enviada. Se a solicitação WhatsApp estiver em estágio inicial e pagamento pendente, “Estado do registro no site” / “Registrado no sistema”, e chamada condicional para conferir envio. Não apresentar “Recebido pela loja” como evidência do WhatsApp. Não pedir repetição a quem já enviou.
- **Mantidos sem alterações:** `create-whatsapp-order` e sua idempotência, pedido/itens/valores Pix, cartão e dinheiro, pagamento, estoque, impressão/cozinha, checkout site/online separado, tracking token, Tintim, Meta e CAPI. Nenhuma alteração em Supabase, Edge produtiva, Cloudflare publicada, refrigerantes ou endereço de retirada.
- **Limitação conhecida:** `window.location.assign` após API assíncrona pode ser bloqueado ou tratado diferentemente por navegadores internos. O fallback é obrigatório; WebKit automatizado não comprova a abertura do aplicativo WhatsApp nem o envio da mensagem. Clique/abertura não são evidência de envio efetivo; reconciliação real depende de integração de mensagens.
- **Branch:** `refine/checkout-whatsapp-passagem-direta-20261111` derivada de V4.1 `f4dc7b86`. Package `LUCIANE_COMERCIAL_V4_2_WHATSAPP.zip`, apenas após sucesso da CI no SHA final e oito fotografias WebP fiéis ao pacote anterior.


## D-C37 — Cascão Trufado + três sabores e Natal a R$22 (12/11/2026)

- **Nova orientação explícita do proprietário:** nome comercial da categoria anterior “Cones Trufados” passa a **“Cascão Trufado”**, mantendo identidade técnica `cones`, tipo `cone`, rotas antigas e os três SKUs legados/preços históricos: Prestígio R$14, Dois Amores R$14, Ferrero Rocher R$16. A nova terminologia vale para vitrine, seleção, resumo, cotação e painel; não apagar registros antigos.
- **Adicionados:** Kinder Bueno; Ninho com Morango; Ninho com Nutella e Chocotone — cada um a **R$20**, IDs `cascao-trufado-*` exclusivos e disponibilidade `cascao_*` independente, inicialmente `hidden`; fotos reais fornecidas pelo proprietário, duas versões WebP fiéis por produto.
- **Quatro Fatias de Chocottone:** todas **R$22**, frontend/backend em centavos; sem alterar IDs `chocotone_*`, variante `porcao`, controle livre ou fotos.
- **UX:** seis escolhas seguem o mesmo configurador de quantidade e carrinho; grade 2 colunas no celular, sem aumentar o último item quando par. A foto da home com trio clássico e as fotos antigas permanecem, preservando a aprovação original.
- **Release é sincronizado:** Edge de cotação, migração de disponibilidade, Cloudflare ZIP com seis WebP novos e oito natalinos existentes, só depois liberação manual dos sabores. Enquanto não houver cutover, não anunciar “publicado” ou “vendável”. Backend v36 consultado e ainda sem contrato novo nesta sessão. Nenhum SQL, Edge, deploy Cloudflare ou ativação remota foi executado.
- **Guia:** `docs/CASCAO-NATAL22-ROLLOUT-20261112.md` guarda nomes/IDs/preços, hashes das fotos e sequência segura de instalação.
