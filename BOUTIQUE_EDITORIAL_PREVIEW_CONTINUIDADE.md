# Vitrine Editorial Experimental — continuidade

- Branch: `design/luciane-editorial-vitrine-experiment-20261013`.
- Último commit de implementação verificado antes deste documento: `85ffd3ecde48594c95647f8d9fba9870d6431208`.
- GitHub Actions validado: execução `38383520819`, concluída com sucesso.
- Escopo: exclusivamente vitrine neutra inicial (entrada, categorias), preservando carrinho, checkout, preços, rastreamento, pagamentos e todas as regras comerciais.
- Estilo da proposta: superfícies chocolate acetinado `#51362a` / `#442d23` / `#322017`, tipografia creme e cobre, fotografias separadas das legendas, CTA explícito, cards compactos e proporcionais.
- `app/page.tsx` já referencia `/images/categoria-fatias-editorial.webp` exclusivamente na imagem de categoria e usa foto original do catálogo como fallback.
- **Atenção:** a foto binária ainda NÃO foi gravada no repositório. O artefato puro do GitHub Actions não contém essa imagem, então sozinho mostra o fallback original.
- Um ZIP de Preview foi preparado localmente adicionando a foto real tratada em `images/categoria-fatias-editorial.webp` ao ZIP compilado e mantendo intactos os 52 arquivos anteriores.
- SHA-256 da foto incluída no Preview: `16543666808bd0b9c1ea47d4ed124d7573bd8509dc9292fea5226ef37d193c41`.
- SHA-256 do ZIP final local: `535a5fdf447cdabe8a82a035489e6e46b1621133c8c1b7090e198b0552665768`.
- **Antes de recompilar no GitHub**: enviar a foto otimizada `categoria-fatias-real-editada.webp` ao repositório como `public/images/categoria-fatias-editorial.webp` e executar novamente a validação.
- Navegador Chromium local: inspeção HTTP foi bloqueada por `net::ERR_BLOCKED_BY_ADMINISTRATOR`; o visual ainda depende da homologação no Safari/iPhone.
- Não promover automaticamente à produção nem mesclar com a Boutique 4.6 trabalhada no Work.
