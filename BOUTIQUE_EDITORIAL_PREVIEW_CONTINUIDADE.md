# Vitrine Editorial Experimental — continuidade

- Branch: `design/luciane-editorial-vitrine-experiment-20261013`.
- Último commit de implementação verificado antes deste documento: `85ffd3ecde48594c95647f8d9fba9870d6431208`.
- GitHub Actions validado: execução `38383520819`, concluída com sucesso.
- Escopo: exclusivamente vitrine neutra inicial (entrada, categorias), preservando carrinho, checkout, preços, rastreamento, pagamentos e todas as regras comerciais.
- Estilo da proposta: superfícies chocolate acetinado `#51362a` / `#442d23` / `#322017`, tipografia creme e cobre, fotografias separadas das legendas, CTA explícito, cards compactos e proporcionais.
- `app/page.tsx` já referencia `/images/categoria-fatias-editorial.webp` exclusivamente na imagem de categoria e usa foto original do catálogo como fallback.
- **Atualização de estado:** a foto binária original tratada **foi gravada** no repositório no commit `daaeffa2f49e52e9eb61aeba43793b6d82e97e44`, em `public/images/categoria-fatias-editorial.webp`.
- SHA-1 Git blob `a0b13b390b4d1421e6742425b679048d810ea8a5` corresponde ao arquivo local validado.
- A execução GitHub Actions `38384179164` foi aprovada após o commit do arquivo. Priorizar esse build do repositório para publicação como Preview.
- Um ZIP de Preview local foi montado durante a recuperação antes da confirmação desse commit; prefira o artefato final do GitHub quando recuperado e validado.
- SHA-256 da foto incluída no Preview: `16543666808bd0b9c1ea47d4ed124d7573bd8509dc9292fea5226ef37d193c41`.
- SHA-256 do ZIP final local: `535a5fdf447cdabe8a82a035489e6e46b1621133c8c1b7090e198b0552665768`.
- **Recompilação:** a foto já está no repositório no caminho esperado. Verificar sua presença no ZIP gerado antes de publicar.
- Navegador Chromium local: inspeção HTTP foi bloqueada por `net::ERR_BLOCKED_BY_ADMINISTRATOR`; o visual ainda depende da homologação no Safari/iPhone.
- Não promover automaticamente à produção nem mesclar com a Boutique 4.6 trabalhada no Work.


## Preview experimental com fotografias escolhidas — 13/10/2026

O usuário escolheu duas **fotografias específicas**, sem novas gerações nem retoque artístico:
- Pipoca: arquivo original de fundo cinza, pote completo na mão; otimizado a 1000×750, SHA-256 WebP `9aaaf723a52e0c357ad6b2c44e690eb7937dde1abf091a6240bce95185d9a262`.
- Fatia: fotografia quadrada no prato branco, morangos, creme e chocolate **sem calda adicional por cima**; otimizada a 1000×1000, SHA-256 WebP `c795378b1e47afc681f4e4ee03fa7f2d6490a2129abc9eb8e83556cf1b92f8dd`.
- A terceira imagem enviada era apenas referência de disposição dos cartões.
- Os arquivos JPG originais foram fornecidos no chat; nenhum novo produto foi gerado para esta etapa.

**Código fonte atualizado**: a vitrine usa `/images/categoria-pipocas-editorial.webp` e `/images/categoria-fatias-editorial.webp` com fallback para as imagens originais do catálogo, e CSS localizado em `.storefront .menu-entry.is-neutral`. O pote usa `object-fit: contain` para manter o pote completo e a mão; a fatia usa `object-fit: cover` sem filtros.

**Atenção ao sincronizar / recompilar**: o conector GitHub disponível neste turno não enviou as duas imagens binárias novas ao repositório. O ZIP de Preview Cloudflare foi montado do artefato CI validado na execução `38390406177` e então recebeu *somente* os dois arquivos de imagem; os demais arquivos compilados ficaram idênticos. O repositório ainda contém uma versão anterior da foto da fatia e não contém o novo arquivo da pipoca. Para tornar os próximos builds reproduzíveis, adicionar:
- `public/images/categoria-pipocas-editorial.webp` (hash acima);
- substituir `public/images/categoria-fatias-editorial.webp` (hash acima).

ZIP de Preview local entregue ao usuário: `Luciane_Vitrine_Fotos_Selecionadas_Preview_Cloudflare.zip`, SHA-256 `757ecbad494e9eaae8b947593449e2c97c9c761f3ad72473bc4d281222476d62`, 55 arquivos, ZIP íntegro.

