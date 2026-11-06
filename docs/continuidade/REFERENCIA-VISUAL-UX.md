# Referência Visual & UX — Site Comercial Luciane Oliveira Doces

**Protocolo permanente instituído em 05/11/2026.**  
**Função:** preservar o nível de refinamento, as aprovações e as opções conscientemente rejeitadas, sem impor um template rígido a cada produto.  
**Origem:** Prompt Mestre Oficial 4.0, `ESTADO_ATUAL_VITRINE.md`, `BOUTIQUE_EDITORIAL_PREVIEW_CONTINUIDADE.md`, documentos de vitrine/refinamento de novembro e testes/código na linha integrada. **Não** pressupõe que toda tela atual tenha sido aprovada em Safari físico.

## 1. Uma régua de qualidade que sobrevive às conversas

O proprietário valoriza evolução acumulativa: a resposta não é “mudar cor”, mas **tornar a jornada mais clara, agradável e efetiva sem voltar atrás em decisões aprovadas**. A comparação deve usar a **versão anterior efetivamente aprovada** daquele componente, não uma versão de `main` há semanas defasada nem um ZIP que contenha fotos não versionadas.

Uma decisão visual registra sempre:
- **Referência:** branch, commit, foto e screenshot/vídeo (se acessível).
- **Problema visto:** o que a pessoa percebeu ou teve dificuldade para fazer, e em qual tamanho/navegador.
- **Escolha adotada:** hierarquia, proporção, texto, localização da ação, movimento, enquadramento, contraste.
- **Elementos protegidos:** o que **não** deve mudar sem novo escopo.
- **Prova:** captura antes/depois verificada, viewport, Chromium/WebKit/Safari físico/Instagram; resultado dos testes.
- **Grau de aprovação:** proposta de assistente ≠ implementada ≠ validada tecnicamente ≠ aprovada visualmente pelo usuário ≠ publicada.

**Não inventar screenshots, preferência de um áudio não transcrito ou aprovação da Luciane.** Se não houver arquivo original, o histórico só demonstra uma decisão documentada naquela época; o usuário pode alterar sua preferência com uma nova avaliação.

## 2. Linguagem visual durável

| Dimensão | Direção | Armadilha a evitar |
|---|---|---|
| Atmosfera | Confeitaria artesanal com sofisticação editorial | “Site luxuoso” genérico e excessivamente ornamentado |
| Cores | Chocolate profundo, cappuccino, creme, cobre e dourado muito discreto | Dourado vivo, branco chapado regressivo, gradientes pesados |
| Fotografias | Produto real protagonista, tonalidade verdadeira e embalagem reconhecível | Foto de IA substituindo alimento real, corte enganoso, filtro que altera sabor/volume |
| Texto | Títulos curtos, naturais, com hierarquia e proposta de escolha | Marca/título repetido, parágrafos longos antes do primeiro produto |
| Controles | Ação principal inequívoca; secundárias discretas; estado escolhido e desabilitado visíveis | Falsos botões, CTAs iguais levando ao mesmo destino, indicação de preço como opção clicável |
| Componentes | Reutilização coerente e proporcional às categorias | Um único molde que imponha passos irrelevantes ou cortes de imagem |
| Movimento | Discreto, contextual, foco correto, `prefers-reduced-motion` | Animações intermináveis, rolagem sem próximo controle visível |
| Mobile | Primeira dobra útil, telas 320–430 px, targets e tipografia confortáveis | Hero tão alto que esconde a primeira escolha, overflow, sticky cobrindo seleção |
| Performance | Imagens reais otimizadas, dimensões estáveis, carregamento com feedback | Layout shift, download de imagens não usadas, efeitos caros sem benefício claro |

A tipografia, os tokens e CSS **vigentes** devem ser auditados no código antes de mudar. A cor de uma imagem aprovada **não** é licença para alterar preço, catálogo, data de campanha ou disponibilidade.

## 3. Vitrine inicial — decisões da sequência editorial

**Fontes históricas:** `docs/VITRINE-COLECOES-20261102.md`, `docs/VITRINE-PREMIUM-RECONSTRUCAO-20261102.md`, `docs/VITRINE-PREMIUM-REFINO-EQUILIBRIO-20261102.md`; `app/page.tsx`, `app/storefront-collection-premium.css`.

