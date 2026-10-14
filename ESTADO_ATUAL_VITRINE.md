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

## UI/UX Premium 2.2 — vitrine comercial, consistência de CTA (14/10/2026)

- **Ponto de partida:** último HEAD confirmado `0a6886cbe3b85a02fb25613a5f559a363c42f6ba` na branch `design/luciane-editorial-vitrine-experiment-20261013`. Ajuste local anteriormente entregue como ZIP não havia sido integrado ao repositório; esta etapa incorpora a intenção ao código-fonte rastreável.
- **Pipocas Gourmet:** ação editorial **“Montar meu pote”**. **Fatias Artesanais:** **“Escolher minha fatia”**. A seta antes isolada agora acompanha o texto dentro de **um único chip visual não interativo**. O botão principal continua sendo todo o cartão (uma única área de toque); rótulos acessíveis foram aprimorados.
- **Acabamento:** CTA chocolate/cobre acetinado com reflexo interno controlado, tipografia compacta, resposta curta no hover/foco/toque e layout responsivo inclusive em 320–359px. O mesmo sistema visual cobre as duas categorias. Mantidas a fotografia à esquerda, o painel editorial à direita, tamanhos dos cartões e todas as fotografias da v10.7.
- **Escopo:** edição limitada **Pipocas Crocantes em copos**, dia 15/10, sem alteração; não tocar em interior das categorias, carrinho, preços, checkout, barra móvel, Supabase, painel admin, Meta ou Mercado Pago.
- **Validação:** executar build, tipos e suíte completa no GitHub Actions. Gerar o ZIP Cloudflare **desse mesmo SHA** depois que o CI aprovar. A leitura visual no Safari físico permanece pendente de homologação. Sem merge na main e sem publicação no Cloudflare.

- **Ajuste de teste do Premium 2.2:** o primeiro CI aprovou build e TypeScript, mas o teste de navegação inicial ainda esperava `aria-label="Pipocas Gourmet"` sem o complemento acessível. Atualizada apenas a expectativa para os rótulos explícitos dos dois cartões. Nenhum componente comercial foi modificado nesta correção; concluir somente com nova suíte integral aprovada.

## UI/UX Premium 2.3 — edição limitada Pipocas Crocantes (14/10/2026)

- **Ponto de partida:** SHA remoto `201d8955be2cbf436c22f8ef2f43228e49bfac87` da branch `design/luciane-editorial-vitrine-experiment-20261013`; edição em copos, distinta dos potes recheados. Esta intervenção não promove vendas, não modifica estoque e não altera o calendário.
- **Descoberta dos sabores:** cartões Ninho e Chocolate mantêm fotos reais, dimensões, seleção `aria-pressed`, clique e painel de informações. O acabamento ganha relevo editorial, molduras cobre, brilho interno localizado e CTA visual “Ver detalhes” mais identificável. Estados selecionados reforçados; sem movimentos contínuos.
- **Preço e ficha:** o preço **R$ 15,90 por copo**, volume **400 ml** e peso **190 g** permanecem; alinhamento, contraste e chips são refinados apenas visualmente.
- **Comunicação temporal:** um painel discreto destaca “CHEGA NESTA QUINTA” antes de 15/10 e preserva a descrição derivada do estado `cupLaunchCopy`; após a data, a interface respeita `awaiting-release`/ `available`/ `sold-out` e **não anuncia vendas antes da liberação real**. `app/limited-cup-release.ts` intacto (integração, aprovação e estoque permanecem `false`).
- **Atalho inferior:** apresentação refinada com rótulo “Prefere os potes recheados?” e ação “Escolher tamanho”; mesmo handler original `selectCategory("pipocas")`.
- **Preservação:** fotos, vitrine da home, categorias Gourmet/Fatias, cart/checkout, Supabase, integrações, WhatsApp, Pixel/CAPI, período aprovado, preços, pesos, volume e painel administrativo inalterados. Nenhuma publicação na main/Cloudflare.
- **Validação:** testes novos em `tests/uiux-premium-23-crocantes.test.mjs`, ajuste de asserção histórica ao HTML sem modificar handler; CI no commit resultante deve aprovar build, TypeScript e suíte completa e produzir ZIP do mesmo SHA. Safari físico permanece homologação manual.

## UI/UX Premium 2.4 — clareza e fluidez da edição Crocantes (14/10/2026)