A inspeção no Chromium local foi bloqueada por `ERR_BLOCKED_BY_ADMINISTRATOR`. Validar a composição no Safari iPhone antes de publicar produção. Não alterar compras, checkout, Supabase, pagamentos, rastreamento ou Boutique 4.6 do Work.


## Editorial v7 — cards compactos e fotografias definitivas (13/10/2026)

**Implementação de CSS:** commit `dd5866f41f10367cf49a01d5c9ca881e479b3c07` na branch experimental. CI `38395752275` aprovado (build, TypeScript e testes). Único arquivo de código alterado: `app/storefront-vitrine-editorial-experiment.css`. Nenhuma mudança nas regras comerciais, Boutique 4.6, Supabase ou produção.

**Direção visual da referência aprovada:**
- Reduzir altura mobile dos cards de 190px para 180px (190px nas telas até 359px), gap de 10px; fotografia à esquerda 49%, legenda à direita 51% no mobile padrão.
- Manter cores da marca; superfície de legenda um pouco mais profunda, textos creme/cobre e ações originais.
- Pipoca em `object-fit:cover` com ajuste delicado de intensidade para remover barras cinzas e integração artificial; fatia em `cover`, sem retoque.
- Fotos **definitivas enviadas pelo usuário**: pote com dois recheios e mão segurando, em cenário quente; fatia de chocolate com creme e morangos no prato branco, sem calda adicional por cima. Não substituir por imagens geradas.
- Verificação visual isolada de card com Chromium local (`page.set_content`, viewports 320, 375, 390 e 430 CSS px) verificou dimensões e títulos sem overflow. Não equivale a homologação do site real no Safari; navegação HTTP local segue bloqueada pelo ambiente.

**Artefato Preview Cloudflare pronto no container:** `Luciane_Editorial_v7_Preview_iPhone_Cloudflare.zip` extraído do build aprovado no commit `dd5866f` (apenas os dois arquivos binários finalizados substituídos/adicionados, sem alterações nos demais arquivos compilados). ZIP testado com sucesso; 50 arquivos, SHA-256 `693835d8268027fc5fce27b25a52454a650540713a242364be25e63fb5181f93`.
- `images/categoria-pipocas-editorial.webp`: WebP 1000x750, 53.154 bytes, SHA-256 `afd6c925dc273ffc9b5ab04713af10154cc905b1932315494608ee50e57cb8df`.
- `images/categoria-fatias-editorial.webp`: WebP 900x900, 93.846 bytes, SHA-256 `83ae67d03cf683a62a000b812cc3ff4f22571bca84707a4af84ba3269bcc2286`.

**Sincronização de binários pendente no GitHub:** o conector disponível consegue gravar textos, mas não publicou os dois WebP binários. `public/images/categoria-pipocas-editorial.webp` continua ausente; `public/images/categoria-fatias-editorial.webp` continua com uma versão antiga. O ZIP experimental acima **contém os dois arquivos novos corretamente**, mas um rebuild do repositório sem sincronização das fotos NÃO reproduz o Preview. Não declarar essa sincronização como concluída. A próxima ação de GitHub deve adicionar/substituir EXATAMENTE esses arquivos com os hashes indicados; depois repetir build/testes.

**Próxima homologação:** fazer deploy apenas de Preview Cloudflare após autorização operacional; comparar composição inteira no Safari iPhone com o print aprovado, confirmar legibilidade, cortes, ações e ausência de faixa cinza. **Não publicar produção nem mesclar.**


## Vitrine editorial v7 — checkpoint visual, 13/10/2026

