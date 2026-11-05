# Checkpoint Vivo — Site Comercial Luciane Oliveira Doces

**Fotografia inicial:** 05/11/2026 · `America/Belem` · **não é declaração de produção nem de identidade do deployment**.  
**Papel:** o ponto de retomada eficiente para site, admin, UX, catálogo, checkout, estoque, cozinha, CRM e publicação. Atualizar com o próximo incremento real **sem reescrever o histórico**.

## 0. Como retomar sem outra conversa antiga

1. Ler `AGENTS.md` e os cinco arquivos em `docs/continuidade/`.
2. Perguntar **qual é a tarefa de agora** apenas se o usuário ainda não a informou. Este sistema não escolhe uma categoria prioritária automaticamente.
3. Inspecionar **branches, HEAD, ancestry e conflitos** do módulo pedido, o código e SQL relevantes, e checks do SHA. Confirmar site/Edge/DB **com fonte atual**, se isso afeta o próximo passo.
4. Implementar/validar somente o escopo autorizado e impactos adjacentes da `MATRIZ-DE-IMPACTO-COMERCIAL.md`; comparar visualmente com `REFERENCIA-VISUAL-UX.md`.
5. Atualizar esta fotografia com branch, SHA, fatos, testes, assets, estado de produção (se comprovado), riscos e a próxima tarefa não concluída. Não duplicar o histórico nem gerar um Prompt Mestre novo sem mudança de princípios.

## 1. Identidade e isolamento