- **Checkpoint de origem:** HEAD remoto `112bd6617b04bc46108c8e863346b0fc3ccf91fa` na branch `design/luciane-editorial-vitrine-experiment-20261013`. Este refinamento continua incrementalmente o 2.3; não afeta as áreas comerciais protegidas.
- **Vitrine da campanha:** `Escolha entre 2 sabores` deixa explícito que há dois copos alternativos, sem insinuar mistura dos sabores no mesmo copo. Preço 15,90, título e imagens originais mantidos.
- **Introdução interna:** descrição direta de Ninho e Chocolate. A etiqueta superior interna agora informa somente `EDIÇÃO LIMITADA`, deixando a data para o aviso específico da estreia, sem triplicar o mesmo dado.
- **Detalhes:** o estado selecionado mostra `Detalhes abertos`; a descrição curta substitui a orientação inicial em vez de empilhar as duas. Painel de detalhes em fluxo normal, compacto e com anúncio acessível. Não há barra fixa ou manipulação de scroll; o atalho dos potes continua ao final e com o mesmo handler.
- **Estreia e reposição:** bloco único `ESTREIA · QUINTA, 15/10`, antes da data; texto de tiragem limitada e ausência de reposição no mesmo painel. Após 15/10, os textos respeitam os estados comerciais reais `awaiting-release`, `available`, `sold-out`; o calendário não libera pedidos.
- **Segurança:** `app/limited-cup-release.ts` permanece intocado (flags de integração, autorização e estoque não alteradas). Fotografias Ninho/Chocolate, produtos, valores, carrinho, checkout, Supabase, Meta/Tintim/WhatsApp e admin intactos. Nenhum merge na main nem publicação.
- **Validação:** testes direcionados novos em `tests/uiux-premium-24-crocantes.test.mjs`; asserções textuais legadas adaptadas aos textos autorizados. Conferir CI, build, TypeScript, suíte integral, integridade do ZIP e SHA remoto antes da entrega. Revisão visual no Safari físico segue pendente.

- **CI do 2.4:** primeiro build e TypeScript aprovados; 403/404 testes passaram. A única falha ocorreu porque o teste histórico do escopo 2.2 lia também as seções CSS 2.3/2.4 adicionadas depois. O teste foi delimitado corretamente até o início do 2.3. Nenhum código de interface ou integração foi modificado neste checkpoint corretivo. A versão final depende da nova execução integral.

- **Gatilho de validação corrigido:** o fluxo GitHub Actions passou a considerar `tests/*.test.mjs` na branch de desenvolvimento, mantendo o restante dos filtros e as etapas de compilação iguais. Assim correções ou novos testes de refinamento visual não ficam sem CI/ZIP por ausência de trigger. Nenhum ambiente, conta, credencial, integração, branch principal ou regra comercial foi alterado.

## UI/UX Premium 2.5 — abrir/fechar detalhes dos copos (14/10/2026)

- **Base:** HEAD remoto confirmado `f3180e4d746a37318d8ef31d3a77e6f7767acb94`, branch `design/luciane-editorial-vitrine-experiment-20261013`; evolução pontual do Premium 2.4, motivada pela homologação real no Instagram (Ninho e Chocolate selecionados).
- **Comportamento agora real:** tocar no copo Ninho/Chocolate abre os detalhes; repetir o toque no mesmo copo fecha; tocar no outro altera o painel sem acumular detalhes. Indicador passa a ser `Ver detalhes` ou `Fechar detalhes`, com seta apontando para cima quando aberto. `aria-expanded` e `aria-controls` refletem a expansão no mesmo botão; conteúdo é anunciado de maneira acessível.
- **Fluidez mobile:** painel e dica ocupam uma área de reserva compacta de altura mínima 52px, evitando o salto vertical entre o estado fechado e o aberto. As duas descrições foram encurtadas sem mudar seu significado: Ninho é finalizado com leite em pó e Chocolate tem crosta de chocolate. Colunas e tamanhos de texto ajustados para o navegador do Instagram e 320–430px; fontes maiores podem expandir naturalmente, sem truncar texto. Botão `Escolher tamanho` segue no fluxo normal, não fixo.
- **Invariantes:** textos de preço R$ 15,90, fotos reais, dimensões 400ml/190g, fase 15/10 e flags de venda e estoque continuam como antes; nenhuma mudança em liberação comercial, carrinho/checkout, barra inferior, admin, Supabase, Meta ou outras categorias.
- **Validação e entrega:** novo teste dedicado `tests/uiux-premium-25-crocantes-accordion.test.mjs`, adequação dos testes históricos 2.3/2.4, build e suíte no GitHub Actions. Gerar pacote apenas do SHA validado, sem publicar em Cloudflare ou alterar main; homologação final no Instagram/Safari do iPhone pendente de análise visual.