- Branch exclusiva: `design/luciane-editorial-vitrine-experiment-20261013`. Nunca misturar com Boutique 4.6 nem publicar produção sem autorização.
- Implementação CSS registrada no commit `dd5866f41f10367cf49a01d5c9ca881e479b3c07` (base da v7); execução GitHub Actions **38395752275** concluída com sucesso.
- A versão v7 aproxima o segundo print de referência: cards mobile com altura de **180px** (190px em telas <=359px), fotografia **49%** / legenda **51%**, intervalo de 10px, painéis chocolate mais profundos, produtos à esquerda e CTA legível à direita.
- CSS v7 é o último bloco em `app/storefront-vitrine-editorial-experiment.css` e prevalece sobre o histórico v6. Pipoca agora usa `object-fit: cover` e filtro discreto para integrar o fundo quente; fatia usa `cover` sem filtros.
- As duas fotos fornecidas pelo usuário são as definitivas desta etapa. Pipoca: pote real com dois recheios e mão, ambiente quente. Fatia: formato real no prato branco, morangos, **sem calda adicional por cima**.
- Fotos foram otimizadas em WebP, sem inventar ou redesenhar produtos; o ZIP experimental montado **a partir do build CI v7** contém `images/categoria-pipocas-editorial.webp` (53.154 bytes, SHA-256 `afd6c925dc273ffc9b5ab04713af10154cc905b1932315494608ee50e57cb8df`) e `images/categoria-fatias-editorial.webp` (93.846 bytes, SHA-256 `83ae67d03cf683a62a000b812cc3ff4f22571bca84707a4af84ba3269bcc2286`).
- Pacote de homologação: `Luciane_Editorial_v7_Preview_iPhone_Cloudflare.zip`; **50 arquivos**, ZIP íntegro, SHA-256 `a13b4ae3b3fa234a3e42420fa68d300d74fe2d03daeb89796fd23ef5f127c662`. Todos os outros 48 arquivos são idênticos, byte a byte, ao artefato de build v7 do GitHub.
- Teste visual isolado executado com CSS compilado em larguras 320, 375, 390 e 430px, sem extravasamento dos títulos. Isso **não substitui** homologação da página inteira no Safari.
- **PENDÊNCIA CRÍTICA**: os dois novos arquivos WebP ainda **não foram sincronizados** no repositório. O GitHub conserva a foto anterior da fatia e não possui a foto nova da pipoca, apesar de ambos estarem corretos no ZIP acima. O próximo build CI, até essa sincronização, não reproduzirá a prévia com as fotos corretas.
- Próxima ação exata: sincronizar os **binários correspondentes aos hashes** no caminho `public/images/` da branch experimental, rodar workflow/build e confirmar os dois arquivos no ZIP do CI; então homologar a apresentação no Safari do iPhone. Não promova produção automaticamente.
## Vitrine editorial v8 — refinamento do acabamento (13/10/2026)

- Referência aprovada: segundo print do usuário, especialmente tipografia editorial, profundidade chocolate e relógio junto ao prazo.
- Mudanças somente na entrada neutra: contraste dos títulos, descrições e CTAs; gradiente chocolate acetinado; relevo suave; ícone Clock3 no prazo de preparo.
- Tamanho dos cartões e fotografia da v7 ficam exatamente iguais. Não alterar fluxos comerciais nem a Boutique 4.6.
- Testes específicos incluídos para ícone, textos, fotos e navegação.
- Pendência: dois WebP definitivos continuam apenas no ZIP de Preview; antes de declarar que o GitHub está reproduzível, comparar hashes e sincronizar os arquivos.
- Aprovação visual completa só após Safari no iPhone. Não publicar produção.


### Build e Preview v8 validados

- Commit de implementação: `ce678fa00ccebe2dfd8f07e95f1e1998656acbd3`.
- GitHub Actions: execução **38398886837**, status **success** (build, TypeScript, testes e pacote Cloudflare).
- Artefato CI: `11814881448`. O ZIP de homologação foi reempacotado a partir deste build, substituindo exclusivamente as duas imagens da categoria já escolhidas.
- Pacote Preview: `Luciane_Editorial_v8_Preview_iPhone_Cloudflare.zip`, **50 arquivos**, 2.663.846 bytes, SHA-256 **c19f51fada251927032ec700c270a484e28f0fcb201ca1626c84307b74c84528**.
- WebP pipoca: 1000x750, SHA-256 `afd6c925dc273ffc9b5ab04713af10154cc905b1932315494608ee50e57cb8df`.
- WebP fatia: 900x900, SHA-256 `83ae67d03cf683a62a000b812cc3ff4f22571bca84707a4af84ba3269bcc2286`.
- Verificações extras: integridade do ZIP, presença de `index.html`, `admin/index.html`, `pedido/index.html` e recursos esperados, CSS v8 e relógio compilados, imagens WebP decodificáveis, nenhum arquivo do CI alterado fora das duas fotografias. Teste Chromium em composição isolada com larguras **320, 375, 390 e 430 px**, sem rolagem horizontal e com ações visíveis. **A página inteira ainda depende de homologação Safari no iPhone.**
- **Ainda pendente:** sincronizar as duas imagens binárias com GitHub. O ZIP atual serve para Preview, mas o build puro do CI não reproduz as imagens definitivas.
- **Não publicar produção**. Não alterar Boutique 4.6, checkout, Supabase, pagamentos ou rastreamento.

## Editorial v9 — acabamento fiel à referência (13/10/2026)

