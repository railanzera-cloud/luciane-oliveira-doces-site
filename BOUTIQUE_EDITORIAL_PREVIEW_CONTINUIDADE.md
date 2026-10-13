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