**Última direção documentada (02/11):**
- Entrada com apresentação compacta e foco no **produto + escolha**, não em uma longa introdução.
- Trufadas pode ter cartão destacado, mas não deve esmagar Gourmet e Fatias ou transformar prioridade temporária em regra permanente.
- Trufadas com imagens de **Ninho e Paçoca como dois elementos reais independentes** no quadro, evitando pseudo-elemento que corta a foto da direita.
- Faixa de entrega/preparo discreta e posterior à escolha; dados operacionais continuam visíveis no lugar certo.
- Título já refinado para linguagem curta (“Cardápio artesanal” / “Escolha seu doce.”) na candidata documentada; validar o conteúdo vigente antes de mudar, sem assumir que título de outubro é atual.
- Cards complementares com botões alinhados, áreas de toque confortáveis e apresentação responsiva; mobile com dois complementos lado a lado a partir de 351px na candidata, alternativa empilhada em largura menor.
- A vitrine deve preservar parâmetros de campanha (`UTM`, `fbclid`, Tintim) e retornar à categoria certa. Links históricos não podem quebrar.

**Não regredir:** voltar a uma lista branca antiquada, títulos duplicados, campanha que força uma categoria para todos, imagens artificiais, banners desproporcionais.

**Grau de prova:** implementado em linhas que são ancestrais do HEAD candidato 03/11; documento cita ensaios Chromium/WebKit da época, **não equivale a aprovação atual de Safari físico nem deployment comprovado**.

## 4. Fotografias de categoria e decisões v10.7

`ESTADO_ATUAL_VITRINE.md` registra aprovação visual no Safari em 14/10 para **fotografias e enquadramento específicos**, não para todos os layouts futuros:
- **Gourmet**: `public/images/categoria-pipocas-editorial-enquadrada-v107.webp`, pote real em tom cappuccino, corpo/aro íntegro, respiro sutil acima e abaixo.
- **Fatias**: `public/images/categoria-fatias-editorial.webp`, fotografia original, sem molduras bege artificiais.
- O alias de fallback e outras imagens foram documentados à época; **checar arquivos versionados na branch usada** antes de renderizar ou gerar pacote.

O projeto já teve incidente de foto aprovada disponível em ZIP e ausente no GitHub. **Reproducibilidade requer asset versionado**, não apenas captura do chat. Não mover nomes e IDs sem verificar referências. Fotos dos sabores de Trufadas P/M/G, incluindo Ninho, Paçoca e Coco Queimado, devem ter correspondência real com o produto escolhido.

**Em refinamento:** pode melhorar moldura, `object-position`, distribuição do texto, altura e carregamento sem alterar a aparência do alimento. Novo recorte deve ser comparado ao anterior; não regenerar por IA sem instrução.

## 5. Pipocas Gourmet — configurador e rolagem contextual

**Fontes:** `docs/GOURMET-CONVERSAO-REFINAMENTO-20261102.md`, `docs/ESTADO_INTEGRADO_COMERCIAL.md`, `tests/gourmet-rolagem-contextual-20261103.test.mjs`.

- **Tamanho primeiro:** cartões realmente interativos e uniformes para 500 ml, 750 ml e 1 litro conforme o contrato histórico de novembro. Não confundir cartões de preço informativos com controles de seleção.
- **Recheio:** preço dinâmico conforme maior grupo selecionado (regra comercial, não soma de adicionais). Não repetir explicação da mesma regra no preview e no rodapé.
- **Scroll correto:** ao selecionar tamanho ou clicar CTA contextual, levar ao primeiro controle acionável — não ao topo decorativo; em altura limitada, priorizar o campo que a pessoa realmente usará.
- **Preview:** visual vivo porém compacto, fotografia verdadeira, preço/tamanho atualizados, CTA com destino, estados de erro/esgotado/carregando claros.
- **Campanhas:** bloco editorial compacto e preço promocional apenas onde o desconto é real; campanha encerrada não deve permanecer na apresentação normal. Datas históricas 02–03/11 **não são ofertas atuais**.

**Não regredir:** blocos repetitivos com preço antes da escolha, CTA que salta para título mas não para campo, promoção com desconto fictício, foto tão alta que empurra todo o configurador.

**Prova:** branch `work/gourmet-rolagem-contexto-premium-20261103` e SHA `62f7780...` possuem workflow `package` concluído com sucesso; isso valida o candidato técnico, não o comportamento publicado.

## 6. Pipocas Trufadas — hierarquia Sabor → Tamanho → Quantidade