- Base: v8 aprovada no Safari. Alteração exclusivamente visual da entrada neutra.
- Bloco de preparo: manter relógio discreto e separar a estimativa do complemento “O prazo começa após a confirmação da loja.” em linhas consecutivas, com o texto alinhado após o ícone. Não alterar o prazo real nem o texto do catálogo.
- Título “Escolha o que deseja pedir” preservado no mesmo bloco editorial de duas linhas.
- Painéis: refinamento tonal sutil do chocolate, detalhes cobre, contraste dos títulos/descrições/CTAs; manter as duas fotos definitivas, enquadramento e tamanho dos cartões.
- Arquivos alterados: app/page.tsx, app/storefront-vitrine-editorial-experiment.css, tests/storefront-vitrine-editorial-experiment.test.mjs e este documento.
- Segurança: não publicar produção nem alterar Boutique 4.6, carrinho, checkout, Supabase, pagamentos ou rastreamento.
- Pendência: sincronizar os dois WebP definitivos no GitHub (continuam corretos apenas no ZIP de Preview), validar CI deste commit e homologar no Safari do iPhone.


### CI e Preview v9 — validação final do pacote

- Commit de implementação: `8c27bf80afc25f4ca4cd2c356b68153186ce52e5`.
- CI GitHub Actions: execução **38401287839**, **success**; artefato de build **11815356399**.
- Arquivo para homologação: `Luciane_Editorial_v9_Preview_iPhone_Cloudflare.zip`, 50 entradas, 2.664.062 bytes, SHA-256 **1326b0488c8e7726f2e71208c0ff79f228c84cfcec5b0f0e5a6ac5018a101546**.
- Comparação byte a byte com build CI: somente `images/categoria-pipocas-editorial.webp` e `images/categoria-fatias-editorial.webp` adicionada/substituída pelas fotografias aprovadas; CSS/JS/HTML/admin e demais arquivos idênticos aos do build aprovado. Fotos com os hashes registrados acima.
- Teste Chromium de composição isolada em **320, 375, 390 e 430px**: relógio alinhado; texto complementar na linha seguinte; nenhuma rolagem horizontal; CTAs contidos dentro dos cartões. Isto não substitui a conferência da página completa no Safari/iPhone.
- **Pendência:** sincronização binária das duas imagens WebP no repositório, mantendo os hashes; somente depois builds completos serão reproduzíveis sem montagem de Preview. Não publicar produção e não alterar Boutique 4.6.
 
## Ajuste pontual pós-homologação v9 — barra móvel

- Avaliação da gravação Safari: o botão contextual executa seu papel e já respeita o safe area inferior, além de sumir quando sua ação inline está visível. Não reduzir arbitrariamente a altura geral.
- Aperfeiçoamento preventivo e isolado no CSS experimental: esconder temporariamente a barra durante foco de campos de digitação em dispositivos touch até 699px, evitando disputa de espaço com teclado virtual. Radios e checkboxes continuam sem esconder a barra.
- Em viewport até 359px: margens/padding horizontais mais econômicos; alvo mínimo do botão permanece 46px.
- Nenhuma alteração em handlers, carrinho, checkout, regras comerciais, fotos ou Boutique 4.6.
- Requer conferir teclado aberto e fechado no Safari, em Preview; não publicar em produção automaticamente.


### Build de proteção mobile — 13/10/2026

- Implementação: commit `b384e60e4e29cdd514b9959e2a3e68b6a17b21dc` apenas CSS, teste estático e documentação.
- CI GitHub Actions **38403894544**: **success** (build, tipagem, testes e ZIP).
- Artefato CI **11815794186**. ZIP de Preview: `Luciane_Editorial_v9_Mobile_Safari_Preview_Cloudflare.zip`, 55 arquivos, 2.664.672 bytes, SHA-256 `37b1fb5b577c15313139185532cf626867d9ddb5d446a82d2c2c37e24a8a0687`.
- ZIP contém foto da pipoca (SHA-256 `afd6c925dc273ffc9b5ab04713af10154cc905b1932315494608ee50e57cb8df`) e fatia aprovada (SHA-256 `83ae67d03cf683a62a000b812cc3ff4f22571bca84707a4af84ba3269bcc2286`). Nenhum outro arquivo do CI foi modificado para montar o Preview; somente imagem da fatia substituída e imagem da pipoca adicionada.
- Barra inferior: ocultação durante foco em entrada de texto em dispositivo touch, sem alterar campos rádio, handlers, checkout ou imagem da vitrine; otimização horizontal para até 359px.
- O navegador isolado do ambiente não concluiu o teste de foco no teclado; **homologação no Safari com teclado é obrigatória**. O CI não comprova comportamento do teclado iOS.
- Não publicar produção automaticamente. Sincronização dos dois WebP originais com GitHub ainda pendente; arquivo definitivo correto já está no ZIP.