- **CI corretiva do 2.5:** build e TypeScript aprovados; 407/408 testes passaram inicialmente. A única falha foi a expectativa histórica de `aria-pressed` no teste v6, enquanto o disclosure expandível agora usa `aria-expanded` com `aria-controls`. Foi adaptada apenas a verificação histórica para a semântica correta. Nenhum código de compra ou interface foi modificado neste checkpoint de testes; nova suíte completa é necessária antes da entrega do ZIP.

## Premium 2.6 — integração de pedidos Crocantes (14/10/2026)

- **Autorização da loja:** venda da edição limitada em 15/10/2026 a partir das 12h, horário de Paragominas (UTC−3). A abertura é validada em `quoteCartItems` do backend, nunca apenas no calendário do celular.
- **Catálogo:** SKU `crocante-ninho` e `crocante-chocolate` independentes, 400 ml/190 g, R$ 15,90 por copo. Não combina sabores em um mesmo copo. O catálogo autoritativo na Edge Function revalida preço, quantidade e disponibilidade antes de registrar.
- **Checkout existente:** quantidade, adicionar ao carrinho, carrinho misto com fatias e potes e checkout estruturado somente via WhatsApp/Tintim para pedidos com copos. Mensagem de registro existente (número, cliente, quantidade, tamanho, retirada/entrega e Pix manual) preservada. A confirmação de pagamento é da Luciane, não automática.
- **Disponibilidade:** as duas chaves de produto devem existir em `menu_availability` via migration. Se a consulta falhar ou o estoque for marcado como esgotado, o botão deve permanecer bloqueado. Alterações em estoque posteriores à migration não são sobrescritas.
- **Implantação:** o GitHub e o ZIP não publicam o frontend, não aplicam migration e não atualizam Edge Function. A abertura às 12h só ocorrerá de fato se frontend, migration e backend homologados estiverem instalados antes do horário. Nenhum deploy Cloudflare automático.
- **Controle:** não tocar no projeto Luciane Gestão, no main, no Mercado Pago e em outras campanhas. Teste adicional `tests/uiux-premium-26-crocantes-commerce.test.mjs` e suíte completa no Actions. Homologação real Instagram/Safari e verificação da integração backend antes da abertura.

- **Refinamento de compatibilidade dos testes 2.6:** o novo primeiro commit inseria os copos antes do produto principal; foi corrigido para manter Pipocas Gourmet como primeiro produto do catálogo. As funções testadas isoladamente por `menu-refinement.test.mjs` agora usam verificação local de ID, sem dependência de helper exterior; testes anteriores atualizados para refletir a abertura autorizada às 12h. Sem ajuste adicional em pagamento, WhatsApp ou disponibilidade comercial.

- **Homologação técnica:** suíte 2.6 passou 411/412; teste antigo do modo vitrine não injetava o novo callback de limpeza da mensagem `setCupAddedNotice` na função isolada. Mock de teste corrigido sem remover a limpeza real nem alterar fluxos comerciais; executar CI novamente.

- **Reforço da integração WhatsApp:** nomes dos copos na identificação comercial do cliente/WhatsApp incluem o prefixo `Pipocas Crocantes —`, evitando confusão com os potes tradicionais. Testes executam `quoteCartItems` real para o bloqueio até 11:59:59.999, liberação às 12:00, combinação de dois SKUs e total misto com fatia. Preço calculado no backend, sem soma de sabores e sem gateway de pagamento automático.

- **Proteção de duplo toque e horário exato:** em 15/10 às 12h o frontend dispara atualização de fase; ao retornar ao Instagram/Safari também atualiza. Backend continua sendo o guardião do horário. Cadastro assíncrono usa lock e botão desabilitado durante revalidação de estoque; quantidade não ultrapassa 99. Commit externo de diagnóstico Edge Function preservado como ancestral, sem sobrescrever.

## Implantação segura da integração Crocantes — 14/10/2026

