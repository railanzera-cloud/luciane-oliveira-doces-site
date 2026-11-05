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