## Configurador de pipoca — clareza comercial (13/10/2026)

- Reforça preço base versus preço atual do pote; em cada sabor mostra valor do pote com aquele sabor, e distintivo mostra efeito da combinação. Removidos símbolos +R$ que pareciam taxa extra.
- Fonte única de valores permanece `popcornPrice`, dinâmica para 500/750/1L, promoções e limites. Nenhum produto, regra, pagamento, pedido ou Supabase foi alterado.
- A imagem interna usa `/images/categoria-pipocas-editorial.webp`, com fallback para foto do catálogo. Para manter a imagem aprovada no Preview, sobrepor o WebP do ZIP v9 anterior; sincronização de imagens binárias no GitHub segue pendente.
- Realce visual da seleção do sabor e legibilidade dos valores; botão flutuante e fluxo comercial preservados.
- Testes / CI e homologação Safari são necessários antes de promover. Manter distância da Boutique 4.6 e não publicar produção automaticamente.


### Testes, CI e Preview do configurador — 13/10/2026

- Commit corrigido: `1309bd3fa4e1995b13ea3c199c0740294afa5428` (tipagem do fallback e verificador de textos do ZIP).
- GitHub Actions: **38419071993**, concluído com **success** em build, TypeScript, suíte completa, empacotamento e integridade do ZIP. Artefato `11826020850`.
- Pacote montado: `Luciane_Pipocas_Clareza_Preview_Cloudflare.zip`, **50 arquivos**, **2.664.635 bytes**, SHA-256 `2c78a47c8979e8b4206dcec73e975c015d901ee4e4adc0aa65a080061e0e0d9b`.
- Foi sobreposto ao build CI somente o WebP de fatias (93.846 bytes) e acrescentado o WebP de pipocas (53.154 bytes), ambos vindos do Preview v9 aprovado e conferidos por SHA-256.
- Os valores, promoções e limitações comerciais são os originais; teste visual final deve ocorrer no Safari do iPhone, conferindo exemplos de 500 ml e combinações como Leitinho + Nutella. O ZIP foi **preparado, não publicado em produção**.
- Ainda pendente sincronizar os dois WebP binários definitivos no GitHub; até lá o CI limpo usa foto original do catálogo via fallback e requer montagem de ZIP para a aparência aprovada.

## Campanha "O lado crocante da Luciane" — prévia técnica 13/10/2026
- Destaque compacto na home que leva a Pipocas Gourmet; bloco editorial interno para explicar os dois sabores.
- Edição limitada em copo: 400 ml, 190 g, R$ 15,90, estreia planejada para sexta 16/10/2026.
- Conteúdo somente de divulgação. **Não há produto novo no carrinho, botão Adicionar, pedido antecipado ou estoque prometido**.
- Arte final fotográfica dos copos ainda pendente de inclusão na branch: manter a simulação fora do site até confirmar foto real ou representação revisada. Foto macro da pipoca servirá de apoio secundário.
- Antes de publicar: confirmar disponibilidade verdadeira por sabor, integração com carrinho/checkout/estoque, e comportamento visual no Safari; nunca publicar automaticamente. Preservar Boutique 4.6.

### Edição crocante v2 — material fotográfico e regra de disponibilidade
- Home ganhou teaser compacto com foto real dos copos, na área editorial antes das duas categorias, sem alterar os cartões aprovados.
- A seção de Pipocas Gourmet apresenta a foto macro da pipoca crocante (textura aprovada), os dois sabores sem fotografia inventada para chocolate e nota de imagem ilustrativa: a fotografia retrata copos maiores, enquanto o produto de venda será 400 ml / 190 g.
- Arquivos fotográficos do Preview: `/images/edicao-crocante-copos-reais.webp` e `/images/edicao-crocante-textura.webp`, a serem adicionados ao ZIP para homologação. O GitHub **ainda não contém esses binários**; imagens ausentes ficam escondidas sem quebrar o layout.
- Máquina de estados pura em `app/limited-cup-release.ts`: antes de 16/10 aparece prelaunch, após a data passa a “aguardando liberação”; somente integração completa + aprovação da loja + estoque confirmado permitem “disponível”. Esgotado apenas se confirmado. Nada ativa vendas automaticamente.
- Fotografia sintética do copo com chocolate falhou na ferramenta de geração; não tentar reaproveitar falsa fotografia como produto real sem revisão.
- Bloqueios: cadastro real dos dois sabores, estoque e fluxo de pedido permanecem pendentes. **Não publicar em produção** nem misturar com Boutique 4.6.