- **Supabase comercial autorizado:** projeto exclusivo `edqiwvccmboyayojvuea`. Migration `crocantes_launch_20261014` aplicada com sucesso; produtos `crocante_copo_ninho` e `crocante_copo_chocolate` cadastrados com status `available` e tipo `product`. Sem acesso ao projeto Luciane Gestão.
- **Edge Function remota:** `create-whatsapp-order` **versão 13**, estado `ACTIVE`, implantada com o mesmo entrypoint da função anterior e suas três dependências. Todos os quatro arquivos foram comparados com o código do commit `278f96949362eff789edaa0ea400df3d56c2db48` e são idênticos. Diagnóstico atual de HTTP mantido e `verify_jwt=false` preservado conforme função anterior, que tem validações próprias de origem/checkout.
- **Segurança temporal:** o servidor calcula `Date.now()`, rejeita os dois copos até `2026-10-15T12:00:00-03:00` e recalcula preço R$15,90 por copo. Chaves específicas de disponibilidade continuam obrigatórias para registrar pedidos.
- **Checkout:** permanece WhatsApp/Tintim para pedidos que contenham Crocantes. Carrinho misto, dados de entrega/retirada, Pix manual e pagamento pendente continuam no mesmo fluxo existente. Nenhum deploy das funções Mercado Pago ou do banco do Luciane Gestão.
- **GitHub CI:** adicionados caminhos comerciais e este documento ao fluxo de validação, para que futuras revisões recebam compilação, suíte integral e ZIP do mesmo SHA. 
- **Cloudflare Pages:** **NÃO PUBLICADO**. O responsável deve instalar o ZIP validado da branch antes da estreia e homologar as telas no Safari/Instagram. Caso o pacote não esteja instalado, o site publicado não terá o formulário de compra dos copos. Publicar não é tarefa automática desta intervenção.
- **Homologação pendente:** teste ponta a ponta em smartphone com a loja, com um pedido real após o horário de abertura. Não criar pedidos reais de teste em produção antes das 12h.

## 2.6.1 — Homologação privada de copos antes do lançamento
- **Autorização:** pedido explícito do responsável para testar em 14/10; acesso de clientes segue fechado até 15/10 às 12h -03.
- **Acesso:** página da edição com `?teste_crocantes=1`, código privado de 64 caracteres inserido em formulário (nunca no URL). Código é conferido na `create-whatsapp-order` contra apenas o SHA-256 armazenado em `public.crocantes_preview_access`, RLS habilitada sem acesso para anon/authenticated. A autorização expira automaticamente às 12h.
- **Validação real:** apenas a Edge Function reconhece o código, libera exclusivamente os SKUs dos copos antes das 12h, exige disponibilidade/loja aberta e recalcula os mesmos preços. Nenhum código secreto nem hash de token é embutido no bundle do site.
- **Mensagem/registro:** identifica o pedido de teste no texto WhatsApp e em `notes` no Supabase com aviso para NÃO PREPARAR / NÃO COBRAR. Pedido real de teste entra no histórico; marcar como cancelado depois da homologação para não contaminar os resultados.
- **Sem publicação:** esta alteração cria um ZIP específico de homologação. Cloudflare Pages deve ser publicado pelo responsável. Nada muda no horário comercial público. Expiração é controlada no servidor.

### Homologação 2.6.1 — implantação técnica verificada em 14/10/2026

- **Commit de código e testes:** `d36e6a7a4ee0bc4e5320ba43f70bcc18555a0b8f`, CI verde: 420/420, TypeScript e build aprovados.
- **Supabase comercial:** migration `crocantes_preview_access_20261014` aplicada; uma credencial temporária armazenada apenas como digest SHA-256, com RLS e acesso da Edge Function. Código em si **não** deve ser persistido no GitHub ou no site. Expira em 15/10 às 12h UTC−3.
- **Edge Function:** `create-whatsapp-order` versão **14**, status `ACTIVE`, arquivos da instância conferidos byte a byte contra GitHub, com diagnóstico anterior e regra de venda pública preservados.
- **Frontend de homologação:** `?teste_crocantes=1` revela campo de código na seção Crocantes. Não autoriza venda sem validação server-side; exibe quantidade e CTA ao receber autorização. Registra pedido real de **TESTE INTERNO — NÃO PREPARAR/NÃO COBRAR** e mensagem de WhatsApp identificada; o responsável deve cancelar pedido fictício após verificação, sem realizar pagamento Pix.
- **Deploy Cloudflare:** AINDA NÃO EFETUADO. Entregar ZIP de CI do SHA final para upload manual. Depois que o responsável publicar o ZIP, testar manualmente no Safari/Instagram iPhone, usando código privado, sem antecipar a liberação comercial.

