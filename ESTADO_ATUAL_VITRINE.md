# LUCIANE OLIVEIRA DOCES — ESTADO ATUAL DA VITRINE (LEITURA OBRIGATÓRIA)

**Atualizado em 14/10/2026 após aprovação visual no Safari do iPhone.**

> Fonte única de verdade para continuar os refinamentos fotográficos e editoriais do site comercial.
> Ler este arquivo e conferir o HEAD remoto da branch **antes** de qualquer mudança. Não tomar o ZIP mais recente por base de código e não recomeçar em versões v8/v9/v10 antigas.

## Projeto correto
- Repositório: `railanzera-cloud/luciane-oliveira-doces-site`.
- Branch de trabalho aprovada para refinamentos editoriais: `design/luciane-editorial-vitrine-experiment-20261013`.
- **Último checkpoint funcional visual aprovado:** `5abb4c5236fc7147972c7ab9cc5f58e5fc227732` (**v10.7**).
- CI do checkpoint funcional: [GitHub Actions 38525796504](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/38525796504), resultado **success**.
- Site comercial: https://lucianeoliveiradoces.pages.dev/ .
- A branch `main` é distinta e **não recebeu automaticamente a v10.7**; publicação/merge exige autorização específica.
- O projeto Boutique 4.6 e o Luciane Gestão são independentes. Não alterar branches, Supabase ou arquivos desses trabalhos.

## Estado visual aprovado — NÃO REGREDIR
- **Pipocas Gourmet:** fotografia real **já aprovada pelo usuário em print no Safari às 04:10 de 14/10**. Arquivo definitivo `public/images/categoria-pipocas-editorial-enquadrada-v107.webp` usado pela home. O alias `public/images/categoria-pipocas-editorial-clara.webp` contém a mesma fotografia (fallback). Foto natural sobre fundo cappuccino, pote grande, laterais preservadas, com respiro sutil acima da tampa e abaixo da base. **Não regenerar por IA e não substituir sem solicitação específica.**
- **Fatias Artesanais:** arquivo `public/images/categoria-fatias-editorial.webp` é a fotografia real original aprovada, sem faixas/molduras bege artificiais. Não regenerar nem mudar o corte sem pedido expresso.
- **Cartões:** composição editorial com foto à esquerda, informações à direita, painéis chocolate profundo, cobre discreto, sombras contidas e layout mobile. Preservar as proporções e o enquadramento aprovado.
- **Pipocas Crocantes:** campanha própria, distinta dos potes Gourmet. Data **quinta-feira 15/10/2026** na comunicação e regra interna. `app/limited-cup-release.ts` define `launchDayStart: "2026-10-15T00:00:00-03:00"`; em `app/page.tsx` a chamada mostra `15/10` e `Estreia quinta`. O calendário NÃO libera pedidos automaticamente: as flags de integração comercial, aprovação da loja e estoque precisam continuar protegidas, salvo nova instrução.
- **Navegação:** Pipocas Gourmet rola suavemente ao configurador; edição limitada conserva proteção especial de salto seguro no Safari, sem venda antecipada. Barra flutuante, checkout e atendimento existentes preservados.
- Não alterar catálogo, preços, carrinho, entrega/retirada, WhatsApp, Meta Pixel/CAPI, Tintim, Mercado Pago, Supabase, administrativo nem disponibilidade por conta de trabalho estético.

## REGRA PERMANENTE SOLICITADA PELO RESPONSÁVEL — SALVAR NO GITHUB
1. **Toda alteração concluída e validada neste projeto precisa ser salva no GitHub na branch de trabalho correta por um commit/checkpoint antes da entrega.** Não deixar correções apenas dentro de um ZIP compilado.
2. Antes de trabalhar, verificar `HEAD`, branch, diff relevante e o arquivo afetado; preservar trabalho existente e evitar sobrescrever commits posteriores.
3. Fazer a menor alteração necessária. Não recriar produto real/fotografia quando a tarefa é usar ou reposicionar uma imagem já enviada. Versionar também **arquivos binários reais** usados pelo site.
4. Executar testes focados, checar TypeScript/build/CI conforme a área afetada; informar resultados honestamente. Se falhar, preservar checkpoint seguro e não declarar conclusão.
5. Gerar **ZIP de Cloudflare Pages** a partir da **mesma revisão commitada e validada**; conferir presença de `index.html`, `admin/index.html`, recursos fotográficos, CRC do ZIP e referências do bundle. Entregar o link ao usuário em cada atualização.
6. Informar no final: branch, **SHA exato do commit**, link GitHub, testes, ZIP e se a publicação foi realizada. A regra padrão é **não publicar em produção** e **não mexer na main** sem autorização explícita.
7. Depois de cada implementação relevante, atualizar este arquivo com o **último checkpoint funcional aprovado**, mudanças, verificações e pendências; não apagar decisões anteriores. Quando a aprovação visual depender do Safari físico, registrar esse status.
8. Se a conexão/limites de ferramenta impedirem commit ou ZIP, avisar claramente que o trabalho está pendente e não apresentar um ZIP diferente do GitHub como versão oficial.