### Edição crocante v2 — build e pacote de homologação (13/10/2026)

- Commit de implementação das fotos e estados: `4e86d09436828243e559f80f84e73cdc7aa52369`. Correção de teste: `60732fcb876d1688911e5cc657345cc6b58696b5`.
- GitHub Actions **38431530974**, status **success**: build, TypeScript, suíte completa, geração e validação do ZIP. Artefato `11831655629`.
- ZIP pronto: `Luciane_Edicao_Crocante_v2_Preview_Cloudflare.zip` com **52 entradas**, **2.808.303 bytes**, SHA-256 `13a8fb0ff56357b0a107a127f433db5a0c200ce87c12de081edd954c42f33bca`.
- O pacote derivou exclusivamente do build CI; somente 4 fotos (duas categorias já aprovadas, foto real dos copos, macro da pipoca) foram inseridas/substituídas. Os outros **48 arquivos** mantiveram os mesmos bytes do CI. Testes ZIP CRC, WebP decodificável e presença de index/admin/pedido aprovados.
- Origem das fotos adicionais: `edicao-crocante-copos-reais.webp` (recorte otimizado da fotografia real dos **copos de 600 ml**, 777×760, SHA-256 `75efd7d1da0fa5c1180b8bdda853133527b7c9815fd2d12b11c2d6f853f88355`); `edicao-crocante-textura.webp` (macro aprovada, 670×837, SHA-256 `13216c98042e5847853cf71f9b0fffacfb715d0c04b1cda1133e7247855c23c7`). Há nota explícita de que a foto de copos maiores é ilustrativa do produto de 400 ml / 190 g.
- Status de campanha: data não abre vendas automaticamente. `app/limited-cup-release.ts` requer que integração do pedido, aprovação da loja e estoque tenham sido confirmados. Sem isso, após 16/10 aparecerá **aguardando liberação**, nunca disponibilidade fictícia.
- **PENDÊNCIAS:** integrar os dois novos sabores ao carrinho/checkout/estoque com controles comerciais reais e homologar antes de liberação; imagens WebP finais ainda não estão sincronizadas no repositório (estão no ZIP correto). Confirmar no Safari mobile visual, foco e uso dos dois cartões principais. Não publicar produção automaticamente.

## Correção de direção de arte — edição crocante v3 (13/10/2026)
- Feedback de homologação: v2 rejeitada por excesso de elementos textuais, aparência plana e pouco impacto editorial. **Não voltar à composição v2.**
- V3 reestrutura a campanha: teaser compacto (foto, título serifado mais forte e hierarquia de preço); cartão editorial interno com macro fotográfica integrada, gradação chocolate, preço em destaque e uma linha de dois sabores.
- Removida **do site** a observação de “foto ilustrativa” e “sem foto do sabor chocolate”, conforme solicitação expressa. Embalagem comercial 400 ml/190 g permanece ostensivamente apresentada; a foto da chamada é da embalagem real fotografada (tamanho maior). Não gerar nem atribuir produto fictício ao catálogo.
- Divisão visual substitui as duas caixas grandes e remove descrições repetitivas. A seção de copos ficou mais curta; link “Ver potes recheados” leva ao início do configurador original.
- Pré-venda ainda bloqueada. `limited-cup-release.ts`, carrinho, preços, Supabase, disponibilidade, estoque e checkout **não foram alterados**. Nenhum deploy automático.
- Imagens do Preview: `edicao-crocante-copos-reais.webp` e `edicao-crocante-textura.webp`, junto com as duas fotos editoriais já aprovadas. Os WebP definitivos precisam continuar incluídos no ZIP enquanto não sincronizados no GitHub.
- Precisa CI, revisão visual em Safari e integração real dos produtos antes da estreia; Boutique 4.6 intocada.


