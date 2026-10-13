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