**Fontes:** `docs/TRUFADAS-CONFIGURADOR-PREMIUM-20261102.md`, `docs/TRUFADAS-SAFARI-UX-20261101.md`, `docs/TRUFADAS-PMG-PLANO-20261101.md`.

- Compartilha cabeçalho superior com Gourmet/Fatias: **não redesenhar o cabeçalho comum** para consertar um problema restrito ao configurador.
- Três cartões com fotos reais de sabores, seguida de opções P/M/G com preço/saldo corretos; quantidade e subtotal imediatos antes do CTA.
- Sem repetir títulos internos ou colocar uma nova barra de preço se já existe preço contextual.
- Cada ação tem estado verdadeiro: **loja fechada** (“Pedidos pausados”), **SKU esgotado**, **sem estoque consultado** e **seleção incompleta** são situações diferentes.
- Transições discretas, seleção tátil, foco acessível e movimento reduzido; recomendações adjacentes (“Conheça também” antes de adição; “Complete seu pedido” depois) seguem o estado real do carrinho.
- Não sugerir “Em estoque” como sinônimo de compra possível quando a loja está pausada.

**Não regredir:** SKU/estoque por combinação, preço por tamanho, assets aprovados, IDs legados, checkout/WhatsApp/cozinha. **A aprovação visual não substitui teste ponta a ponta do pedido.**

## 7. Fatias — escolha simples e pré-reservas honestas

- Mostrar produtos de fato disponíveis, preço e foto correspondente, com escolhas curtas.
- Se houver pré-reserva de Chocolate com Morango, respeitar lote/data/capacidade e unidades comprometidas por WhatsApp externo e site; **não apresentar reserva como estoque pronta-entrega**.
- A fatia Coco Cremoso com Morango possui imagens de produto/cartão e histórico de recuperação; verificar ambos os caminhos. Não usar foto de sabor errado para preencher espaço em branco.
- Produto sem foto válida deve ter fallback honesto, sem geração de novo alimento sem autorização.
- O histórico de “Últimas Fatias” e campanhas de fim de semana não prova que a campanha está ativa hoje.

## 8. Carrinho, checkout e finalização — clareza depois do clique

**Fonte:** `docs/WHATSAPP-FINALIZACAO-RECUPERAVEL-20261102.md`, `docs/INCIDENTE-CHECKOUT-TRUFADAS-20261101.md`, `components/whatsapp-order-result.tsx`, `app/pedido/page.tsx`.

- Resumo do pedido e pagamento deve corresponder **ao registro salvo**, não a seleções antigas.
- A tela pós-pedido favorece **um botão principal** de envio ao WhatsApp; alternativa de consulta discreta.
- Mensagem condicional: chave Pix só no Pix; crédito/débito/dinheiro exibem instruções pertinentes.
- Ao voltar para “Ver pedido”, permitir recuperar o mesmo link da sessão/token corretos; se outra sessão, oferecer contato assistido sem inventar mensagem original.
- Abrir WhatsApp ≠ enviar mensagem; status “Recebido pela loja” não quer dizer Pix aprovado.
- A hierarquia visual reduz abandono sem forçar nova transação nem ocultar estado.

**Não regredir:** botão duplicado, resumo excessivo, perda de sessão ao voltar, caminhos sem saída, inferência de envio/pagamento pela abertura de aplicativo.

## 9. Painel da Luciane — eficiência antes de ornamentação

**Fonte:** `docs/ADMIN-DISPONIBILIDADE-PREMIUM-20261102.md` e documentos de cozinha/CRM.

- Disponibilidade: um painel de categoria por vez, sabor/tamanho facilmente localizável; formulário **somente do item selecionado**; estado de loja geral em evidência, detalhamento avançado recolhido.
- Nas Trufadas, mostrar “livres para novos pedidos”, confirmar como cálculo `total físico = livres + comprometidos` antes da RPC; estado de reserva não é estado de pagamento.
- Diferenciar salvar/descartar/alteração pendente; reconferir versão do estoque antes de escrever; não permitir ação sobre valor indisponível ou carregamento falho.
- Pedidos e cozinha: ações com status verdadeiro, fila, alerta, QZ e erro legível; não condensar controles importantes para ganhar espaço visual e perder segurança.

**Não regredir:** painel com nove formulários completos simultâneos, mudança de categoria descartando edição, botão “Ativar” que altera linhas não relacionadas.

