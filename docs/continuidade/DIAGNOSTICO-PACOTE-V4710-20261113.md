# V4.7.10 — pacote consolidado e verificação de implantação Cloudflare (13/11/2026)

## Incidente reportado
Usuário informou que publicou a V4.7.9 mas não visualizou as novas fotos de Ninho com Morango, Prestígio, Ferrero Rocher, Ninho Nutella e Chocottone e/ou a grafia nova.

O ZIP V479 foi inspecionado: as quatro imagens principais e de card constam no arquivo completo; os nomes corrigidos aparecem no JS de catálogo. A discrepância demonstrável está em `.vite/manifest.json`: algumas chaves e listas `imports` ainda referenciam aliases terminados em `-v477.js`, mesmo quando o manifesto aponta campos `file` a `-v479.js`. Os imports internos verificáveis e caminhos HTML eram válidos, de modo que **essa discrepância não é prova de causa do sintoma em produção**.

Não foi possível obter metadados do deployment atual do Cloudflare nesta sessão; a leitura web de domínio trouxe conteúdo cacheado sem data atual, e o navegador automatizado da infraestrutura bloqueou o acesso ao localhost. Não afirmar produção na V479 nem atribuir erro conclusivo a browser/cache.

## Pacote de correção + diagnóstico

**Arquivo completo manual:** `Luciane-Doces-Cloudflare-V4710-Consolidado-Verificado.zip`  
**SHA-256:** `ca31f07be5c21dc4039cea3b3ff2675f992d1afd58845cf769397a21c0cd13d8`  
**Tamanho:** 14.055.099 bytes, 167 arquivos.

Base bit a bit: V479, SHA-256 `0c397cc4e99cc7fa5746c71601dc2636e057b07e8b235dbd63b32cd5837e900a`. Nenhuma imagem mudou. Todas as **140 mídias** presentes em V479 preservadas bytes idênticos.

Mudanças de empacotamento:
- 15 bundles JavaScript com versão de arquivo `-v4710.js` para cache busting.
- Referências HTML, JS e `.vite/manifest.json` recompostas coerentemente, incluindo chaves internas e aliases de `imports`.
- `index.html`, `admin/index.html`, `pedido/index.html` e `404.html` com marcador `<meta name="luciane-comercial-release" content="V4.7.10"/>`.
- Novo `release-info.json`, servido em `/release-info.json`, com release e caminhos esperados das quatro imagens. Regra `Cache-Control: no-store` para esse endpoint.

Verificações: ZIP CRC, 167 entradas sem duplicatas, 140 mídias antigas idênticas, quatro imagens principais e de cards referenciadas pelo catálogo, 15 `node --check` OK, 81 referências JS locais sem falta, 15 registros de manifesto com todos os imports resolvendo suas chaves, e marcador presente nas quatro rotas estáticas.

## Como identificar o que foi publicado

Após publicar *manualmente* V4710 na **produção** do projeto `lucianeoliveiradoces.pages.dev`, visitar:
`https://lucianeoliveiradoces.pages.dev/release-info.json`

- Se aparecer `"release":"V4.7.10"`, o domínio já serve o pacote novo e os caminhos das quatro imagens estão declarados. Isso **não homologa toda a jornada comercial**.
- Se não aparecer V4710, verificar em Cloudflare Pages > projeto correto > Deployments se o ZIP foi publicado em **Production** e se a URL acessada é a mesma.
- Se aparecer V4710 mas a vitrine seguir mostrando imagens antigas, colher a URL real da foto e screenshot da tela para investigar caching/estado do cliente, renderização e rotas.

Nenhum upload Cloudflare, deploy Edge, SQL, alteração de pedidos, pagamentos ou `main` foi realizado. Testes Safari físico e comportamento de produção seguem pendentes. As nomenclaturas de ID internas permanecem `chocotone`; o nome comercial frontend é `Chocottone`, mas a Edge em produção ainda pode escrever a grafia antiga até atualização autorizada.