### Homologação em Preview Cloudflare — 14/10/2026
- Domínio exato informado pelo responsável: `https://90.lucianeoliveiradoces.pages.dev`. Não confundir com domínio de produção.
- A função `create-whatsapp-order` passa a aceitar essa origem **somente antes de 15/10/2026, 12h -03:00**, além das origens anteriormente configuradas. Não há wildcard `pages.dev`.
- Apenas pedidos com código de homologação válido ou operação de verificação de código podem partir desse Preview; pedidos comuns sem código são rejeitados com `preview_only`. Após as 12h, a origem Preview é rejeitada com `preview_expired`, inclusive se estiver na variável de ambiente.
- A autorização privada continua com SHA-256/RLS e bloqueio no servidor. Nenhum token/hash é copiado para os arquivos públicos. O site de produção e sua habilitação comercial permanecem inalterados.
- Conferir CI antes de implantar a Edge Function, preservando `verify_jwt=false`, imports e diagnóstico de erro da função ativa. O pacote Cloudflare do Preview já havia sido instalado pelo responsável e **não precisa ser republicado por causa deste ajuste exclusivamente no backend**.

### Liberação de origem Preview 90 — verificada em 14/10/2026
- Link de homologação confirmado pelo responsável: `https://90.lucianeoliveiradoces.pages.dev/?teste_crocantes=1`. O código é digitado apenas no formulário de homologação; não deve aparecer na URL ou repositório.
- **CI do código:** `e4b272890ef2fcf0bf0fa450b7fafd183b03cbd8`, 421/421 testes e build concluídos no GitHub Actions `38573084129`.
- **Supabase comercial:** Edge Function `create-whatsapp-order` atualizada para **v15 ACTIVE**, `verify_jwt=false` preservado conforme implantação anterior. Entrypoint e três dependências implantados correspondem exatamente aos arquivos do commit de código.
- **Restrição CORS:** a origem Preview exata foi adicionada temporariamente, mesmo quando o ambiente define lista própria de origens; demais origens válidas preservadas. Sem wildcard. Após 15/10/2026 12h UTC−3, Preview expira. Enquanto aberta, essa origem só aceita validação do código ou pedido contendo código válido.
- **Credencial:** uma autorização de teste ativa, hash armazenado no Supabase com RLS, expira exatamente em 15/10 às 12h em Paragominas. Nenhuma chave secreta incluída no JS público.
- **Publicação:** não houve nova publicação Cloudflare. O responsável já informou o URL de Preview; falta homologação manual do pedido e da mensagem WhatsApp no iPhone. Não marcar pedido de teste como venda paga; cancelar depois de verificar.

## UI/UX Premium 2.7 — jornada comercial Crocantes e compra cruzada (14/10/2026)

- **Base:** HEAD remoto `59440865dcf98d0d8eb9505e283c494f04b112ee` de `design/luciane-editorial-vitrine-experiment-20261013`, mantendo a experiência boutique existente para Potes Gourmet e Fatias.
- **Diagnóstico com gravação no iPhone:** `!showLimitedCupView` removia explicitamente a barra flutuante da edição; após a verificação do código a página continuava perto do rodapé, exigindo rolagem manual; seleção e informação do copo utilizavam a mesma ação discreta; ambos os pontos de adicionar mais itens omitiam Crocantes.
- **Direcionamento:** após ativar homologação, rolamos para `crocantes-sabores`; ao selecionar Ninho/Chocolate, avançamos para `crocantes-quantidade`. Uma seção numerada (1,2) e rótulos explicativos tornam cada passo explícito. O mecanismo de abrir/fechar detalhes permanece, respeitando a seleção. A barra flutuante guiada usa o mesmo componente existente e orienta “Escolher meu sabor” → “Adicionar N copos”; some quando o botão inline está visível.
- **Conclusão uniforme:** depois de adicionar copos, usa o mesmo estado `addedNotice` dos outros produtos, retorna ao checkout existente e desloca até o recebimento. Não cria checkout paralelo nem muda cálculo, pedido no Supabase ou WhatsApp. Nenhum Pix é cobrado automaticamente.
- **Compra cruzada:** carrinho e confirmação do item adicionado oferecem `Outro pote recheado`, `Outra fatia` e `Copos Crocantes`, esta última opção exibida somente quando horário/autorização, loja e status remoto permitirem pelo menos um copo. Abre a vitrine de copos sem apagar o carrinho.
- **Segurança:** sem edição em Supabase, Edge Functions, regras de lançamento, preços, limite, fotografias, backend ou integrações. O código de homologação privado não vai para o repositório nem para o JS compilado. Testes e experiência no Safari/Instagram devem ser validados; nenhuma publicação automática em Cloudflare.