## 10. Processo de refinamento visual contínuo

**Antes:**
1. Localizar **componente e branch certos**. Registrar base de comparação: captura/commit do que já estava bom (se disponível).
2. Responder: o que está excessivo, redundante, escondido ou inconsistente? Qual comportamento precisamos melhorar?
3. Listar apenas os elementos protegidos pelo contrato (fotos, ID, preço, estado, CTA, layout da categoria compartilhada).
4. Definir prova visível em mobile/desktop e quais partes requerem navegador real.

**Depois:**
1. Comparar **mesmas páginas, estados e viewports** em antes/depois, se as capturas foram realmente geradas. Não comparar DOM de duas versões de produtos diferentes como se fosse melhoria controlada.
2. Confirmar desempenho, leitura, toque, contraste, foco, retorno, estado de loja fechada e preço real.
3. Registrar o que **mudou** e o que **continuou** no próximo bloco de decisões visuais com SHA e prova.
4. Se o usuário rejeitar o resultado, documentar rejeição concreta. Não insistir em reproduzir uma “aprovação” inexistente.
5. Atualizar checkpoint de código/deploy separadamente. Um excelente novo design em ZIP **ainda não é produção**.

### Modelo de ficha visual

```md
### UX-XX — Categoria/Componente
- Data e autor da aprovação:
- Comparação de origem: branch/SHA/URL/capturas:
- Problema e jornada:
- Solução visual aprovada (proporção, foto, CTA, ordem, espaçamento):
- Elementos intocáveis e dependências de catálogo/pagamento/estoque:
- Evidência em 320/375/390/430/desktop:
- Safari físico/Instagram: testado ou pendente:
- Estado: proposta / código / testes / aprovação visual / publicação:
- Próxima hipótese de refinamento:
```

**Este arquivo é a “memória do bom” do site:** pode ser melhorado com nova aprovação, mas não deve ser descartado quando uma conversa terminar.


### UX-CANDIDATA-20261105 — Busca contextual de bairro na entrega

- **Problema observado:** menu longo de tarifas por região seguido de bairro livre no fluxo de recebimento; risco de cobrar tarifa urbana por região especial.
- **Direção aceita em conversa:** escolher localidade pesquisável por nome/variante, exibir taxa verdadeira após seleção e só então rua/número/complemento. Sem GPS obrigatório. Contato assistido quando a localidade não tem tarifa homologada.
- **Implementação em revisão:** `components/delivery-locality-picker.tsx`, `app/delivery-locality.css`, `app/page.tsx` na branch `work/entrega-busca-bairros-segura-20261105`.
- **Protegido:** proporção e tonalidade da experiência de checkout já existente, preço final, formas de pagamento, jornada WhatsApp, captura de campanhas, pedidos e impressão.
- **Grau de aprovação:** conceito aprovado; UI codificada como **candidata**. Não houve ainda confronto visual aprovado em Safari/iPhone, WebKit ou publicação comprovada. Não registrar como visual final.


### UX-CANDIDATA-20261105.2 — Teclado móvel, busca persistente e grid de entrega

- **Origem:** continuidade do refinamento de entregas, ainda na PR #6. Foco no usuário de iPhone que busca bairro com teclado virtual aberto e no checkout desktop em duas colunas.
- **Candidato codificado:** a lista de bairros mede o espaço via `visualViewport` e pode aparecer acima/abaixo do campo; altura limitada e rolagem própria. Buscador e etiqueta de taxa ocupam **largura integral** no grid desktop. O texto digitado não é apagado quando a pessoa modifica uma seleção existente, mas é reconciliado quando muda externamente. Contato assistido aparece somente para bairro pendente selecionado ou busca sem resultados.
- **Contrato protegido:** nenhuma mudança de tarifa ou de identidade de localidades; 89 localidades não homologadas continuam sem cotação. Não alterar estética global de Gourmet, Trufadas, Fatias, checkout financeiro, WhatsApp ou painel.
- **Evidência técnica:** `components/delivery-picker-logic.mjs`, `components/delivery-locality-picker.tsx`, `app/delivery-locality.css`; [CI do código `89ff2890`](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42075931114), com 10 testes especializados, 724 regressões e build aprovados.
- **Evidência visual:** **não existe ainda screenshot comparativa em 320/375/390/430 px ou teste físico no Safari/Instagram**. O layout é candidato para homologação, não visual aprovado nem publicado.