| Dimensão | Fotografia de 05/11 |
|---|---|
| Repositório | `railanzera-cloud/luciane-oliveira-doces-site` |
| URL pública | https://lucianeoliveiradoces.pages.dev |
| Administração / acompanhamento | `/admin` / `/pedido` |
| Infraestrutura | Cloudflare Pages + Supabase comercial `edqiwvccmboyayojvuea` |
| Fuso | `America/Belem`, operação em Paragominas/PA |
| Projeto separado | **Luciane Gestão**, repositório `railanzera-cloud/luciane-gestao`, Supabase `cztafxixnfpliaygniuj`: NÃO alterar |
| Stack da branch candidata | React 19, TypeScript, Next 16 / vinext 0.0.50, Supabase e integrações QZ/Tintim/Meta; conferir `package.json` atual antes de usar |
| Default branch | `main` |
| **HEAD de main verificado** | `26730be48be7f694ed92d9a23b0b8789bdbb7239` |
| **Linha cumulativa de referência da fotografia** | `work/gourmet-rolagem-contexto-premium-20261103` @ `62f7780c6d6ede5dceea9eba19212e67cd20f77a` |
| Branch destinada **somente à estrutura documental** | `docs/continuidade-comercial-20261105`, criada a partir do SHA acima |
| PRs já existentes verificados | [PR #3](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/3) e [PR #4](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/4), **ambos draft** em 05/11 |

**Ancestralidade verificada com comparação GitHub em 05/11:** a linha `work/gourmet-rolagem-contexto-premium-20261103` está **715 commits à frente de main e zero atrás**. Descende dos checkpoints `work/followup-assistido-integrado-20261031`, `work/trufadas-variantes-pmg-20261101`, `work/vitrine-premium-refino-equilibrio-20261102`, `work/admin-disponibilidade-premium-20261102`, `fix/cozinha-qz-pedido1544-diagnostico-20261102`, `work/finalizacao-whatsapp-recuperavel-20261102` e `work/gourmet-refinamento-conversao-20261102` na relação verificada. Isso **não** prova que cada fluxo esteja correto ou publicado; apenas evita refazer uma implementação ancestral sem conferir diff.

**Aviso:** não fazer merge automático desta linha grande em `main`. O PR documental deve apontar, idealmente, para a **base cumulativa** de que descende, de modo a mostrar apenas a documentação adicionada. A melhor base para um novo desenvolvimento depende do escopo, não só do último commit.

## 2. Último candidato verificado antes da documentação

- SHA de referência: `62f7780c6d6ede5dceea9eba19212e67cd20f77a`.
- Workflow `Preview Vitrine Editorial Experimental - Cloudflare` / job `package`: **SUCCESS** na [execução 41620045678](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/41620045678).
- O workflow é evidência de execução de build/teste/pacote conforme seus steps **naquele SHA**; não confundir o nome “Cloudflare” do workflow com **deployment no domínio**.
- O teste específico `tests/gourmet-rolagem-contextual-20261103.test.mjs` e documentação de 03/11 abordam a seleção de potes e rolagem até controle real.
- As melhorias acumuladas estão no GitHub, mas **não foi verificado nesta sessão** o ID de deployment Cloudflare atual, versão de Edge Functions de hoje, migrações aplicadas nem saldos reais. `main` é antiga; NÃO afirmar correspondência com produção.

### Registro auditável da primeira implementação documental

- **Primeiro commit documental gravado no GitHub:** `4d2187907078e335790640a4601bb79acf9ba488` na branch `docs/continuidade-comercial-20261105`, descendente direta da base `62f7780c...`.
- **PR de documentação:** [PR #5](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/5), base `work/gourmet-rolagem-contexto-premium-20261103`, aberto em modo draft; comparação da primeira revisão: **1 commit à frente, 0 atrás, 10 arquivos** de documentação/QA.
- **CI isolada do commit documental:** workflow `Contrato de continuidade comercial (somente documentos)`, [execução 42015397561](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42015397561) **SUCCESS, 5/5 testes**. Não foi feito build integral do frontend **nesse commit documental**, nem há prova de mudança no deployment.
- **Observação:** este registro de evidência foi acrescentado **depois** do primeiro commit, criando novo HEAD documental. A prova acima é referente a `4d218...`; o SHA deste adendo deve ser validado pela própria CI após commit. Nenhum código operacional mudou.

### O que mudou nesta etapa de continuidade (05/11)

**Escopo documental:** cinco documentos duráveis `PROMPT-MESTRE-COMERCIAL.md`, `MEMORIA-DE-DECISOES.md`, `REFERENCIA-VISUAL-UX.md`, `MATRIZ-DE-IMPACTO-COMERCIAL.md` e este `CHECKPOINT-VIVO.md`; roteamento no `AGENTS.md` e no `README.md`; teste `tests/continuity-contract.test.mjs` de presença/ligação/isolamento. Nada nesta documentação autoriza novos preços, migrações, Edge, Cloudflare, CRM ou impressora. **A CI do commit documental deve ser consultada antes de afirmar o seu resultado; o SHA final será registrado no PR e em atualização futura.**

**Diferença de propósito:** o commit documental é posterior ao candidato funcional `62f7780...`; não altera código do storefront nem comprova melhoria visual ou que um pacote já foi publicado.

## 3. Estado por área — código candidato vs realidade

| Área | Evidência de código/documento disponível | Estado operacional não presumido |
|---|---|---|
| Vitrine editorial e categorias | `docs/VITRINE-COLECOES-20261102.md`, `docs/VITRINE-PREMIUM-REFINO-EQUILIBRIO-20261102.md`, `app/page.tsx` | Aprovação visual atual por componente e deployment devem ser confirmados |
| Gourmet: tamanho, grupos e rolagem | `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md`, `tests/gourmet-rolagem-contextual-20261103.test.mjs` | Promoção de Finados acabou; não reativar; preços atuais dependem do backend |
| Trufadas P/M/G | `docs/TRUFADAS-PMG-PLANO-20261101.md`, `docs/INCIDENTE-CHECKOUT-TRUFADAS-20261101.md` | Há registro de hotfix Edge v25; um documento posterior menciona v26. Confirmar hoje o catálogo Edge e a migração instalada; não inferir por arquivos |
| Disponibilidade admin | `docs/ADMIN-DISPONIBILIDADE-PREMIUM-20261102.md`, `lib/trufadas-stock-calculation.mjs` | Não presumir saldo, status/horário, contagem física ou role real |
| Carrinho/checkout/pedido | `app/order-checkout.ts`, `supabase/functions/create-whatsapp-order/index.ts`, `create-order/index.ts` | Verificar qual rota está habilitada e compatibilidade real com backend antes de publicar |
| Finalização WhatsApp recuperável | `docs/WHATSAPP-FINALIZACAO-RECUPERAVEL-20261102.md` | Sessão e navegação no Safari real ainda requerem prova específica |
| Cozinha, QZ e POS-58 | `docs/COZINHA-QZ-INCIDENTE-1544-20261102.md`, `lib/qz-print-client.ts` | Teste em Windows/impressora física e histórico de impressão são independentes da CI |
| CRM / Meta / Tintim | `docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md`, `docs/CRM-META-OBSERVABILIDADE-CONTINUIDADE-20261026.md` | Não ativar envio/outbox/webhook ou converter sinal em Purchase sem gate real |
| Resultados / status de pagamento | `tests/admin-results-*.test.mjs`, `docs/RESULTADOS-CRM-DIAGNOSTICO-20261012.md` | Pedidos ≠ pagamentos; conciliação e períodos atuais exigem dados confirmados |

## 4. Tensões do histórico que exigem reconciliação por tarefa

**Não transformar documentos desatualizados em diagnóstico atual.**

1. **README antigo indica v10.7** como último visual aprovado em 14/10, porém há redesign de 02/11 na linha integrada. A v10.7 continua importante **para fotos/enquadramentos especificamente aprovados**, não é ponto único de código atual.
2. **PR #4 Trufadas:** havia migração P/M/G documentada como “não aplicada” em determinado checkpoint, enquanto `docs/INCIDENTE-CHECKOUT-TRUFADAS-20261101.md` relata backend e saldos ativos após hotfix, e `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md` relata Edge v26 da promoção. Reconhecer **evolução temporal e possíveis diferenças de ambiente**; só SELECT/versão em backend real resolve qual contrato está instalado hoje.
3. **Pacotes e fotografias:** houve casos com foto aprovada apenas em ZIP, depois reversionada no GitHub. Conferir arquivos `public/images/` no commit exato antes de gerar ZIP e não rebaixar o design por asset faltante em linha antiga.
4. **Status WhatsApp versus pagamento:** “pedido aceito” ou “recebido” na cozinha não comprova Pix, mesmo se o motor de impressão trabalha automaticamente; `paid_at` não pode ser alterado por UI.
5. **CI de design versus validação real:** Chromium, WebKit, scroll e zip de preview não equivalem a iPhone físico, navegador interno Instagram, entrega real de mensagem ou impressão física.
6. **Conversa antiga versus código:** o usuário não precisa enviar >30 chats. Um relato não comprovado em documento deve ser citado como intenção, não como implementação.

## 5. Padrão de refinamento e próxima tarefa

**Não existe feature automaticamente prioritária**. O próximo trabalho útil será a **solicitação concreta mais recente do proprietário**. O agente deve:
- Ler `REFERENCIA-VISUAL-UX.md` para partir de um patamar aprovado, inclusive o que **não** deve ser desfeito.
- Usar `MATRIZ-DE-IMPACTO-COMERCIAL.md` para cobrir dependências proporcionais ao risco, sem solicitar que o usuário enumere cada arquivo técnico.
- Verificar o HEAD e os assets atuais antes de editar; a candidata de 03/11 é **referência histórica de base cumulativa**, não escolha obrigatória para sempre.
- Para novo SKU, fluxo de pedidos ou disponibilidade, exigir prova do backend, estoques e operações; para ajuste visual puro, preservar dados e fazer QA de interface.
- Atualizar o checkpoint somente após evidência, com um único próximo passo concreto e os bloqueios objetivos.

**O pedido do usuário nesta etapa é apenas instituir continuidade para refinamentos futuros**, não criar produto ou redesenhar a vitrine agora. Não tocar em conteúdo comercial ou fluxos por iniciativa própria.

## 6. Testes/entrega e ativação — gates

- `package.json` da base informa `npm run build`, `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run package:cloudflare` e modo produção `package:cloudflare:production`; o comando de build de fato passa pelo script verificado da linha. Executar o conjunto proporcional e conferir workflow real.
- Teste documental `tests/continuity-contract.test.mjs` previne perda das fontes básicas e do isolamento. **Presença de teste não é resultado**, conferir CI após o commit final.
- Registrar branch, SHA completo, checks, diff, asset, SQL/migração, Edge Function, ZIP gerado do mesmo commit, estado do domínio e requisitos de iPhone/Instagram/Windows/QZ.
- Não gerar ZIP comercial para um commit **exclusivamente documental**; o próximo frontend publicável exige artefato completo e compatível.
- Não executar migration/Edge deploy, alterar estoque real, enviar CRM, fazer pedido financeiro, publicar Cloudflare, integrar `main` ou migrar o comercial para Gestão sem autorização específica para essa ação.

## 7. Atualização obrigatória e política contra loops

Em cada entrega significativa, acrescentar um bloco cronológico ou atualizar a fotografia ativa com:
- **Data, fuso, branch/base/HEAD**, ancestralidade/conflictos relevantes;
- O **problema real**, decisão D-CXX, parte visual preservada e dependências conferidas;
- Arquivos alterados, contratos de frontend/SQL/Edge impactados, testes executados **no SHA**, falhas e limitações;
- Se houve foto real aprovada, screenshot antes/depois e dispositivo/viewport **de fato verificados**;
- Diferença de estados: **proposto / codificado / validado / aprovado visualmente / ZIP pronto / publicado**;
- Configuração, migrations, estoque, Cloudflare e Edge **observados em produção**, com horário e fonte, quando houver; ou marcar “não verificado”;
- Próxima melhoria **não concluída** e qualquer bloqueio que exija a ação humana apropriada.

Não repetir tarefas aprovadas para mostrar movimento. Um check verde no antigo SHA não autoriza reatribuir “validado” a um novo código. Se a mesma etapa for repetida sem resolver, documentar a barreira e propor ação alternativa concreta.

## 8. Histórico resumido

| Data | Evidência de referência | Interpretação |
|---|---|---|
| 14/10/2026 | v10.7 `5abb4c5236fc7147972c7ab9cc5f58e5fc227732` / `ESTADO_ATUAL_VITRINE.md` | Fotos e enquadramentos aprovados em escopo específico; não é toda a vitrine atual |
| 31/10/2026 | `work/followup-assistido-integrado-20261031` @ `f729cf5ab00633d6d564f101099ce8b76b364462` | Linha ancestral de CRM, pré-reservas e proteções; migração follow-up exigia corte |
| 01/11/2026 | PR #4 Trufadas P/M/G; registro Edge hotfix v25 | Checkpoint da expansão com posterior correção backend; conferir produção |
| 02/11/2026 | Vitrine premium, disponibilidade, configurador, WhatsApp recuperável e correções QZ | Múltiplos refinamentos ancestrais no histórico cumulativo; não confundir com deploy |
| 03/11/2026 | `62f7780c6d6ede5dceea9eba19212e67cd20f77a` / [CI 41620045678](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/41620045678) | Candidato cumulativo com rolagem Gourmet e pacote `package` SUCCESS |
| 05/11/2026 | Branch documental `docs/continuidade-comercial-20261105` | Instituição de governança e memória de projeto, **sem alteração de produto, banco ou produção** |

**O SHA final do commit documental não aparece nesta fotografia inicial porque precisa existir primeiro; compare o topo remoto e o PR para saber se este arquivo evoluiu depois do marco base.** Preservar sempre a distinção entre “último código de negócio validado” e “HEAD documental mais novo”.


## 9. Incremento 05/11/2026 — busca inteligente de localidades na entrega (candidato técnico)

- **Origem e autorização:** pedido expresso para avançar no desenvolvimento do refinamento da entrega após discussão do fluxo e pesquisa de bairros. Autorização para implementar código na branch, **não** para alteração de dados/Edge de produção nem Cloudflare.
- **Base:** `docs/continuidade-comercial-20261105` @ `2fa39500517fded189b9faf5741fe560f8462a4c`; branch nova `work/entrega-busca-bairros-segura-20261105`, proposta via [PR #6 draft](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/6). Código comercial e documentos ancestrais mantidos; `main` não foi modificada.
- **SHA de código e testes aprovados:** `cd9e3739a072827a36cb00b099dac823faa795f8`. [Workflow 42071383189](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42071383189) concluído **SUCCESS**: `npm ci`, testes de localização e anti-bypass, checagem de novos erros TypeScript, `npm run build` e `node --test tests/*.test.mjs` concluídos. Outros checks no mesmo SHA também SUCCESS. **Atenção:** existem quatro diagnósticos TypeScript anteriores ao incremento em `components/admin-trufadas-stock.tsx`, `db/index.ts` e `worker/index.ts`, separados da checagem dos erros novos; não chamar todo o repositório de 100% sem erros de tipos.
- **Mudança do usuário:** busca por bairro/localidade com aliases (inclui Açaizal/Açaisal/Saisal), escolha explícita, tarifa visual correta, sem opção genérica “R$ 8 + digitar qualquer bairro”, atualização de resumo e payload com `locality_id` nos dois fluxos (site e WhatsApp). Backend rejeita `locality_id` inexistente, pendente ou divergente de `zone_id`, calcula preço pelos registros originais e preserva retirada. Rascunhos antigos recuperáveis quando identificação é inequívoca.
- **Dados candidatos:** 114 denominações no registro; **20 localidades especiais preservadas com taxa histórica do código, 59 mapeamentos urbanos candidatos a R$ 8 sujeitos a homologação e 35 sem tarifa automática**. Essas classificações **não estão integralmente validadas pela Luciane**. Sem geocodificação não se detecta declaração física deliberadamente falsa de endereço. Fontes, exceções, dúvidas e rollout em `docs/ENTREGA-BAIRROS-BUSCA-20261105.md`.
- **Compatibilidade:** backend aceita temporariamente pedidos de clientes antigos que não enviem `locality_id` e reforça os nomes especiais conhecidos; bloqueio obrigatório para todo pedido com `DELIVERY_REQUIRE_LOCALITY_ID=true` só após compatibilização da versão real do backend/frontend, com autorização de ativação. Até lá, não declarar impossibilidade absoluta de burla no formato legado.
- **Estado de produção e provas físicas:** **nenhum** SQL/Edge produtivo, alteração de preço, estoque, envio de CRM, publicação Cloudflare, merge em `main`, teste real de pagamento, impressão QZ ou Safari físico foi feito neste incremento. Código comprovado via CI é candidato, não evidência de implantação comercial.
- **Próximo gate:** validar correspondência dos bairros e tarifas com a proprietária, conferir Edge/SQL realmente instalados, revisar experiência em viewport móvel/Safari e decidir rollout faseado sob autorização específica. Atualizar documento visual após aprovação estética real; não implantar branch diretamente em produção sem essa conferência.

**Observação de governança:** esta atualização documental cria um novo HEAD posterior ao SHA técnico acima. A CI deve ser consultada no novo SHA antes de atribuir resultados a ele.


## 10. Incremento de segurança tarifária e contato assistido — 05/11/2026

**Problema encontrado ao continuar:** o primeiro catálogo possuía 59 associações candidatas à zona urbana de R$ 8 marcadas como `quoted`, embora o próprio checkpoint exigisse homologação comercial. Isso poderia fazer a nova interface aceitar cobrança não comprovada para bairros aparentemente urbanos.

**Correção efetivamente codificada:** o registro distingue *localidade pesquisável* de *localidade liberada para cotação*. Das 114 denominações: 20 destinos com tarifa especial pré-existente, cinco exemplos urbanos mencionados pelo proprietário (Promissão I/II/III, Tião Mineiro e Flamboyant) e **89 pendências** (54 vínculos urbanos candidatos + 35 sem associação). Os 89 permanecem visíveis na busca como **"A confirmar"**. O frontend não habilita checkout para eles; o backend `quoteFulfillment` também recusa `locality_id` não homologado. Esses bloqueios valem para o novo contrato; o modo legado temporário continua limitado até ativação segura do flag.

**Contato assistido melhorado:** ao selecionar um bairro pendente ou digitar um nome não localizado, a busca pode abrir o canal Tintim/WhatsApp com mensagem que contém a localidade escolhida/digitada. Carrinho e campos seguem preservados; o ato de abrir o link **não** registra pagamento/pedido nem comprova envio da mensagem.

**Matriz de conferência:** `docs/ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md` apresenta os 20 valores especiais do código, cinco exemplos urbanos e as duas listas pendentes (54 e 35), com colunas para conferência da loja. É um instrumento de revisão, não cadastro validado nem alteração remota de taxas.

**Evidência intermediária:** branch `work/entrega-busca-bairros-segura-20261105`, PR #6 draft, [CI da implementação do SHA `54b714be`](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42074228872) **SUCCESS** após ajuste das fixtures, com testes novos, build e regressão comercial. Esta atualização documental é posterior a esse SHA; consultar o workflow do HEAD antes de afirmar resultado final. A checagem de tipos ainda reporta quatro erros anteriores fora do módulo.

**Não executado:** deploy Edge/Cloudflare, migração, atualização de estoque, alterações em preços produtivos, merge, Pix/cartão real, WhatsApp enviado ou QA Safari físico. Nenhuma dessas ações deve ser inferida de CI verde.

**Próximo gate concreto:** revisar as 89 entradas pendentes com a loja (e confirmar as cinco referências urbanas e 20 preços especiais), depois homologar navegação e sessão em Safari/iPhone e planejar backend → frontend → flag sob autorização expressa de publicação.


## 11. Incremento de ergonomia do buscador — 05/11/2026 (mobile, seleção e viewport)

- **Pedido e foco:** continuidade de implementação expressamente autorizada; não repetir auditorias nem reabrir arquitetura do frete. A análise do checkout revelou que o buscador novo ocupava apenas uma coluna em telas largas e mantinha posição fixa abaixo do input mesmo com teclado virtual aberto. Também havia risco de texto stale após mudança externa da seleção, sem distinguir a limpeza causada pelo usuário digitando.
- **Código efetivamente modificado:** `components/delivery-locality-picker.tsx` agora sincroniza mudança externa de `selectedId` com o texto, mas preserva a nova pesquisa no `onClear` do usuário; mede o `visualViewport` (e reage a `resize` e `scroll`) para colocar sugestões acima ou abaixo do campo conforme o espaço disponível no iPhone/Safari, com altura limitada. `components/delivery-picker-logic.mjs` contém regras puras testáveis. `app/delivery-locality.css` dá largura integral ao buscador e à tarifa no grid desktop, estiliza o resultado acima do campo e mantém o mínimo touch no celular. A assistência via WhatsApp só aparece para bairro selecionado sem tarifa ou quando a pesquisa não encontra resultados, não durante qualquer digitação parcial.
- **Regra comercial intocada:** 114 nomes; 20 destinos com preços especiais legados; 5 exemplos urbanos citados; 89 registros ainda pendentes de homologação e **sem cotação automática**. Backend e tipos de frete não foram alterados neste incremento. Fluxos de pedido do site e WhatsApp, pagamento, histórico e retirada seguem os contratos previamente codificados.
- **Evidência específica:** último SHA de **código testado** `89ff2890c1fe4d1c2331dc7917dec36926a04ab3`, [GitHub Actions 42075931114](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42075931114) **SUCCESS**: `npm ci`, 10 testes especializados (10 pass, 0 fail), guardião de novos erros TypeScript, `npm run build`, 724 testes comerciais (724 pass, 0 fail). Foi atualizado depois disso o gatilho do workflow em `c336e8657761c82c648a5e09df567d8aaffde6d1` para incluir o novo helper e CSS em PRs; consultar a CI do HEAD antes de afirmar seu estado.
- **Evidência ausente:** ainda **não** houve teste interativo em navegador físico, comparação de screenshot, homologação estética Safari/Instagram, validação do WhatsApp enviado, impressão QZ, Edge produtiva ou Cloudflare. Não declarar renderização visual aprovada apenas porque o build passou.
- **Entregas e ambiente:** branch `work/entrega-busca-bairros-segura-20261105`, [PR #6 em draft](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/6); sem deploy, migração, merge ou alteração de preço/estoque. Produção não foi modificada.
- **Próxima etapa real:** homologação das 89 localidades pendentes com a loja e conferência de limites/tarifas; validação visual/interativa Safari no iPhone; só então planejar corte backend compatível → frontend → flag `DELIVERY_REQUIRE_LOCALITY_ID`, mediante autorização expressa de deploy.


## 12. Incremento de tolerância ortográfica e toque — 05/11/2026

- **Base remota conferida:** [PR #6 draft](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/pull/6) sobre `docs/continuidade-comercial-20261105`. Não houve desvio de branch, merge com `main` ou trabalho repetido de evolução anterior.
- **Falha concreta identificada:** busca só encontrava trechos/aliases conhecidos, deixando clientes com erros pequenos na grafia sem sugestão. Em dispositivos com toque, o `blur` do input pode desmontar a lista antes do `click` em uma opção.
- **Correção codificada:** fallback de distância de edição limitado a nomes razoavelmente longos e **apenas quando não há resultados diretos**; exemplos `Promisao 2` e `Nagibaoo`. O cliente precisa escolher o resultado, e a validação de identidade/preço do servidor permanece independente. O dropdown destaca sugestões aproximadas e preserva a lista quando um toque começa dentro das opções. Essas regras não concedem cotação a nenhuma das 89 localidades pendentes nem mudam qualquer tarifa legada.
- **Prova no SHA `ff611e15a2ef0dd9acfb22819980c125e41754c4`:** [workflow 42079563944](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42079563944) **SUCCESS**: 12 testes especializados de busca, tarifa e comportamento, 726 testes comerciais, `npm run build`, verificação sem novos erros de tipos. Quatro erros TypeScript anteriores de módulos alheios à entrega persistem. Os commits documentais posteriores precisam de checagem própria se a evidência for atribuída ao HEAD.
- **Alterações:** `supabase/functions/_shared/delivery-localities.mjs`, `components/delivery-locality-picker.tsx`, `app/delivery-locality.css`, `tests/delivery-localities-20261105.test.mjs` e documentação `docs/ENTREGA-BAIRROS-BUSCA-20261105.md`.
- **Estado por dimensão:** código implementado e CI do SHA técnico aprovada; visual Safari/iPhone e Instagram **não homologado fisicamente**; 89 bairros/denominações continuam aguardando validação comercial; ZIP publicável, deploy Edge/Supabase/Cloudflare, dados reais, pagamentos, impressão e merge **não executados**.
- **Próxima tarefa que não se resolve só com código:** homologar com a loja as 89 tarifas/associações e validar o uso real do dropdown no iPhone; depois conferir backend publicado para ativação coordenada sob autorização específica, sem cortar clientes com checkout legado.


## 13. Incremento pré-release e auditoria da produção comercial — 05/11/2026

**Origem:** solicitação expressa para continuar até concluir, respeitando o isolamento do projeto e a necessidade de autorização específica para deploy real. A PR #6 continua em draft, sobre `docs/continuidade-comercial-20261105`, sem alterações em `main`.

**Incremento de código implementado:**
- `supabase/functions/_shared/commerce-catalog.mjs`: identificação de zona validada como **propriedade própria** do catálogo com `Object.hasOwn`; rejeita `__proto__`, `constructor`, `toString` etc. Confere centavos inteiros finitos, mantendo tarifa, retirada e fluxo antigo compatíveis.
- `app/page.tsx` e `app/delivery-locality.css`: para entregas sem bairro homologado o resumo informa **"Taxa de entrega: A confirmar"** e orienta sobre a ausência do total; não representa frete desconhecido como R$ 0.
- `scripts/audit-delivery-contract.mjs`: preflight sem acesso a produção que percorre **todas as 114 localidades**, confirma 25 cotáveis, 89 pendentes, centros de preço válidos, rejeições de zona inválida, aliases, retirada grátis, e que **ambos** os handlers usam o contrato compartilhado. Integrado ao workflow `.github/workflows/delivery-localities-review.yml`.
- Testes focados de manipulação de payload, paridade das duas Edge Functions e resumo de taxa pendente.

**Evidência de CI do último SHA técnico:** [run `42082285144`](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42082285144), commit `d081bcf04413209668a505dc82575d5fca43c207`: auditoria completa **SUCCESS**, 15/15 testes específicos, 729/729 testes comerciais, `npm run build` sucesso, verificação sem novos erros TS. Quatro erros preexistentes fora de entregas ainda estão documentados. Commits documentais posteriores exigem checagem em seu próprio SHA.

**Produção efetivamente consultada via conexão Supabase comercial, somente leitura:**
- Projeto `edqiwvccmboyayojvuea` **ACTIVE_HEALTHY**, 49 migrações; última `20261101165247_trufadas_pmg_nove_skus_20261101`.
- `create-order` **ativa v14**, com catálogo embutido legado de aprox. 10.153 caracteres, **sem `locality_id`/flag**. A função no GitHub mudou também o cálculo das promoções (`applyPopcornPromotionToQuote`), portanto um deploy inteiro não seria alteração exclusivamente de frete.
- `create-whatsapp-order` **ativa v26**, com catálogo compartilhado de aprox. 12.763 caracteres, **sem `locality_id`/flag**; é distinta da versão do GitHub com 14.711 caracteres e guardas recentes. Entry point v26 existe e é estável em produção; não substituí-lo cegamente.
- **Nenhum** deploy de função, SQL, configuração secreta, preço real, dado de pedido, Cloudflare ou merge ocorreu.

**Gate/rollback documentado:** `docs/ENTREGA-RELEASE-GATE-20261105.md`. Confirmar 89 localidades pendentes e 20 tarifas especiais com loja, homologar Safari/iPhone e Instagram reais, preservar as versões de Edge publicadas, testar compatibilidade em ambiente isolado, depois (com autorização própria) backend compatível → frontend → flag de obrigatoriedade. Rollback preserva pedidos e exige primeiro desligar flag se ativo.

**Estado:** incremento de código e CI **tecnicamente aprovados**, mas **lançamento não autorizado/não executado**; existem bloqueios reais de homologação comercial, UX em hardware e paridade de produção. Não confundir com conclusão da publicação.


## 14. Homologação priorizada com histórico agregado — 05/11/2026

**Motivo:** o único bloqueio comercial de maior alcance são 89 localidades ainda não homologadas. Em vez de classificá-las automaticamente ou repetir auditorias de código, foi feita leitura **somente agregada** no Supabase comercial `edqiwvccmboyayojvuea` da relação bairro/região/taxa de pedidos de entrega registrados desde 01/09/2026. Nenhum nome de cliente, rua, telefone, CPF, dado financeiro individual, alteração SQL ou escrita operacional foi feito.

**Evidência e limite:**
- 427 entregas em 148 grupos de nomes/região/taxa no recorte; 312 registros corresponderam sem ambiguidade às denominações públicas da base candidata.
- **24 dos 54 bairros urbanos pendentes** já constam em pedidos com `delivery_zone_id=cidade` e R$ 8. **9 dos 35 nomes sem região definida** também aparecem com R$ 8. Isso **prioriza a confirmação humana**, mas não prova bairro físico, aprovação do valor ou status pago.
- **2 registros de Açaizal apareceram com tarifa urbana R$ 8**, embora o catálogo comercial atual tenha tarifa Açaizal R$ 10. Não inferir fraude; podem ser erros ou ajustes históricos. É evidência de por que a validação bairro/taxa precisa ser reforçada.
- Relatório sem PII, gerado apenas com nomes públicos do catálogo e contagens agregadas: `docs/ENTREGA-HISTORICO-AGREGADO-20261105.md`. Não publicar esse relatório como estatística de mercado ou garantia de cobertura.
- **Nenhum** dos 89 status pendentes foi liberado automaticamente; continuam não cotáveis até a Luciane confirmar a tarifa atual.
- **Impacto no rollout:** aprovar primeiro bairros de maior frequência e validar os nomes especiais, depois atualizar catálogo/CI e revisar experiência móvel. Produção e `main` permanecem intocadas.

**Esta é atualização documental posterior ao último SHA técnico validado.** A CI da branch deve ser conferida no HEAD antes de anunciar checks aprovados nele.


## 14. Continuidade 05/11/2026 — variantes do checkout antigo, paridade de preços e ZIP de QA

**Pedido:** usuário autorizou prosseguir com todas as implementações necessárias, preservando as exigências de segurança e publicação. Este incremento ocorreu após `c0470c5532abfa5960f16d8533d32d4939feb8d2`, sem reiniciar a PR #6.

**Código implementado:**
- `delivery-localities.mjs` adicionou `deliveryLegacySpecificCandidate`: detecta menções inequívocas e grafias próximas de localidades especiais para proteger pedidos de **clientes com checkout antigo sem `locality_id`**. Não atribui tarifa por aproximação e não bloqueia uma região urbana homônima (ex.: Juparanã vs. Juparanã Empresa).
- `deliveryLegacySpecialMentionCount` sinaliza quando um campo legado cita mais de um destino especial; `commerce-catalog.mjs` exige confirmação em vez de aceitar R$ 8 por ambiguidade. Exemplos protegidos em testes: `Açaisall`, `Nagibaoo`, `Açaizal próximo à praça` e `Açaizal ou Aeroporto`. É defesa conservadora, **não comprova endereço físico** nem elimina o risco de uma localidade inteiramente inventada no formato antigo.
- `scripts/audit-delivery-contract.mjs` agora analisa a AST de `app/catalog.ts` via TypeScript para garantir **paridade de ID, nome e preço das 21 regiões** com o catálogo do Edge, além de auditar 114 locais, pendências e handlers.
- `.github/workflows/delivery-localities-review.yml` ganhou job dependente de testes para gerar ZIP **somente de inspeção visual** sem Supabase e com `SITE_ORDERING_ENABLED=false`. Nome do artefato: `QA-ENTREGAS-SOMENTE-VISUAL-NAO-PUBLICAR`. Não é ZIP comercial/de produção.

**Verificações:** o commit `87e08e23208acc294417109f2b1faa3591753313` passou no [GitHub Actions 42084539081](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42084539081) com **16/16 testes focalizados, 730/730 regressões, Deno check, build e guarda de novos erros TS aprovados**. O commit `04bb0cd53c3b876cf1126b8e59c0d78261c0990b` teve [workflow 42085236722](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42085236722) aprovado, incluindo geração e retenção por 7 dias do ZIP isolado de QA. A CI dos últimos commits de paridade/ambiguidade deve ser verificada no SHA final, não herdada de runs anteriores.

**Evidência histórica agregada:** `docs/ENTREGA-HISTORICO-AGREGADO-20261105.md` documenta apenas contagens: 427 entregas no recorte desde setembro, 24 candidatos urbanos com pedidos de R$ 8 e 9 locais sem zona também com pedidos de R$ 8, incluindo 2 casos de Açaizal com tarifa urbana. Sem dados pessoais nem acesso a pedidos individuais. **Histórico não é homologação**, não aprova preços automaticamente, não autoriza mudar pedidos antigos. A matriz de 89 pendências permanece.

**Ações proibidas neste checkpoint sem gate explícito:** merge em `main`, alteração de valores produtivos, deploy Supabase/Cloudflare, ativação de `DELIVERY_REQUIRE_LOCALITY_ID`, registrar pagamento real ou afirmar que o QA em Safari físico foi concluído. As funções de produção seguem `create-order` v14 e `create-whatsapp-order` v26 conforme verificação de leitura. Continuar em `docs/ENTREGA-RELEASE-GATE-20261105.md`.

**Próximo trabalho necessário para lançamento:** obter a confirmação da operação para as localidades de maior uso (24+9 primeiro, depois demais), testar dropdown em Safari e navegador do Instagram num iPhone físico, planejar deploy do backend compatível sem perder contrato de estoque/mercearia e executar publicação com rollback demonstrável. Não considerar o ZIP de QA como publicável.


## 15. Homologação comercial explícita de 33 localidades — 05/11/2026

**Origem:** o proprietário respondeu à lista de 24 bairros urbanos + 9 localidades não classificadas, confirmando **todos os 33** e corrigindo exceções. Para esta etapa, não inferir mais a tarifa de acordo com pedidos históricos: existe declaração comercial expressa.

**Tarifas confirmadas para pedidos futuros no catálogo candidato:**
- **R$ 10:** `ouro-preto` (Ouro Preto), `juparana` (Juparanã bairro), `aragao` (Aragão), `laercio-cabeline` (Laércio Cabeline) e `sidney-rosa` (Sidney Rosa).
- **R$ 8:** os outros **28 IDs** da listagem de 33 nomes, enumerados um a um em `docs/ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md`.
- **Não confundir:** `juparana-empresa` permanece própria e R$ 10; `laercio-cabeline-ii` **não foi homologada**; nomes semelhantes/variantes não devem ser fundidos automaticamente.

**Atualização efetiva da branch:** `supabase/functions/_shared/delivery-localities.mjs` associa os IDs à zona e libera apenas os confirmados; `supabase/functions/_shared/commerce-catalog.mjs` e `app/catalog.ts` adicionam as cinco zonas próprias de R$ 10 (mantendo a zona urbana R$ 8 e todas as 20 zonas especiais prévias). `scripts/audit-delivery-contract.mjs`, `tests/delivery-localities-20261105.test.mjs` e `tests/menu-refinement.test.mjs` foram ajustados para a nova matriz.

**Novo estado:** **114 nomes pesquisáveis**, **58 locais cotáveis** (20 legados + 5 urbanos anteriormente informados + 33 agora homologados), **56 pendentes** (30 candidatos urbanos, 26 sem zona), **26 zonas de tarifa** em frontend/Edge. A CI verifica os 33 preços nominalmente e os limites das pendências, além de testar que special R$ 10 não pode ser cobrado R$ 8 por `zone_id=cidade`.

**Referência atual:** `docs/ENTREGA-HOMOLOGACAO-LOCALIDADES-20261105.md` é a matriz principal, com os 33 locais movidos de pendentes para confirmados. O relatório `docs/ENTREGA-HISTORICO-AGREGADO-20261105.md` permanece como fotografia **anterior à confirmação**, não como lista de pendências atuais.

**Limites e release:** ainda não houve teste físico com Safari/iPhone/Instagram e **as Edge Functions publicadas (create-order v14, create-whatsapp-order v26)** não recebem o contrato `locality_id`. Sem deploy, merge, atualização do banco, recomputação de histórico de pedidos, flag ou publicação Cloudflare. Respeitar `docs/ENTREGA-RELEASE-GATE-20261105.md`. O ZIP de QA anterior representa checkpoint antigo e não contém as 33 novas liberações.

**Checkpoint de código:** usar o HEAD da PR #6 e seus resultados de CI específicos antes de afirmar que o incremento novo foi validado; commits históricos anteriores não são prova de CI para esta atualização.


## 16. Guard de transição entre checkout legado e novo — 05/11/2026

**Situação verificada antes deste incremento:** PR #6 aberta como draft sobre `docs/continuidade-comercial-20261105`; HEAD anterior `bd88a3d4d19d4a3e1aadb6fc600064dc73f550eb` com CI bem-sucedida; 114 nomes, **58 cotáveis**, **56 pendentes** e 26 zonas. Nenhum deploy comercial.

**Incremento real de código:** `delivery-localities.mjs` implementou `deliveryLegacyReviewState(name)`, sem busca aproximada nem tarifa inferida, com estados `quoted`, `pending`, `ambiguous`, `unknown`. `commerce-catalog.mjs` implementou o flag opt-in **`DELIVERY_LEGACY_REVIEW_GUARD=true`**; quando ativado no backend, rejeita bairros conhecidos pendentes ou ambíguos enviados sem `locality_id`. Por padrão está desligado, preservando as abas antigas. Não rejeita nomes desconhecidos até que, em etapa posterior, o flag estrito `DELIVERY_REQUIRE_LOCALITY_ID=true` exija o identificador. Essa distinção é relevante para segurança e disponibilidade comercial.

**Testes reais no código SHA `efe7f4533061d43110574bad79b61eafb30fcc4a`:** [GitHub Actions 42094262731](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42094262731) **SUCCESS**, auditoria de 114 localidades / 26 zonas, **18/18 testes específicos**, **732/732 comerciais**, `npm run build`, `deno check` dos dois handlers e guarda de novos erros TypeScript aprovados; quatro erros antigos fora da entrega permanecem documentados.

**Ajuste do gate:** as **56 pendências não exigem atribuição de tarifa para um lançamento parcial** das 58 aprovadas, desde que a operação aceite oferecer atendimento manual e a experiência pendente seja validada. Isso não significa que a publicação já foi autorizada ou está pronta: Safari/iPhone real, equivalência entre Edge produtiva e candidato, rollback e pagamentos reais permanecem não homologados.

**Passos de ativação, apenas depois dos gates e da autorização específica:** backend compatível (ambos flags desligados) → frontend e verificação dos pedidos → flag intermediário, opcional e reversível → somente depois flag estrito se não houver clientes legados dependentes do formato antigo. **Nenhum flag, Edge, banco, pedido ou Cloudflare produtivo foi alterado neste incremento.** O ZIP anterior ao SHA não é pacote produtivo.

**Próximo ponto:** validar o fluxo em navegador móvel real e preparar comparação/rollback das funções publicadas `create-order` v14 e `create-whatsapp-order` v26; conferir artefato de QA do último HEAD em vez de reutilizar versões antigas.


## 17. Fontes de rollback das Edge em produção — 05/11/2026

Base: PR #6 draft, HEAD anterior eb7cbaf0a02021adb7c31c29071cdcfe77934e07, CI anterior 42094810828 aprovada. Leitura em modo estritamente read-only do Supabase comercial edqiwvccmboyayojvuea confirmou create-order v14 e create-whatsapp-order v26, ambas ACTIVE e sem locality_id. Foram arquivados os 7 arquivos únicos devolvidos pelo serviço (2 site/MP; 5 WhatsApp), com hashes Git SHA-1 por arquivo e SHA-256 do bundle Supabase, em docs/edge-release/rollback/20261105/manifest.json e diretórios correspondentes. O arquivo principal do WhatsApp v26 é idêntico ao candidato; o catálogo difere. O site/MP v14 possui catálogo anterior e diferenças na campanha Gourmet; logo, trocar o backend todo NÃO é só mudar o frete. Snapshots são código-fonte, não incluem credenciais/SQL/Cloudflare. Sem deploy, pedidos, flags, pagamentos, dados, merge ou mudanças na Luciane Gestão. CI para este incremento ainda precisa ser validada; próxima etapa é automatizar integridade/paridade e preparar o procedimento de rollback.


### 17.1 — Testes de integridade/paridade do backup de Edge (05/11/2026)

Incremento posterior ao snapshot de código `92c84f6e821b6df0c20a4b493c80b4c70d101e5d`: novo teste `tests/delivery-edge-rollback-20261105.test.mjs` verifica os hashes dos 7 arquivos arquivados, resolução de dependências, paridade de todas as 21 tarifas produtivas originais e cotações de 40 combinações sintéticas de produtos WhatsApp do catálogo v26 com o candidato. Configuração de CI expandida para executar o teste e manter gates de Deno, build, regressões, tarifa e QA visual isolado. Runbook em `docs/EDGE-ROLLBACK-BUNDLE-20261105.md`; detalhamento adicional em `docs/ENTREGA-RELEASE-GATE-20261105.md`. Nova decisão D-C18 documentada. **Estado no momento do commit:** CI do incremento ainda não verificada; não afirmar aprovação sem consultar o run exato. Sem mutações em Supabase/Cloudflare/SQL/flags/dados/pagamentos/main, sem alterar Luciane Gestão.


### 17.2 — Corrigir escopo do TypeScript para backups imutáveis (05/11/2026)

A CI do SHA `a3f30c59b3df827e95ce7a297a84625d533cc6ad`, run [42098126856](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42098126856), falhou **apenas no gate TypeScript geral**: backups imutáveis das Edge publicados em docs/edge-release/rollback/20261105/**/*.ts passaram a ser compilados pelo tsconfig do aplicativo, gerando erros de Deno e tipos legados. No mesmo run, a auditoria de tarifas, Deno check candidato, teste novo de integridade/paridade Edge e testes de entrega passaram; build e regressões foram pulados por dependência. Foi isolada **somente a pasta de snapshots** via exclude em tsconfig.json, sem editar sequer um byte dos códigos arquivados ou runtime de checkout. O teste de hashes continuará garantindo integridade do backup. Aguardar CI da correção antes de declarar o gate completo aprovado.


### 17.3 — Matriz adicional Mercado Pago/site (05/11/2026)

Adicionado ao teste de rollback o confronto sintético de **30 combinações** presentes no catálogo da `create-order` v14 (6 fatias herdadas + 3 tamanhos × 8 sabores Gourmet), incluindo total em centavos, chaves de disponibilidade e identidade do SKU, contra o orçamento candidato com a promoção calculada após o fim da campanha de 02/11. A v14 possui 6 fatias, enquanto o catálogo candidato possui 7; nenhuma remoção ou alteração de preço herdado foi autorizada. Não chamar gateway, SQL ou pedido real. O teste anterior de 40 combinações de WhatsApp permanece. Essa verificação cobre cotação de produto, **não** processamento real de Pix/cartões/RPC; homologação isolada ainda é necessária. CI do SHA deste acréscimo deverá ser consultada.


## 18. Gate de rollback e paridade Edge comprovado em CI — 05/11/2026

**Último SHA de código validado:** `9133ad1b40ef2f4a7f9140797c35c17dc76ad488` na PR #6, branch `work/entrega-busca-bairros-segura-20261105`. A [CI 42098630298](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42098630298) terminou **SUCCESS nos dois jobs**, incluindo 5 testes do novo gate de fonte/rollback, 19 testes de entrega já existentes, **738/738 regressões comerciais**, Deno check das duas Edge, auditoria 114/58/56/26, gate de TypeScript sem novos erros, build e geração do ZIP **SOMENTE PARA INSPEÇÃO, NÃO PUBLICAR**. Quatro erros antigos de TypeScript em componentes/admin-trufadas-stock.tsx, db/index.ts e worker/index.ts continuam conhecidos; arquivos de snapshot .ts foram excluídos corretamente da aplicação, sem alteração do backup.

**Escopo efetivamente testado:** hashes e imports dos 7 arquivos exatos das Edge produtivas v14/v26, paridade de 21 tarifas antigas + cinco novas a R$ 10, 40 combinações WhatsApp e 30 combinações Mercado Pago/site em cotações sintéticas após o término da promoção. **Não foi testado em produção:** criação efetiva de pedidos, Pix/cartões, transações, impressora, stock real, Safari físico, navegador Instagram, deployment Cloudflare/rollback operacional. Esses limites não são falhas de CI, mas gates externos ainda abertos.

**Próxima ação correta:** homologar navegador móvel real e compatibilidade isolada dos dois canais com RPCs/pagamentos simulados; identificar deployment Cloudflare anterior e validar procedimento de retorno. Antes de qualquer deploy, conferir de novo a versão e SHA256 reais das duas Edge e solicitar autorização específica. **Produção intocada:** nenhuma Edge, Cloudflare, SQL, flags, preços, pedidos, pagamentos, estoque, CRM ou projeto Luciane Gestão foi alterado; main não recebeu merge.


## 19. Protocolo de integração isolada Edge, pedidos e Pix — 05/11/2026

**Base:** PR #6, HEAD anterior `6800cd6c936d6f8eaa3c916a5841949901741c97`, CI 42098953337 aprovada. Teste integrado novo `tests/delivery-edge-isolated-flow-20261105.test.mjs` carrega o código real dos dois handlers usando transpilação TypeScript e VM Node, com interceptação integral de `fetch` em fixtures de domínio reservado `.invalid`. Sem credenciais reais, Supabase, rede externa, SQL, pedidos, tokens bancários ou Mercado Pago de verdade. Cenários: pedidos WhatsApp R$ 8/R$ 10, defesa contra edição de zona/ID, destino pendente, divergência de total, recuperação idempotente, clientes antigos sob flag estrita, retirada e loja fechada; Site em dinheiro e Pix sintético, recuperação de tentativa, divergência do gateway, origem cruzada e identidade desconhecida. A CI de entregas executa este teste antes de TypeScript/build/regressões; atenção: o simulador de rede não substitui a homologação de transações e RPCs em ambiente realmente isolado. Estado no instante do commit: CI do novo teste pendente de conferência; nenhum deploy Edge/Cloudflare, SQL, produção, flags, merge nem Luciane Gestão alterados.


### 19.1 — Correção de fixture, não de negócio (05/11/2026)

A primeira CI do teste integrado (run [42102199633](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42102199633), commit `3089b583beddecf7fc7dea2991033a7e387e9be7`) falhou no próprio fixture: `LOD-ABCD-EFGH-JKLM` continha a letra `L`, vedada por `ORDER_ID_PATTERN`. Por isso 10/12 cenários paravam com HTTP 400 em validação do ID, sem chegar às RPCs; 2 resultados anteriores não demonstravam integração bem-sucedida. Substituído por ID válido `LOD-ABCD-EFGH-JKMN` e acrescentada asserção de código de erro no teste de localidade inventada. O helper do teste agora passa temporariamente as flags de `Deno.env` ao código real de quote que roda no realm Node, restaurando o global após cada chamada; nenhuma Edge ou lógica comercial produtiva foi modificada. Rodar nova CI para obter prova verdadeira. Sem alterações em produção.


### 19.2 — CI de handlers isolados validada — 05/11/2026

**Código aprovado:** SHA `45099c9b1821359f6b29741dcef4d0c16f129f5b` na branch `work/entrega-busca-bairros-segura-20261105`; [GitHub Actions 42102419185](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42102419185) terminou **SUCCESS nos dois jobs**. **Execução comprovada:** 12/12 testes de handlers isolados, 5/5 de integridade/paridade de backups Edge, 19/19 de localidades e anti-bypass, 750/750 regressões comerciais gerais, Deno check nos dois entrypoints, auditoria 114/58/56/26, TypeScript sem erros novos e build. ZIP visual de QA gerado com checkout produtivo desativado — **NÃO PUBLICAR**.

**Cobertura adicional:** as funções reais foram transpiladas e exercitadas numa VM Node, com Supabase REST/RPC e Mercado Pago substituídos por respostas sintéticas: entrega urbana/especial e adulteração, preço alterado, recuperação/idempotência, entrega antiga com flag estrita, retirada, loja fechada, pedido em dinheiro, Pix e mismatch da resposta do gateway. Não há SQL, pedido, pagamento, CRM ou rede externa real no teste. A primeira execução 42102199633 falhou por fixture com código de pedido inválido; foi corrigida em `45099c9b...` e a CI passou. Esta distinção evita chamar teste parcialmente executado de validação.

**Limites reais ainda pendentes:** Safari/iPhone físico, navegador interno Instagram, RPC real/concorrência e sandbox Mercado Pago, Cloudflare deployment anterior identificado e autorização para corte backend/frontend. **Versões live reconfirmadas após CI:** create-order v14 SHA256 `22883c7f7a38bdac8ac9b105df2f46551bf8813a4bfce6c777a25b42f129d871`; create-whatsapp-order v26 SHA256 `988387b66ce6b2a1afd08d10de3f51ce3b4c115b75e7d620100883f374ebe104`. **Produção intocada** e PR #6 permanece draft; não fazer deploy nem merge sem autorização específica.


## 20. QA móvel automatizado em WebKit — 05/11/2026

**Base:** branch work/entrega-busca-bairros-segura-20261105, HEAD anterior `88771f3d8ac63e1a82b3907b5ad4fb9b8967d491`; PR #6 draft. Novo `scripts/qa-delivery-webkit.mjs` foi versionado no commit `88771f3d...`, e a CI de entregas ganhou job `webkit-delivery`, que compila um pacote de inspeção sem Supabase, pagamentos, CRM ou checkout produtivo. Roda WebKit Playwright 1.56.1 em Ubuntu 24.04 com 320, 375, 390 e 430 px, interação de toque e teclado, troca de bairro R$ 8→R$ 10, escolha pendente, contato assistido, busca aproximada, Enter/Escape, ausência de tarifa inventada e overflow. Toda solicitação externa à origem localhost é abortada; screenshots sintéticos em artefato `QA-ENTREGAS-WEBKIT-NAO-PUBLICAR` (não é ZIP de produção). **Status:** automação implementada, aguardando CI do commit do workflow; não declarar Safari físico/Instagram homologados por WebKit remoto. Não houve deploy Edge/Cloudflare/SQL, flags, preço, pedido, pagamento, main nem acesso ao Luciane Gestão.


### 20.1 — Correção da identidade das opções no roteiro WebKit

Na CI [42105296441](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42105296441), o job WebKit falhou no primeiro viewport 320px **antes da seleção** porque o teste usava `/Promissão II/`, que casava tanto com `Promissão II` quanto com `Promissão III` (substring). O DOM real apresentou ambas as sugestões; não há evidência de bug comercial nessa falha. Corrigidos os dois locators para `id$="-promissao-ii"`, preservando IDs estáveis de bairro em vez de texto ambíguo. Os jobs de contrato, build, regressões e ZIP isolado passaram nessa CI; o novo teste WebKit terá o resultado aferido em outro SHA. Nenhuma alteração de runtime do checkout, tarifas ou produção.


## 21. WebKit mobile comprovado no último SHA técnico — 05/11/2026

**Código validado:** SHA `1a6a12877e9b214e57b24f0462849537f6f5220a`, branch `work/entrega-busca-bairros-segura-20261105`, PR #6 (draft). A [CI 42105774369](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42105774369) terminou **SUCCESS em todos os três jobs**: validação de contratos/regressões, ZIP de QA somente visual, e novo job `webkit-delivery` no WebKit Playwright 1.56.1. **Log de WebKit:** `WEBKIT QA OK` em **320×568, 375×667, 390×844, 430×932**, com interação real no componente renderizado no navegador, toque, busca explícita, troca entre tarifas R$ 8/R$ 10, opção pendente, contato assistido, busca aproximada, Escape/Enter, entrada de nome inexistente, alvo mínimo de toque, fonte de 16px e ausência de overflow horizontal. O script bloqueia conexões externas e os artefatos visuais foram gerados sem Supabase/pagamentos. [Evidências de screenshots](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42105774369/artifacts/13451467528). O primeiro run 42105296441 falhou por regex ambígua `/Promissão II/` que também casava `Promissão III`; corrigido com ID canônico na revisão `1a6a128...` e **não foi necessário alterar o seletor produtivo**.

**Limites:** WebKit automatizado em runner Linux não testa o teclado virtual do iOS real, Safari físico, navegador embutido do Instagram ou transações produtivas. O pacote QA preserva um carrinho sintético e não valida estoque real nem confirma pagamento. Continuam pendentes a homologação de dispositivo, RPCs/gateway isolados e a identificação do deployment anterior Cloudflare para rollback. **Não autorizar deploy por este sucesso.** As Edge comerciais continuam v14/v26; nenhum Cloudflare, SQL, flag, pedido, pagamento ou Luciane Gestão foi modificado.


## 22. Pacote comercial conectado como candidato, com gate explícito (05/11/2026)

Pedido do proprietário: concluir o preparo de produção e fornecer ZIP manual para Cloudflare, com autorização de implementação, mas **sem comprometer checkout, pagamentos nem pedidos atuais**. Leitura em Supabase confirmou que a chave publishable ativa coincide com a chave **pública** usada em workflow histórico. Novo job `connected-candidate` prepara ZIP conectado ao Supabase comercial (apenas API pública), com `SITE_ORDERING_ENABLED=false` como **perfil histórico documentado** (não comprovadamente a configuração Cloudflare atual); CI exige regressões e WebKit antes da geração. Conteúdo e SHA do ZIP são auditados; artefato rotulado `CANDIDATO-CLOUDFLARE-CONNECTED-NAO-PUBLICAR`. **Não é autorização para publicar:** backend ainda v14/v26, precisa revalidar modo atual do checkout (especialmente Mercado Pago) e executar migração de Edge compatível com fonte de rollback antes do ZIP final. Não se deve alterar o perfil de pagamentos do site por suposição. Este job NÃO usa segredos, não publica Cloudflare, não faz SQL/deploy Edge/merge/flag.


## 23. Liberação controlada do canal WhatsApp e ZIP conectado para upload manual — 05/11/2026

**Autorização atual do proprietário:** concluir preparação de produção, habilitar compatibilidade das entregas e fornecer ZIP que será publicado **manualmente** por ele no Cloudflare; não publicar Cloudflare pela ferramenta. Fonte comercial disponível: pacote anterior `Luciane_Gourmet_03Nov2026.zip` (inspecionado como arquivo de referência, **sem afirmar ser o deployment exato do Cloudflare**) contém `siteOrderingEnabled=false`, `mercadoPagoPublicKey=''`, modo de finalização WhatsApp. Os registros agregados de pedidos mostram que a última criação com `checkout_channel='site'` ocorreu em 08/10/2026; nenhuma recente confirma ativação do checkout de cartão online. Mesmo assim, não declarar o checkout do site removido em produção sem verificar o deployment real.

**Supabase comercial — mudança de PRODUÇÃO efetiva:** com fonte original v26 preservada em `docs/edge-release/rollback/20261105/`, após preflight de sha/CI e checagem de árvore, foi implantada **somente** `create-whatsapp-order` v27, ACTIVE, `verify_jwt=false`, bundle SHA256 `3a9f2b6d683e6f675bbbd81dc1bf38edaf7cce94229a4de2a9b35b3b5469c3e3`. O entrypoint, receipt-card, popcorn-promotion e trufadas-variants mantiveram bytes idênticos à função v26; mudanças foram `commerce-catalog.mjs` + nova `delivery-localities.mjs`. **Não** foi implantada `create-order`: continua v14 e SHA256 `22883c7f7a38bdac8ac9b105df2f46551bf8813a4bfce6c777a25b42f129d871`. Nenhuma flag de transição ativada, nenhuma migração SQL, nenhum dado/pedido/pagamento real escrito voluntariamente e nenhum merge.

**ZIP comercial conectado:** build do commit `7b3b7d2621b159c14b4b055d6e18e41ead8b8532` aprovado na [CI 42107709877](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42107709877), com build, WebKit, integrações isoladas e regressões. Artefato GitHub `CANDIDATO-CLOUDFLARE-CONNECTED-NAO-PUBLICAR`, ID 13451084446, contém `luciane-oliveira-doces-cloudflare-pages.zip`; checado e separado para entrega com nome `luciane-oliveira-doces-entregas-20261105-cloudflare.zip`. Perfil binário: `SITE_ORDERING_ENABLED=false`, `SUPABASE_URL` comercial e chave publishable pública ativa, sem MP public key (exatamente modo WhatsApp do pacote de referência de 03/11). **Prova do pacote:** 72 arquivos, 4.567.418 bytes, SHA256 `c634e77541de945602f1451469772ea21db3751f17e642b64a4c3fd2a58b3669`; todas rotas essenciais, imagens e ativos de busca presentes. A geração do ZIP **não é a publicação Cloudflare** e não confirma qual versão está operando no domínio.

**Status por etapa:** servidor WhatsApp novo instalado; ZIP compilado e validado; Cloudflare **ainda não atualizado** pelo ChatGPT; Safari/iPhone e Instagram físicos **ainda não homologados**; 58 localidades cotáveis, 56 com contato manual / A confirmar. **Rollback:** se após upload houver erro visual, voltar primeiro ao deployment Cloudflare anterior comprovado e manter WA v27 por compatibilidade com cliente antigo. Só reimplantar WA v26 arquivada se houver falha própria confirmada e depois de garantir frontend antigo. Identificador do deployment Cloudflare anterior não acessível nesta integração. Não ativar `DELIVERY_LEGACY_REVIEW_GUARD` nem `DELIVERY_REQUIRE_LOCALITY_ID` sem nova observação operacional. **Próxima ação do proprietário:** fazer backup/anotar deployment atual no painel Cloudflare, publicar o ZIP, testar seleção/taxa e finalização WhatsApp e monitorar primeiros pedidos. Se a produção atual tiver canal site/MP ativado de modo diferente do ZIP de referência, **não substituir** por este perfil; nesse caso gerar pacote com o mesmo perfil publicado e manter `create-order` v14 até compatibilização separada.


## 24. Ajuste aprovado de comunicação e precisão de busca no checkout (05/11/2026)

- Pedido atual: implementar microtextos e proteção contra associação entre bairros com numerais diferentes, após screenshot e vídeo do iPhone. Branch `work/entrega-busca-bairros-segura-20261105`, HEAD anterior `e19cadeeebcb27e1b4594e8d26fc30ae8d943e4d`.
- Frontend somente: título "Bairro ou local de entrega", placeholder com dois exemplos, orientação de uma frase, retirada do aviso redundante ao final da ficha; o prazo, avisos de tarifas não homologadas e botão de WhatsApp são preservados.
- Novo `filterDeliveryNumberConflicts` na apresentação recusa resultados de busca aproximada se o sufixo numérico do local não corresponder: não trocar "Parque 3" por "Parque IV". Letras e números romanos normais continuam aceitos quando realmente equivalentes; o backend autoritativo e os IDs não mudam.
- Testes Node e WebKit ampliados. **CI do novo SHA a conferir antes de empacotar ZIP**. Função comercial WhatsApp v27 instalada anteriormente **não é modificada**; não tocar Mercado Pago, SQL, estoque, CRM, flags ou domínio Cloudflare.


### 24.1 — Código e pacote comprovados no GitHub Actions

**Código:** `95907ca1d7ec9c87cb6443f31ca80b7968581673`, [CI 42111993368](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42111993368) **SUCCESS nos quatro jobs**. Verificados 21/21 testes especializados de entregas, 12/12 testes isolados dos handlers, **752/752 regressões comerciais**, Deno check, TypeScript sem erros novos, build e WebKit automatizado **320×568, 375×667, 390×844, 430×932**. A busca não associa `Parque 3` a `Parque IV`; `Parque 4` pode sugerir IV, mas a taxa continua pendente; `Promissão 3` corresponde a III. Artefato WebKit #13455505802 com capturas; ZIP conectado #13454552270. Os screenshots WebKit são da lista de sugestões, não prova de aprovação visual final do formulário completo.

**ZIP para Cloudflare manual:** `luciane-oliveira-doces-refino-bairros-20261105-cloudflare.zip` extraído do artefato de build do SHA `95907ca1d7ec9c87cb6443f31ca80b7968581673`, 72 arquivos, 4.567.438 bytes, SHA256 `231e81d19b46f0cb3d4bf2e4e53b82bf3a191b3b865897bbb896e45c8dae1cc0`. Parâmetros públicos: Supabase comercial, modo WhatsApp somente, sem pagamento online. Sem chaves secretas no ZIP. Código de preços, IDs e funções Edge inalterados nesta revisão; Supabase `create-whatsapp-order` v27 permanece ACTIVE e `create-order` v14 permanece ACTIVE.

**Publicação real:** ZIP preparado e linkado ao usuário, mas sem upload realizado pelo agente no Cloudflare. Proprietário publicará manualmente. Recomendado testar no iPhone a nova frase completa, rolagem, seleção e taxa, recuperação do carrinho e envio WhatsApp após subir. Não declarar teste físico completo aprovado pelo WebKit do CI. PR #6 permanece draft e sem merge; Luciane Gestão intocado.


## 25. Duas tarifas adicionais aprovadas e 54 localidades ainda pendentes (05/11/2026)

- Pedido do proprietário: **Módulo I (Centro)** e **Trecho Seco** custam R$ 8 por entrega, e ele aceita conferir as demais localidades pendentes por grupos. Ele pediu a lista completa; enviada na conversa com 29 nomes associados à zona urbana sem homologação e 25 sem zona confirmada.
- Alteração candidata: `modulo-i-centro` agora explicitamente confirmado para zona `cidade`, com alias `Centro`; `trecho-seco` passa de sem zona para `cidade` e é explicitamente confirmado. Testes server/client/equivalência da busca e auditoria atualizados. Matriz comercial revisada para **114 no total, 60 cotáveis, 54 pendentes** (29 prováveis urbanas +25 sem zona, 35 homologadas em 05/11 com 30 a R$ 8 e cinco a R$ 10).
- **Estado:** código editado em branch para testar; resultado CI específico deve ser verificado antes de release. Edge WhatsApp v27 anterior ainda exige atualização do módulo `delivery-localities.mjs` para refletir essas duas novas liberações. Cloudflare publicado pelo proprietário pode manter pacote anterior até um único lote de tarifas ser reunido. **Não chamar código da branch de publicado.**


## 26. Grupos numerados e locais subordinados: incremento candidato (05/11/2026)

- Pedido atual: não tratar condomínios e loteamentos como bairros autônomos; compartilhar a taxa informada por família de bairro para subdivisões numeradas, sem fundir IDs ou supor valores para destinos desconhecidos.
- Novo código: Camboatã I/III, Jardim Camboatã/II, Módulo II, Parque IV, Uraim II/III R$ 8; Laércio Cabeline II e Sidilândia I/II R$ 10. Camboatã III é novo ID mencionado pelo proprietário. Promissão I–IV, Centro, Trecho Seco e demais tarifas homologadas permanecem.
- Quatro referências subordinadas explicitamente exemplificadas ficam ocultas apenas das sugestões da interface, mantendo os registros internos; orientação contextual para selecionar o bairro e informar o condomínio no Complemento. Não converter nenhum complemento em bairro nem atribuir preço à referência por aproximação.
- Fonte de vínculos históricos: Prefeitura/Câmara de Paragominas, anexos do Plano Municipal pela Primeira Infância 2022–2032 (páginas 12–13). **Os valores vêm do proprietário, nunca do documento**.
- Contagens esperadas: 115 localidades (71 com valor, 44 pendentes), 43 zona cidade cotáveis, 28 destinos especiais cotáveis, 22 urbanos pendentes e 22 sem zona. **CI e status do código devem ser verificados**; nenhum deploy, SQL, pagamento, alteração de pedido, Edge ou Cloudflare foi executado nesta etapa. A Edge WhatsApp v27 ainda usa o catálogo anterior; o novo frontend só pode ser publicado depois de atualizar o backend compatível e gerar um ZIP atualizado.