### Validação e pacote do redesign v3 — 13/10/2026
- GitHub Actions [38434020596](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/38434020596): **success** em build, TypeScript, testes, empacotamento e verificação de conteúdo.
- Artefato CI: **11831209445**, contém ZIP aninhado `luciane-oliveira-doces-cloudflare-pages.zip`.
- Preview: `Luciane_Edicao_Crocante_v3_Preview_Cloudflare.zip`, **57 entradas**, **2.808.996 bytes**, SHA-256 `606348f99734be1c22820db2f13030026123d8d506e5a6b3906bd6752e27cbd6`.
- Comparação com ZIP do CI: apenas o WebP aprovado da fatia foi substituído; foram adicionados três WebPs (pipoca da vitrine e duas fotos crocantes); todo o restante preservou os bytes do CI.
- Inspeção ZIP: CRC íntegro; arquivos de imagem decodificáveis; as frases rejeitadas “Foto ilustrativa de copos maiores” e “Ainda não há foto do sabor chocolate” não aparecem no JavaScript compilado.
- Tentativa de navegador local (Chromium/Playwright) bloqueada pelo ambiente (ERR_BLOCKED_BY_ADMINISTRATOR tanto localhost quanto file://). Portanto, **layout v3 não foi homologado visualmente** em navegador real; comparar em Safari no Preview antes de produção.
- Não foram alterados preços, produtos disponíveis, carrinho, checkout, Supabase ou Boutique 4.6. Loja não pode vender a edição crocante antes do cadastro/estoque real.

## Edição crocante v4 — imagens dos dois sabores (13/10/2026)
- Feedback do cliente: teaser com três copos não despertava interesse e parecia pouco clicável; fotografia da pipoca pura era forte, mas não mostrava o produto acabado. A v4 apresenta **Ninho e Chocolate juntos** na home, cada um com miniatura fotográfica; chamada recebe CTA sublinhado e seta.
- Seção interna: hero editorial dividido em duas fotografias, títulos de sabores integrados às imagens, informação de 400 ml / 190 g / R$ 15,90, macro fotográfica em miniatura secundária e retorno direto aos potes recheados.
- As imagens `edicao-crocante-ninho.webp` e `edicao-crocante-chocolate.webp` vieram dos dois arquivos fornecidos nesta conversa, sem regeneração. Usar no Preview. Arquivos binários ainda exigem sincronização GitHub; não contar com o build puro para imagens sem os assets.
- A campanha continua **sem pedido antecipado** e sem integração dos copos ao carrinho. O relógio de campanha não libera vendas por data: integrar comercialmente, confirmar estoque e homologar no Safari antes da disponibilidade.
- Não alterar preço/catálogo existente, pagamentos, WhatsApp, Supabase, outra branch Boutique 4.6, ou produção.


### Edição crocante v4 — CI e imagens duplas (13/10/2026)

- Commit principal: `736db0ceb37a5f88c2875c3850617081cb947290`.
- GitHub Actions **38440433448**, resultado **success** em build, TypeScript, suíte completa e ZIP. Artefato de CI **11835445901**.
- ZIP de teste: `Luciane_Edicao_Crocante_v4_Preview_Cloudflare.zip`, **53 arquivos**, **2.933.309 bytes**, SHA-256 `942693b77fc4c093226d693a842d53f2c18493711350bb9d26611bf2ebb5b2c5`. CRC íntegro; imagens WebP decodificáveis.
- Imagens da v4: `edicao-crocante-ninho.webp` e `edicao-crocante-chocolate.webp` (ambas fornecidas pelo cliente, redimensionadas a 540×960); `edicao-crocante-textura.webp` virou miniatura secundária. Home mostra Ninho/Chocolate simultaneamente e ação sublinhada com seta. Retirados os antigos três copos do teaser.
- O ZIP foi montado sobre o artefato de CI acrescentando as duas novas fotos e três WebP editoriais já aprovados. **Todos os demais arquivos de build permaneceram byte a byte idênticos ao CI.**
- Arquivos binários dos produtos ainda **não estão commitados no GitHub** e precisam ser sincronizados antes de depender de builds novos da branch; o Preview ZIP contém as imagens definitivas.
- Tentativa de inspeção por Chromium local travou/bloqueou no ambiente e não produziu screenshot. O resultado visual final depende da homologação no Safari; nenhum deploy de produção executado.
- Ainda não foi integrado o produto temporário ao carrinho nem ao estoque real. A campanha continua informativa, sem vendas antecipadas. Manter bloqueio até autorização e validação. Boutique 4.6 intocada.

### Correção direcionada do atalho “Ver potes recheados” (13/10/2026)
- Vídeo Safari 14:48: o link de hash em `#potes-recheados` aparentava parar no título e competia com `html{scroll-behavior:smooth}`, deixando o usuário sem avanço fluido.
- Sem alterar fluxos comerciais, substituímos a âncora nativa por botão sem navegação/hash que usa `window.scrollTo({behavior:"instant"})` até o bloco real `#tamanhos`, com foco sem rolagem na etapa `#step-size`.
- Correção localizada: mantém título e âncoras do restante do site, sem mudanças em carrinho, cálculo, disponibilidade ou checkout.
- Hipótese técnica parcialmente fundamentada; **reteste manual no Safari ainda obrigatório** para afirmar que o congelamento do gesto de rolagem foi eliminado.

## Vitrine Crocante v5 — direção aprovada (13/10/2026)
- Referência visual: mockup editorial chocolate e cobre com dois copos reais, com menos elementos de cenário e fundo discreto. Não copiar o mockup inteiro como imagem renderizada nem reconstruir o site.
- Home: teaser compacto preserva as duas categorias principais; fotos dos dois sabores lado a lado, nome e preço + CTA visual de entrada.
- Pipocas: hero editorial, fotografias independentes com interação para ver o sabor, preço nobre R$ 15,90 por copo, 400 ml / 190 g, botão genuíno para explorar detalhes (sem checkout), estado de pré-lançamento/aguardando liberação; retorno para “Ver potes recheados” preservado com salto direto.
- Sem reserva; sem simular compras, sem nova categoria permanente, sem alterar operação, produto/preço ou estoque existente. A mudança para “disponível” segue bloqueada pela flag de integração comercial e aprovação da loja.
- Para Preview, incluir WebP das fotos do Ninho e Chocolate da conversa (verdadeiros produtos fornecidos) e as duas imagens originais editoriais aprovadas. Sincronização dos binários no Github segue pendente, verificada separadamente.
- Homologar visual/navegação no Safari iPhone antes de produção; não mexer na Boutique 4.6 nem em Supabase/Luciane Gestão.


### V5: validação e entrega — 13/10/2026
- Commit funcional: `89646e1220669c370d3d9b52a354587b84aa6333`.
- GitHub Actions: [38449453902](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/38449453902) **success** (build, TypeScript, suíte completa, ZIP e validação).
- Artefato CI: `11839333238`; Preview pronto `Luciane_Edicao_Crocante_v5_Preview_Cloudflare.zip` com 53 entradas, 3.107.429 bytes, SHA-256 `fac803897c15c71779aec526ec9eb11ee98c31e1a388e7a44330ab66a6319de5`.
- Montagem controlada: 48 entradas compiladas idênticas ao CI e cinco WebPs para a vitrine: `categoria-fatias-editorial.webp`, `categoria-pipocas-editorial.webp`, `edicao-crocante-textura.webp` preservados do Preview anterior; `edicao-crocante-ninho.webp` (155.370 bytes) e `edicao-crocante-chocolate.webp` (205.350 bytes) otimizados das fotografias reais fornecidas, sem recriar o produto.
- ZIP verificado por CRC, unicidade de entradas, dimensões/decode das imagens, integridade dos arquivos compilados e presença das chamadas/CTAs. **Sem homologação visual Safari ainda.**
- Aviso importante: esses WebPs definitivos **ainda não estão versionados como blobs na branch do GitHub**. O ZIP de homologação é completo, mas builds limpos do GitHub não mostrarão todos esses arquivos até sincronização dos binários.
- Compra edição de copos não integrada: não existe reserva/pré-venda, sem alterações no carrinho, catálogo original, estoque ou pagamentos. Separar homologação visual de homologação comercial e não publicar produção automaticamente.

## V6 — Navegação independente (13/10/2026)
- Reclamação de UX comprovada: clicar em **Pipocas Gourmet** da home levava primeiro à edição limitada, bloqueando a compreensão do configurador do pote.
- Mudança localizada: `selectCategory("pipocas")` agora oculta a edição e solicita salto imediato ao passo 1 `#tamanhos`. **Fatias** preservam seu caminho original. A chamada “Conhecer a edição” aciona `openLimitedCupEdition()`, mostra somente a vitrine da campanha e leva o viewport diretamente ao cartão `#edicao-crocante`, sem mudar carrinho, preços ou estoque.
- A página na experiência de descoberta distingue o título “Edição Crocante” de “Pipocas Gourmet”; botão redundante “Conhecer os sabores” retirado. As imagens dos sabores seguem clicáveis com detalhes informativos; há caminho secundário com texto **Prefere os potes recheados? Escolher tamanho**.
- Mobile sticky de checkout/configurador oculta-se durante a experiência de descoberta; reaparece no pedido tradicional. A restauração da URL e edição de itens limpam o modo de lançamento; fechamento de loja ainda respeitado.
- Mecanismo de salto via `requestAnimationFrame` após a renderização e `window.scrollTo({behavior:"instant"})`, sem animar scroll no Safari. **Validar manualmente no Safari** e no modo pedidos fechados.
- A edição em copo continua sem reserva/venda: integração comercial ainda pendente, requer aprovação da loja e confirmação do estoque antes de anunciar disponibilidade.
- Mantidas fotografias da v5, valores e cards da home, sem alteração de código backend nem de Boutique 4.6; não publicar produção automaticamente.