### UX-APROVADA-20261105.3 — Microtextos e numeração exata na busca de bairros

- **Aprovação do proprietário:** após avaliar a tela em iPhone, aceitou encurtar o título para "Bairro ou local de entrega", usar placeholder "Ex.: Promissão II, Açaizal..." e a orientação direta "Digite seu bairro e selecione uma opção da lista para ver a taxa de entrega.".
- **Limpeza visual:** retirar somente a nota redundante após os campos ("A taxa é calculada pelo local escolhido..."), sem omitir o prazo de entrega, sem alterar cartões, cores, layout ou resumo financeiro.
- **Proteção contra falso nome próximo:** a busca aproximada podia sugerir "Parque IV" para "Parque 3" por diferença de um caractere. Aplicar filtro exclusivo de resultados na interface, exigindo coincidência de todos os tokens numéricos (romanos já normalizados), preservando "Promissão 3" → "Promissão III" e buscas textuais sem número. **Não** modificar catálogo compartilhado, ID, valor, backend ou zonas.
- **Prova exigida:** testes de regra e WebKit 320/375/390/430 com "Parque 3" ausente, "Parque 4" correspondente a IV sem tarifa presumida, e restauração do checkout. Safari/Instagram físico continua prova posterior.
- **Estado:** revisão aprovada, implementação em branch e CI a conferir; publicação Cloudflare posterior será manual.


- **Evidência posterior da aprovação:** SHA `95907ca1d7ec9c87cb6443f31ca80b7968581673`, [CI 42111993368](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42111993368) aprovada em WebKit 320/375/390/430, 21 testes de entregas, 752 regressões e build. Verificada geração de ZIP conectado ao Supabase para publicação manual. Não existe ainda inspeção do novo texto em Safari físico após publicação.

### UX-CANDIDATA-20261106.1 — Recomendações integradas depois de adicionar um item

- **Comparação:** screenshots e gravações do proprietário no navegador interno Instagram (06/11). Origem técnica: `work/entrega-busca-bairros-segura-20261105` @ `a9d391bd62112400021f06b6e7cb7efa0913140a`; candidata: PR #7 `work/checkout-complementos-contextuais-premium-20261106`.
- **Preservar:** três categorias da entrada e suas fotografias, card de confirmação do produto, carrinho editável, estoque operacional, formulário entrega/retirada e botão flutuante de orientação. A forma de evolução é incremental, sem novo passo obrigatório.
- **Intervenção:** três cartões de recomendação **somente quando respectivos destinos são selecionáveis**: miniatura real, título contextual, ação de escolha; primeiro outra categoria antes de repetir a original. Cartões verticais compactos no celular; alinhamento responsivo no desktop. Texto “Se preferir, escolha entrega ou retirada logo abaixo” reforça que sugestão não bloqueia a compra. Enquanto confirmação temporária aparece, os atalhos antigos do carrinho são escondidos; ao escolher recebimento reaparecem.
- **Visual protegível:** paleta chocolate/creme, sombras leves, bordas discretas, imagens reais já versionadas `categoria-pipocas-editorial-enquadrada-v107.webp`, `categoria-fatias-editorial.webp` e `pipocas-trufadas-ninho-20261101.webp`; miniaturas decorativas sem criar outra promessa de produto.
- **Evidência técnica inicial:** QA WebKit em telas 320, 375, 390 e 430, nos estados Fatias disponível/esgotada (8 cenários), screenshots no Artifact `QA-ENTREGAS-WEBKIT-NAO-PUBLICAR` da [CI 42280557269](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42280557269). Essa evidência antecede um ajuste tipográfico de legibilidade; verificar CI do SHA final. Não houve execução de pedido ou pagamento real.
- **Grau de aprovação:** direção e implementação autorizadas; **novo resultado visual ainda necessita aprovação do proprietário** após inspecionar capturas/preview. WebKit automatizado não substitui teste em Safari físico/Instagram nem prova de publicação.


### UX-CANDIDATA-20261106.2 — Gourmet progressivo e combinação editável