## Próxima conversa
Abrir **este arquivo primeiro**, conferir o HEAD remoto atual de `design/luciane-editorial-vitrine-experiment-20261013`, e partir do último checkpoint aprovado. O commit `5abb4c5236fc7147972c7ab9cc5f58e5fc227732` é a referência funcional atual nesta data; commits posteriores podem conter apenas atualizações documentais. Não inferir que `main` ou o domínio publicado correspondem a essa branch.

## Fluxo de entrega
**Alteração solicitada → editar branch correta → validar → commitar no GitHub → gerar ZIP do mesmo commit → conferir no iPhone (quando visual) → publicar só com autorização.**


## Refinamento UI/UX Premium 2.0 — revisão de interface 14/10/2026

- **Branch:** `design/luciane-editorial-vitrine-experiment-20261013`. **Base preservada:** `1a5f84145151720d2ca0e7928fe9a104f7a14795` (v10.7 aprovada no commit anterior `5abb4c5`).
- **Checkpoint do refinamento:** o commit que introduz esta seção e as alterações de `app/page.tsx`, `app/storefront-vitrine-editorial-experiment.css` e `tests/uiux-premium-2.test.mjs` na HEAD remota da branch. Conferir o SHA exato no GitHub antes de publicar.
- **Sabores:** preço individual por tamanho mantido; a explicação repetitiva passou a ser acessível a leitores de tela e a diferença não cumulativa sobre a seleção atual é apresentada com valor calculado pela função de precificação original. Anúncio acessível preserva o total resultante.
- **Etapas:** o checkout existente continua com Pedido → Recebimento → Pagamento, agora com sinalização explícita da etapa corrente na navegação.
- **Barra mobile:** acabamento em caramelo/chocolate e áreas de toque mantidas. Observadores dos CTAs, proteção do teclado no iPhone e ações originais preservados.
- **Fotografias:** nenhuma imagem substituída, alterada ou reenquadrada. **Crocantes 15/10:** nenhuma mudança.
- **Regra comercial e integrações:** intactas; nenhuma alteração de catálogo, Supabase, admin, pagamentos, mensuração ou disponibilidade.
- **Validação:** a suíte do GitHub Actions em `.github/workflows/design-boutique-preview.yml` é a fonte da verificação de build, TypeScript, regressão e ZIP do commit após o push. Não registrar sucesso antes do resultado da execução.
- **Pendente de homologação manual:** Safari físico, teclado aberto, viewport de 320 a 430 px e navegação comercial real. **Sem publicação no Cloudflare nem merge na main.**


## Refinamento de comunicação de preços — selo direto (14/10/2026)

- Partida: commit `00d453045824856e6e193058c5e4c17029af8b33` da branch `design/luciane-editorial-vitrine-experiment-20261013`. Revisão incremental sobre o UI/UX Premium 2.0; preservar o histórico de v10.7.
- **Decisão aprovada:** manter a composição compacta dos sabores e os preços de cada sabor; substituir a etiqueta de acréscimo (ex.: "+ R$ 5,00 no total") por **"Pote fica por R$ X"**, apontando diretamente ao preço que a combinação terá caso o cliente escolha aquele sabor.
- O valor X vem da função comercial existente `popcornPrice(popcornVariant.id, selected ? popcornOptionIds : [...popcornOptionIds, option.id], promotionTime)`, considerando o tamanho, os sabores já selecionados e a promoção ativa. Não é preço fixo nem adicional cumulativo. Ao adicionar um sabor mais barato que o já selecionado, o selo mostra o total que permanece vigente, sem induzir soma de valores.
- No início, o sabor que custa o mesmo que o pote-base mantém "Preço base"; nos preços especiais de fim de semana sem seleção, mantém-se a orientação "Mesmo preço na promoção". No estado selecionado, a indicação "Escolhido" permanece.
- A tipografia, as fotografias, o bloco superior de preço atual, a barra inferior e as animações/navegação previamente homologadas permanecem intactos; somente o texto/semântica da etiqueta e testes associados foram revisados.
- Validação automática e ZIP do **mesmo novo commit**: conferir status do fluxo `design-boutique-preview.yml` e artefato do GitHub Actions antes de considerar conclusão. Safari físico continua pendente de homologação. **Sem publicação, sem merge, sem Supabase.**

## Acabamento de conversão mobile — implementação em 14/10/2026

