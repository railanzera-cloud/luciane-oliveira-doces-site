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