- **Origem:** autorização expressa do proprietário em 06/11 para refinar o configurador Gourmet sem alterar a home e mantendo conversão, clareza e estética artesanal. Baseline funcional/visual `work/checkout-complementos-contextuais-premium-20261106` @ `19ec6cfe1af04bb57c3a24cd9a70a8a5260948d6`; revisão `work/gourmet-progressao-revisao-premium-20261106` / PR #8.
- **Preservar:** grade 500/750ml/1L, preview Gourmet com foto real, regra de preço pelo maior grupo, informação sobre sabores, ordem tamanho → sabores → quantidade, preenchimento do carrinho, rolagem contextual e barra flutuante; não recriar peças visuais aprovadas.
- **Novidade localizada:** contador 0/2 ou 0/3 com pequenos segmentos preenchidos; “Sua combinação” mantém a posição e passa a ter chips com ação de remover sabor individual, ícone de fechamento e rótulos acessíveis. Nenhuma etapa obrigatória, preço adicional, pop-up, foto nova ou incentivo artificial. O usuário continua usando o checkbox da lista para selecionar/reselecionar.
- **Acabamento:** paleta chocolate/cappuccino/creme, foco visível, toque amplo de 43 px, contraste legível em 320 px, estado de movimento reduzido; alterações exclusivamente em `app/page.tsx` e `app/gourmet-steps.css` para UI.
- **Grau de aprovação:** conceito e construção autorizados; **novo resultado visual é candidato** até homologação técnica (CI, screenshots WebKit) e eventual avaliação do proprietário em Safari/Instagram físico. Não confundir lançamento do PR com publicação Cloudflare.


**Evidência técnica posterior da candidata Gourmet (06/11):** [CI 42293702356](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42293702356), fonte `55c8ab5ed7a24ddc08b3d0a0468d6d3f917be49a`, quatro jobs aprovados. WebKit 320/375/390/430 aprovou troca direta de sabores no resumo, atualização do preço por maior grupo, quantidade e inclusão em carrinho; screenshots `gourmet-revisao-{320,375,390,430}.png` no artifact `13541670333`. As capturas mostram resumo compacto, caracteres legíveis e as ações de remover com foco; **não** atribuir aprovação estética final do proprietário nem publicação só por CI.

### UX-CANDIDATA-20261106.3 — Legenda de impacto nos sabores Gourmet

- **Preservar** a identidade aprovada (paleta, cartões, preview com foto e preço em destaque, chips editáveis e sticky CTA) da PR #8; **nenhuma mudança estrutural ou de CSS**.
- Os preços dos cartões são referências do pote *com aquele sabor*; a combinação inteira mantém o preço do grupo mais caro. Não somar valores, não inferir adicional individual.
- Legendas do efeito da decisão: primeiro sabor base → `Preço base`; primeiro sabor especial → `Pote fica por R$ X`; sabor adicional que não eleva o preço → `Mantém R$ X`; sabor que eleva o preço → `Pote vai para R$ X`. Os rótulos de leitores de tela explicam que o **preço do pote** se mantém ou muda.
- **Verificação:** fonte PR #9 `a7769c88e51d9aebb0d70c3fac3d27a0f9731b96`, [CI 42296935358](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42296935358) aprovada 4/4; WebKit 320, 375, 390 e 430 px inclui o exemplo de 1 L com Leitinho/Ovomaltine/Nutella; avaliação final pelo proprietário após eventual publicação continua distinta.

### UX-CANDIDATA-20261106.4 — Gourmet: liberdade de sabores com próxima ação evidente

- **Texto aprovado:** `Escolha de 1 até 2 sabores. Você decide quantos combinar.`, com limite dinâmico de 3 no tamanho 1 litro. Sem microcopy extra de urgência ou pressão para escolher o máximo.
- **Resumo:** `Seus sabores` compacto, alinhado ao design chocolate/cappuccino, com os sabores removíveis e sem título, contador e instrução redundantes; progressão superior 1/2, 2/3 etc permanece.
- **Barra:** reutilizar a barra flutuante original, não acrescentar outra. No meio da grade, com 1 ou 2 de 3 sabores, alterna para `Continuar com N sabor(es)`, tamanho compacto, área segura e foco acessível; deve sumir quando o botão inline ou a etapa da quantidade já estejam visíveis. A grade deve continuar tocável e rolar normalmente.
- **QA:** [CI 42303415543](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42303415543), 4/4 jobs aprovados; screenshots de barra compacta em 320/375/390/430px no artifact `QA-ENTREGAS-WEBKIT-NAO-PUBLICAR` ID `13544184735`, sem sobreposição impeditiva nos cenários exercitados. **Sem equivaler a aceite em Safari físico ou deploy.**