- **Base verificada:** `b592373a371c8182d706e6d37968ba8ea23b3dd7` na branch `design/luciane-editorial-vitrine-experiment-20261013`. Esta seção registra somente alterações posteriores ao checkpoint anterior; não altera o histórico aprovado.
- **Barra contextual:** mantém exatamente os handlers, visibilidade por observadores, fluxo guiado, proteção do teclado e safe area. O verde-esmeralda profundo com texto creme aplica-se somente à barra com checkout pronto via WhatsApp, usando a classe `is-whatsapp`, e ao botão equivalente pronto no resumo. Montagem permanece caramelo; estado final do checkout pelo site não recebe o verde específico do WhatsApp. Superfície externa continua chocolate com contorno cobre discreto.
- **Preços e rótulos:** quando há itens no carrinho e outro está em montagem, o rótulo do preço flutuante muda para **Item em montagem**; no modo de checkout, exibe **Total do pedido** ou **Subtotal do pedido**. Os valores, a fórmula, o destino e as ações não mudam.
- **Tamanhos mobile:** o terceiro cartão ocupa as duas colunas apenas se houver exatamente três cartões de tamanho renderizados; mantém o radio original, disponibilidade, cálculo e clique. Demais quantidades de tamanhos mantêm a grade anterior.
- **Sabores e fatias:** ajuste de bordas, foco e superfícies selecionadas sem interferir nas fotografias, descrições, quantidade, seleção ou estoque.
- **Checkout:** passagem chocolate-creme mais suave, bordas de cartões e opções de pagamento/recebimento menos pesadas; conteúdo e dados intactos.
- **Categoria fatias:** redução localizada do respiro acima das fotos em até 599px, sem recorte, substituição ou alteração de proporções nas fotos.
- **Safari iOS:** amplia margem de destino da rolagem acima da barra e preserva as proteções já existentes para teclado e saltos, sem mudar handlers e scroll JS. Validação manual em Safari físico permanece necessária (rolagem, teclado, 320–430px, estados com loja fechada e pagamentos).
- **Testes:** o arquivo `tests/uiux-conversion-finish.test.mjs` cobre escopo do CSS, preço/CTA, preservação comercial e comportamento condicional. Conferir CI no commit desta intervenção antes de atribuir aprovação. **Sem publicação em produção, merge na main, migração de banco ou alteração de campanha.**

- **Correção de suíte após o primeiro CI do acabamento:** a execução inicial teve build/TypeScript aprovados e 3 falhas em asserts textuais legados: o CTA passou a incluir `data-ready` antes do mesmo `onClick`, e duas verificações editoriais antigas pressupunham que nenhuma regra de checkout seria acrescentada após a seção v9. Os testes foram adaptados para verificar o CTA original com a nova marcação visual e o isolamento fotográfico histórico até a seção de acabamento explicitamente autorizada. Nenhuma lógica ou estilo de produto foi modificado nessa correção. A aprovação definitiva depende da nova execução do GitHub Actions.

## UI/UX Premium 2.1 — iluminação dos selecionados (14/10/2026)

- **Base:** commit `1f44666907162695c8851a7b18749bc256c692ac` na branch `design/luciane-editorial-vitrine-experiment-20261013`. O commit que adiciona esta seção e o teste `tests/uiux-premium-21-selection.test.mjs` é o novo checkpoint 2.1.
- **Correção da cascata:** o terceiro tamanho possuía gradiente e borda próprios num seletor mais específico e suprimia parte da aparência selecionada; o estilo normal do 1 litro fica restrito a `:not(.is-selected)`, preservando a horizontalidade. A regra posterior de sabores que atenuava a iluminação anterior foi substituída, concentrando o destaque no bloco 2.1.
- **Seleção premium:** tamanho 500 ml, 750 ml e 1 litro recebem a mesma superfície chocolate iluminada com dois reflexos superiores, borda cobre mais presente, contorno interno e sombras discretas; checks e rádio realçados. Os sabores selecionados recuperam a presença visual da captura das 05h34, com bordas iluminadas, fundos mais ricos, checkbox e selo "Escolhido" refinados. Estados não selecionados e indisponíveis permanecem separados.
- **Escopo:** apenas o CSS de estados selecionados, este documento e um novo teste. Não alterar `page.tsx`, mensagens "Pote fica por R$ X", cálculo, fotos, barra inferior, finalização, categorias, checkout, admin, lançamento 15/10 ou qualquer integração.
- **Validação:** conferir CI (build, TypeScript, testes, ZIP) no SHA remoto do novo checkpoint. Exigir homologação visual manual real no Safari do iPhone para a intensidade da luz e possível sobreposição com UI do navegador. **Sem publicação no Cloudflare e sem merge na main.**
