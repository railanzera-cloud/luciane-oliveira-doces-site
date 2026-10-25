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

- **CI corretiva 2.7:** asserções legadas revisadas para o botão progressivo autorizado na edição, rótulo sem ambiguidade `Outro pote recheado` e CSS de escopo fechado. Funções isoladas do checkout mantêm proteção `typeof` para o novo contexto Crocantes, preservando casos de Pix/dinheiro/crédito/débito. A primeira execução (411/425) falhou devido a expectativas da interface anterior; não ocorreu alteração de backend comercial ou banco.

### Troca de endereço Preview 90 → 56, em 14/10/2026
- **Solicitação do responsável:** novo Preview de homologação `https://56.lucianeoliveiradoces.pages.dev`.
- **Ajuste mínimo de backend:** substituir exclusivamente `CROCANTES_TEST_PREVIEW_ORIGIN` de `90` para `56` na função `create-whatsapp-order`. Preview `90` deixa de ser autorizado por esta exceção; nenhuma autorização wildcard.
- Manter a origem de produção e as demais origens previamente configuradas, verificação de código SHA-256 no Supabase, bloqueio por data em 15/10/2026 às 12h (Paragominas) e sinalização de pedido de teste.
- **Sem alteração no frontend:** o pacote Premium 2.7 já publicado em Preview pelo responsável permanece válido, sem necessidade de nova instalação em Cloudflare para essa liberação de origem. A homologação manual de compras no iPhone e o envio efetivo da mensagem WhatsApp seguem pendentes.

### Confirmação operacional Preview 56 — Supabase v16
- Código da função no commit `bc39c07cfdcb829af72fda39c10febef2aea6ae1`: **425/425 testes**, build e TypeScript aprovados na execução GitHub Actions `38583360072`.
- Implantação realizada no projeto comercial `edqiwvccmboyayojvuea` somente da função `create-whatsapp-order`: **v16, ACTIVE**, preservando `verify_jwt=false` da versão anterior.
- Os quatro arquivos implantados foram conferidos contra o mesmo commit e possuem conteúdo idêntico. Origem `https://56.lucianeoliveiradoces.pages.dev` exclusivamente para homologação temporária; antiga exceção `90` revogada. Bloqueio de data e código privado mantidos.
- Nenhuma publicação Cloudflare, alteração em `main` ou nos outros projetos. Validar manualmente o novo Preview no iPhone e pedido de teste completo no WhatsApp. Nenhum pedido real de homologação foi enviado pela equipe técnica durante a implantação.

## Produção Premium 2.8 — ajustes finais de conversão e clareza (14/10/2026)

- **Objetivo:** preparar pacote pronto para publicação **manual pelo responsável**, a partir do último HEAD remoto `4e789650c68ec0120acb0eeedaada95736067e86`; nenhuma publicação automática, push na branch editorial somente, `main` e projetos paralelos intocados.
- **WhatsApp homologação:** `buildRegisteredOrderMessage` recebe `isHomologation=false` como parâmetro opcional. Somente quando um pedido de Copos Crocantes está em homologação privada, a mensagem apresenta aviso destacado `TESTE — NÃO PREPARAR / NÃO COBRAR`, omite chave Pix e qualquer orientação de pagamento ou comprovante. O checkout também instrui não transferir valores. Mensagem de pedidos reais mantém exatamente o formato, Pix e comprovante anteriores (comportamento padrão).
- **UI em venda ativa:** área dos copos adota faixa única de `400 ml · 190 g` e `R$ 15,90 por copo`, substitui o cartão grande de medidas e o painel redundante de detalhes; a descrição de Ninho/Chocolate aparece no passo `02 · QUANTOS COPOS?` após a escolha. Informação de escassez permanece numa linha editorial compacta. Antes da estreia, o bloco existente de anúncio e explicação permanece intacto.
- **Compra cruzada:** os dois pontos do checkout agora usam `Adicionar outro copo` quando já há Crocantes no carrinho, ou `Adicionar copo Crocante` quando o pedido contém apenas os outros produtos. Preservados fluxos de volta, seleção, quantidade, barra móvel, entrega/retirada, Pix real, estoque, metadados de marketing, integrações e cálculos.
- **Liberação automática:** `2026-10-15T12:00:00-03:00` continua sendo avaliado pelo servidor e frontend; nenhum comando de liberação ou atualização de banco foi necessário. A homologação fica isolada e expira no horário.
- **Homologação:** um pedido #1232 foi identificado no Supabase com status de pagamento pendente e observação de teste. Ainda não será considerado pago nem cancelado automaticamente, porque esta tarefa é apenas fechamento do site comercial. Testes automatizados, build e conferência manual do ZIP são obrigatórios antes da entrega. Homologação física da última mudança no iPhone ainda não ocorreu.

## Premium 2.9 — compra dos Crocantes controlada pela loja (14/10/2026)

- **Base preservada:** Premium 2.8, commit `aa93e68db55da4eed3c85b5383af3369c6ab21cc`, branch editorial. A `main` não foi modificada. O fechamento comercial `orders_open=false` foi confirmado no Supabase `edqiwvccmboyayojvuea` antes da implementação.
- **Decisão operacional:** não existe abertura automática para 15/10 às 12h. A interface de escolha/quantidade permanece disponível, mas a inclusão real e o checkout dependem de `orders_open=true`, categoria e SKU disponíveis, com validação novamente no Supabase durante o pedido. O preço autoritativo R$ 15,90, volume 400 ml e peso 190 g, carrinho misto e WhatsApp permanecem.
- **Frontend:** a fase da edição agora depende apenas de loja/estoque (disponível, loja fechada, esgotada ou indisponível). O cronômetro de liberação, restrições de data no carrinho, botão e mensagens de estreia foram removidos. Apresentação compacta da Premium 2.8, fotografias reais, fluxo mobile, barra flutuante e categorias restantes preservados.
- **Backend:** catálogo e Edge Function `create-whatsapp-order` deixam de condicionar a cotação à data. `orders_open`, disponibilidade por categoria/produto, preço autoritativo, idempotência, fluxo RPC, CORS e validações do pedido continuam obrigatórios. Nenhuma migração ou exclusão de registros foi realizada.
- **Homologação anterior:** parâmetro `teste_crocantes`, entrada do código e transmissão de token foram removidos da interface; o servidor rejeita explicitamente campos de teste e a URL de Preview 56, sem apagar o pedido histórico #1232 nem a tabela histórica de tokens. A opção legada de formatar mensagens fictícias não é usada na compra real.
- **Escopo de testes:** atualizadas as expectativas legadas da abertura por horário e adicionados testes de liberação operacional/segurança em `tests/crocantes-premium-29-operacao.test.mjs`. Os testes, TypeScript, build e ZIP oficial devem ser conferidos no GitHub Actions após avançar a branch. Não afirmar validação no Safari físico.
- **Implantação:** esta seção documenta a revisão de código, **não** autoriza deploy de Edge Function ou Cloudflare. O backend publicado continua sendo v16 até autorização específica. Para liberar vendas: manter a loja fechada, implantar Edge Function coordenadamente, publicar ZIP manualmente e, somente quando for hora de operar, abrir a loja pelo painel.

- **Checkpoint promovido à branch oficial (código + testes):** `9e1b2d647aff6b27e0b09d62e24c36d8e98fc919`. Publicação Cloudflare e Edge Function não realizadas; o CI da revisão precisa ser confirmado antes de entregar um pacote de produção.

### Implantação coordenada do backend — Premium 2.9 (14/10/2026)

- A loja comercial foi consultada imediatamente antes da implantação: `orders_open=false`. Continuou fechada na verificação posterior.
- A Edge Function comercial `create-whatsapp-order` foi implantada no projeto `edqiwvccmboyayojvuea` como **v17 ACTIVE**, com `verify_jwt=false` preservado da v16, mantendo a autenticação interna por chave publicável autorizada.
- O entrypoint e suas três dependências foram comparados com o commit **`baf46d520af7e130d80ccbd3cc7ca0422d1abd17`**: conteúdo dos quatro arquivos implantados idêntico ao repositório.
- **CI aprovada:** GitHub Actions [38604689109](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/38604689109), com **431/431 testes**, build, TypeScript e validação do ZIP aprovados; arquivo de produção contém 60 arquivos e CRC íntegro.
- **ZIP oficial para publicação manual**: `luciane-oliveira-doces-cloudflare-pages.zip` do artefato `11914863220` gerado pelo commit `baf46d5`, SHA-256 `da1a3ee0ea9d79939b61666547ea9523cefe92db3d8ccfcf518ce77e502a097c`. O pacote disponibilizado ao responsável é binariamente idêntico.
- **Não foi feito deploy do Cloudflare, merge na main, migração ou alteração do estado da loja.** A abertura deverá ser decidida manualmente no painel administrativo depois de o responsável instalar e conferir a Premium 2.9.
- **Homologação física Safari** da nova versão e criação de pedido real seguem pendentes da operação pelo responsável; não criar pedidos fictícios no sistema comercial para validar.

## Premium 2.9.1 — clareza e conversão dos Copos Crocantes (14/10/2026)

- **Ponto de partida:** Premium 2.9 operacional aprovada; fotos, paleta Chocolate Editorial Premium, preço, categorias, carrinho, pagamento, WhatsApp/Tintim, Pixel/CAPI e painel preservados.
- **Somente refinamentos UI/UX Crocantes:** (1) seleção não se desfaz com segundo toque, estado passa a `aria-pressed` e selo discreto `Selecionado` com check; (2) a numeração aparece apenas nas etapas, nunca nos sabores Ninho/Chocolate; (3) instrução muda entre comprar e conhecer sabores segundo o estado operacional; (4) controles de quantidade inativos e barra flutuante da edição oculta quando a loja está fechada; (5) aviso de fechamento compacto e legível.
- **Segurança:** nenhuma alteração de banco, disponibilidades, valor de pedido, autenticação, Edge Function ou integrações. A Edge Function `create-whatsapp-order` v17 permanece responsável por validar `orders_open`, estoque e preços.
- **Testes:** suíte histórica atualizada para o novo comportamento sem enfraquecer verificações de fluxo, e incluído `tests/crocantes-premium-291-claridade.test.mjs` para testar segundo toque, estados de venda, acessibilidade e preservação da finalização. O CI em GitHub Actions precisa passar por TypeScript, build, testes e ZIP antes de entrega.
- **Entrega:** registrar SHA final da branch validada e utilizar exclusivamente o ZIP desse commit. **Não publicar Cloudflare automaticamente**, não tocar em `main`, e não alegar validação do Safari físico além das gravações enviadas pelo responsável.

## Premium 2.9.2 — volume único e vitrine de loja fechada (14/10/2026)

- **Objetivo:** eliminar o peso informado de `190 g` na apresentação comercial dos Copos Crocantes, preservando apenas **400 ml**, R$ 15,90 por copo, sabores, fotos, identidade Chocolate Editorial Premium e jornada já homologada.
- **Loja fechada/indisponível:** não mostrar a etapa **“02 · Quantos copos?”** nem controles de compra inativos. A seleção do sabor exibe somente sua descrição curta. O aviso de fechamento orienta: “As vendas estão pausadas. Você ainda pode conhecer os sabores.”
- **Loja aberta e produto disponível:** preservar as duas etapas, seletor de quantidade, CTA de adição, checkout, carrinho misto e WhatsApp. A seleção permanece estável com `aria-pressed`.
- **Consistência comercial:** `app/page.tsx` exibe apenas 400 ml; `app/catalog.ts` usa `label` e `whatsappLabel` “400 ml” nos dois SKUs; `supabase/functions/_shared/commerce-catalog.mjs` utiliza `size_label: "400 ml"` no pedido estruturado. Os identificadores `variant_id: "400ml"`, os preços e a disponibilidade permanecem iguais.
- **Backend implantado:** projeto comercial `edqiwvccmboyayojvuea`, função `create-whatsapp-order` **v18 ACTIVE** (somente `commerce-catalog.mjs` mudou da v17; demais arquivos verificados idênticos ao código). Confirmado `orders_open=false` antes e depois. Nenhum pedido criado, nenhuma migração, nenhuma alteração de estado da loja.
- **Validação:** GitHub Actions [38615252560](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/38615252560), `439/439` testes aprovados, TypeScript, build e ZIP conferidos. Testes adicionais em `tests/crocantes-premium-292-volume-e-jornada.test.mjs`.
- **Entrega:** nova publicação de frontend apenas por ZIP manual em Cloudflare Pages. Não modificar `main`, não fazer merge ou publicação automática. A checagem final no Safari do iPhone continua com o responsável.

## Premium 2.9.3 — rótulos contextuais para adicionar mais produtos (15/10/2026)

- **Escopo:** somente microcopy de botões de continuidade comercial, em `app/page.tsx`. A lógica de adicionar produtos, fotos, preço, disponibilidade, carrinho, entrega, checkout, WhatsApp, Pixel, Supabase e painel não foi modificada.
- **Carrinho sem Pipoca Gourmet:** botão para essa categoria = `Adicionar pote recheado`; com `pipoca-gourmet` no carrinho = `Outro pote recheado`. Copos Crocantes não são potes Gourmet, portanto não alteram essa contagem.
- **Carrinho sem fatia:** botão = `Adicionar fatia`; com qualquer SKU de `SLICES` = `Outra fatia`. O rótulo reflete os itens reais no carrinho, não só a última categoria escolhida.
- **Copos Crocantes:** preservada a regra existente `Adicionar copo Crocante` / `Adicionar outro copo`, baseada na presença de Crocantes no carrinho.
- **Aplicação uniforme:** confirmação `Adicionado ao pedido` e área `Adicionar mais itens` do carrinho usam `addMoreButtonLabel` (uma única lógica).
- **Testes:** `tests/order-building-ux.test.mjs` cobre carrinho vazio, Gourmet, fatia, Crocante isolado e pedido misto, além de verificar as três áreas de botões. Registrar como validado somente após CI passar.
- **Implantação:** branch editorial existente, `main` preservada, Cloudflare Pages continua sob publicação manual; nenhuma alteração no Supabase ou na branch isolada da impressora.


## Pipocas Trufadas em pacotes — preparação para estreia de 18/10/2026

- **Origem:** branch editorial `design/luciane-editorial-vitrine-experiment-20261013`. Desenvolvimento isolado `feature/pipocas-trufadas-pacotes-20261017` (PR de homologação #3). Esta seção documenta apenas mudanças da linha anteriormente apresentada como Copos Crocantes.
- **Confirmação comercial do responsável em 17/10:** estreiam dois sabores na nova embalagem transparente com zíper: Caramelo e Chocolate; Caramelo e Ninho. O nome público passa a **Pipocas Trufadas**. A produção de copos foi limitada e encerrou; nenhum terceiro sabor nem amendoim/morango nesta estreia. **Preço preservado em R$ 15,90 por pacote.**
- **Fotos oficiais desta revisão (aprovadas na conversa):** `public/images/pipocas-trufadas-chocolate.avif` e `public/images/pipocas-trufadas-ninho.avif`. Foram incluídos arquivos binários reais e otimizados, usados tanto no teaser da home quanto nos detalhes clicáveis. CSS mantém a bolsa completa visível por `object-fit: contain`, com ambiente bege e superfícies boutique originais. As fotos antigas e dos potes Gourmet/fatias permanecem no repositório.
- **Naming e jornada:** home, detalhe, nomes dos sabores, seleção, quantidade, CTA, checkout, confirmação e compras adicionais descrevem pacotes e nunca mais copos em linguagem comercial. Textos de edição limitada, estreia antiga e sem reposição foram substituídos pela disponibilidade operacional real da loja. A gramagem não foi anunciada; rótulo exibido é somente **Pacote** ou **Pacote com zíper**.
- **Compatibilidade histórica:** `product_id` permanece `crocante-ninho` e `crocante-chocolate`, `variant_id` permanece `400ml`, e as chaves de estoque remoto permanecem `crocante_copo_ninho`/`crocante_copo_chocolate`. Não apagar ou migrar pedidos antigos, nem mudar tabela de preços, canais de checkout ou estado da loja. `app/catalog.ts` e `supabase/functions/_shared/commerce-catalog.mjs` foram atualizados para apresentar descrições de pacote e manter preço de R$15,90.
- **Backend remoto NÃO implantado por esta intervenção:** o código autoritativo da Edge Function publicado no Supabase pode continuar emitindo nome/medida antiga até uma implantação coordenada e explicitamente autorizada. Antes da publicação, homologar concordância entre catálogo novo no frontend, backend de pedidos e estoque, com a loja fechada quando apropriado. NÃO implantar apenas parte da mudança.
- **Verificações:** suite completa Node.js, TypeScript, build e ZIP devem ser confirmados no GitHub Actions do SHA final da branch. Testes históricos afetados por mudança intencional de apresentação foram adaptados; verificações de preço, keys, estoque, checkout, Pix/WhatsApp/CRM continuam vigentes. O arquivo `tests/trufadas-pacotes-20261018.test.mjs` adiciona assertions dos dois arquivos AVIF reais e compatibilidade.
- **Publicação:** não houve merge da `main`, Cloudflare nem implantação de Edge Function. A revisão da interface em Safari físico (principalmente recorte/legibilidade em tela pequena, loja fechada/aberta e carrinho misto) permanece pendente do responsável. Publicar somente depois da homologação e autorização.
- **Checkpoints:** conferir o HEAD da branch, resultado do GitHub Actions e artefato ZIP do mesmo commit antes de distribuir. Não confundir esta branch de lançamento com homologação aprovada/publicada.


## Implantação coordenada — Pipocas Trufadas (17/10/2026)

- **Autorização:** responsável autorizou implantação completa em 17/10/2026. Esta seção atualiza o status histórico de "backend NÃO implantado" registrado acima, sem apagar o checkpoint de preparação.
- **Supabase comercial correto:** `edqiwvccmboyayojvuea`. `create-whatsapp-order` passou de **v21** para **v22 ACTIVE**, `verify_jwt=false` preservado. O catálogo backend agora anuncia `2026-10-18.trufadas-pacote`, os dois nomes novos e `size_label: "Pacote"`. A frase de esgotamento foi alterada de "copo" para "pacote".
- **Correção de segurança preservada:** a função v21 publicada continha tratamento específico para `crocante_sem_estoque` que faltava no arquivo versionado anterior. Ele foi portado para o GitHub antes da implantação, com apenas o texto voltado a pacote. Sem regressão de validação, preço, idempotência, chaves ou fluxo WhatsApp; `receipt-card.mjs` e `popcorn-promotion.mjs` permanecem idênticos à v21 publicada.
- **IDs históricos preservados:** `crocante-ninho`, `crocante-chocolate`, `crocante_copo_ninho`, `crocante_copo_chocolate`, `variant_id: 400ml`. Nenhuma migração, exclusão ou mudança de disponibilidade de estoque foi feita. O nome físico exibido ao consumidor não exige migrar SKUs históricos.
- **Conferência operacional antes do deploy:** `orders_open=true` (loja aberta pelo operador, inalterada), ambos os sabores históricos `sold_out` no estoque remoto. NÃO marcar estoque disponível sem confirmação de produção. Depois do deploy a função v22 foi relida e confirmou `ACTIVE`, os quatro arquivos e o catálogo versionado correto.
- **Checkpoint de compatibilidade em código:** `9daa9816b4c6b837615b0e42c24bb42ae5d107d4`, na branch `feature/pipocas-trufadas-pacotes-20261017`. Verificação CI GitHub Actions [39069424101](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/39069424101): build, TypeScript, **442 testes aprovados**, criação de ZIP e integridade aprovados.
- **Frontend pronto para publicação manual:** o ZIP Cloudflare gerado pelo CI acima contém 62 arquivos, `index.html`, `admin/index.html`, `pedido/index.html`, ambas as imagens AVIF e os textos novos. SHA-256 do ZIP interno: `648d63a24cf6f58c4b9f9769e14a4d3f6a4b82739551f174c77b6395ff1370d6`. A publicação de Cloudflare **ainda não foi efetuada nesta intervenção**, pois esta conexão não fornece ação para deploy Cloudflare e o pipeline GitHub apenas disponibiliza o ZIP, não publica automaticamente. NÃO declarar produção atualizada.
- **Próxima ação operacional exata:** responsável abre Cloudflare Pages do site comercial, executa **Upload assets** / deployment manual usando o ZIP interno validado, aguarda deploy e confirma as duas imagens e a jornada no Safari. Revalidar o estoque e a compatibilidade de uma compra real apenas pela operação autorizada; não gerar pedidos fictícios ou movimentar estoque remotamente. Não alterar a branch `main` por esta publicação.


## Pipocas Trufadas — restauração do estoque por sabor (17/10/2026)

- **Solicitação:** Luciane deve definir a quantidade já produzida para cada um dos dois pacotes, a qualquer momento. A venda interrompe ao esgotar; não vender produção futura sem saldo. Continuar sem gramagem até confirmação; R$15,90 por pacote preservado.
- **Banco já possuía estoque transacional:** tabelas `crocante_inventory` e `crocante_inventory_holds`, funções protegidas `admin_get_crocante_inventory`, `admin_set_crocante_inventory`, `public_crocante_inventory`, além dos triggers que fazem reserva e reconciliação. **Não foram recriadas tabelas, reescritas funções ou migrados pedidos.** As chaves `crocante_copo_ninho` e `crocante_copo_chocolate` continuam internas e históricas.
- **Estoque remoto no diagnóstico:** Ninho = 0; Chocolate = 0, ambos habilitados no registro de estoque e `sold_out` na disponibilidade. **Nenhuma quantidade foi inventada, abastecida ou liberada.** A Luciane cadastra a produção real no painel.
- **Painel autenticado:** novo `components/admin-trufadas-stock.tsx`, renderizado em `app/admin/page.tsx`, separado dos potes Gourmet e das fatias. Para cada sabor: quantidade total atual, disponíveis, reservas, ativação individual, formulário numérico e salvamento. A RPC usa versão para evitar sobrescrever uma alteração de outra sessão; impede total inferior ao já reservado; mostra falhas sem fingir sucesso.
- **Vitrine pública:** `lib/public-menu-availability.ts` consulta a RPC pública de saldo real além da disponibilidade do cardápio; `app/menu-availability.ts` considera saldo zero, inclusive quando há reservas ativas. Se a RPC de estoque estiver inacessível ou devolver dados inválidos, **somente esses dois sabores ficam indisponíveis**, preservando potes Gourmet e fatias.
- **Jornada do pedido:** `app/page.tsx` respeita estoque por sabor no botão, seleção de quantidade e carrinho, somando pacotes do mesmo sabor em diversas linhas; atualiza o saldo antes de adicionar/finalizar. **A proteção final permanece no banco, transacional e atômica**; a consulta pública não substitui os triggers.
- **Metadados:** renomeados somente os dois `menu_availability.name` de Crocantes para Trufadas no Supabase comercial, mantendo `item_key`, `status=sold_out` e preço. `app/menu-availability.ts` usa os novos rótulos.
- **Backend comercial já implantado no passo anterior:** Edge Function `create-whatsapp-order` versão 22 ACTIVE, com foto/nome comercial de pacote, chave e preço preservados. Nenhum novo deploy de função foi necessário nesta etapa.
- **Verificações:** `tests/trufadas-stock-controls.test.mjs` adiciona verificações direcionadas; testes históricos de seleção, fechamento e checagem de quantidade foram mantidos/adaptados para cobrir a proteção adicional. Exigir CI com testes, TypeScript, build e ZIP da mesma revisão antes da entrega.
- **Status de implantação:** o frontend **ainda não foi publicado no Cloudflare**. Entregar ZIP do GitHub Actions associado ao HEAD validado; não publicar nem alterar `main` sem ferramenta de publicação compatível. Homologação final da interface em Safari/iPhone com a Luciane continua pendente.


## Refinamento fotográfico — reenquadramento próximo dos pacotes (17/10/2026)

- Usuário aprovou duas novas fotos em estúdio, mais próximas, com a embalagem totalmente visível e menos lateral de fundo: sabores Caramelo e Ninho / Caramelo e Chocolate. São as imagens exatas da geração aprovada, otimizadas para AVIF 840x1050 (35.865 e 41.462 bytes respectivamente). A etiqueta e o produto das fotos permanecem como aprovados, sem novos sabores, preços ou quantidades.
- Substituídos os binários em `public/images/pipocas-trufadas-ninho.avif` e `public/images/pipocas-trufadas-chocolate.avif`. URLs de home, detalhes e catálogo receberam `?v=20261017-zoom2` para evitar cache persistente das fotos antigas.
- Proporção declarada das quatro imagens no JSX corrigida de 840x1260 para 840x1050. CSS de vitrine mantém `object-fit:contain` (embalagem completa), equilibra o fundo bege dos componentes com a fotografia e suaviza apenas as laterais de fundo em detalhe, sem esconder zíper, etiqueta nem base.
- Não houve alterações de Supabase, estoque individual, status dos produtos, preço, pedidos, jornada do carrinho ou checkout. Branch isolada de homologação; CI (build, TypeScript, testes e ZIP) é pré-requisito para publicação manual no Cloudflare Pages.


## Pipocas Trufadas — refinamento premium mobile (18/10/2026)

- **Origem:** `work/whatsapp-trufadas-sem-pacote-20261018` no commit `b8e5093d37ff92cd0aa0834ee57a2218c5d9300f`. Nova branch: `work/trufadas-refinamento-premium-mobile-20261018`. Consultar seu HEAD antes de continuar.
- **Escopo:** apresentar melhor os dois sabores já aprovados, reduzir repetição do texto, dar respiro às legendas, reforçar a seleção e reorganizar a quantidade com subtotal contextual e CTA de leitura direta.
- **Seleção:** mesmo `cupFlavorPreview`, `aria-pressed`, mesmos componentes de imagem `pipocas-trufadas-ninho.avif`/`chocolate.avif`, sem alterar crop, fontes fotográficas ou preço unitário de R$ 15,90.
- **Subtotal:** antes da escolha exibe valor unitário sem sugerir que já há um pacote selecionado; depois da escolha mostra `15.9 * cupQuantity`, sem alterar o cálculo comercial real. Botão principal mantém o handler `handleCupPurchaseAction` e a validação de estoque `addCrocantesCup`.
- **Botão flutuante:** mantidos `IntersectionObserver`, threshold `0.45`, margem inferior `-68px` e condições de ocultação enquanto o botão embutido está visível. Rótulo antes da seleção passa a indicar `Preço por pacote`; após seleção, sabor e quantidade.
- **Limites:** somente `app/page.tsx`, CSS editorial e teste específico; não altera banco, estado operacional, catálogo, IDs, WhatsApp, Meta, estoque, QZ, cozinha, pagamentos, Resultados ou Cloudflare.
- **Testes:** CI deve executar TypeScript/build/testes e produzir pacote ZIP do mesmo commit. Confirmar status real no GitHub Actions antes de declarar aprovado.
- **Homologação manual:** Safari no iPhone (320–430px), sabores Ninho e Chocolate, aumento/diminuição de quantidade, giro/rolagem, estados esgotado/loja fechada, rolagem que oculta/mostra a barra, teclado do checkout e adição ao carrinho. Nenhuma publicação automática.


## Trufadas Premium Vivas — refinamento da categoria permanente (18/10/2026)

- Base consultada e CI aprovado: `work/trufadas-refinamento-premium-mobile-20261018` / `a736ea75b35045627c63cd392e8cf6f8e718eb04`.
- Branch desta rodada: `work/trufadas-experiencia-premium-viva-20261018`. Conferir HEAD remoto antes da próxima tarefa.
- Objetivo: amadurecer Pipocas Trufadas como categoria permanente, com respostas ao toque, destaque inequívoco do sabor, controles +/- mais legíveis, subtotal com microanimação curta, status de estoque discreto e CTAs com acabamento premium.
- No bloco de escolha, chips e marca superior ficam visíveis apenas para o sabor efetivamente selecionado; `aria-pressed`, clique e avanço automático continuam os mesmos.
- A ação de adicionar mantém `handleCupPurchaseAction` e checagem de estoque real antes do carrinho; estado ocupado ganha spinner, sem simular confirmação.
- O link de carrinho permanece contextual e leva a `carrinho`; a área final passa a oferecer exploração voluntária de Pipocas Gourmet e, somente quando `fatiasAvailable`, Fatias Artesanais, mantendo os handlers existentes e a disponibilidade.
- Ajuste de respiro apenas em `#configurador.is-cup-discovery` para aproximar visualmente o checkout. Não alterar a rolagem automática nem os observers: `threshold: 0.45` e `rootMargin: "0px 0px -68px 0px"`.
- Fotos AVIF já aprovadas intactas, mesmo preço de R$ 15,90, IDs, quantidade limitada por estoque, Meta, WhatsApp, pagamentos, cozinha, QZ Tray, resultados e Supabase sem mudança.
- Animar apenas interações breves; respeitar `prefers-reduced-motion`, `:focus-visible`, estados desabilitados e telas de 320–430px.
- CI do commit gerado deve aprovar build, TypeScript, regressão e ZIP; homologação Safari físico continua indispensável. Sem deploy, sem merge em main.

## Checkout Premium Unificado — 18/10/2026

- Origem: `work/trufadas-experiencia-premium-viva-20261018` no commit `9ba4ffc1cd5a22e4c2d5674588f0b5ac18b8289d` (CI 496/496). Nova branch: `work/checkout-premium-unificado-20261018` (consultar HEAD antes da próxima tarefa).
- Escopo: refinamento visual de cabeçalho, progresso, carrinho, quantidade, cards de produto, sugestões, confirmação de item, entrega/retirada, identificação, campos, pagamento, resumo, CTA principal e barra flutuante.
- Implementação isolada no CSS novo `app/storefront-checkout-premium.css`, importado após o editorial; seleção e feedback continuam usando classes e handlers existentes. Barra fixa recebe somente classe visual `is-checkout-flow`, sem alterar observadores, thresholds, rotas ou ações.
- Removido somente o texto redundante ` · pacote com zíper` de `addedNotice.description` nas Trufadas. Mensagem curta mantém quantidade, nome Pipocas Trufadas e sabor (`Caramelo e Ninho` ou `Caramelo e Chocolate`), sem modificar etiqueta estrutural, mensagem final, catálogo ou backend.
- Preservados: fotos, preços, IDs, estoque, carrinho, entrega, retirada, taxas, Pix, Mercado Pago, WhatsApp, Meta/Tintim, QZ Tray, Modo Cozinha, pedidos históricos, admin, dados de clientes e Supabase.
- CI deve validar build, TypeScript, testes, ZIP e preservação de rotas/ativos; não publicar no Cloudflare, não fazer merge na main.
- Homologação Safari iPhone: quantidade e remover, adição de itens por atalhos, botão flutuante contextual, recebimento, campos de cliente, endereços, pagamentos e validação de resumo; conferir zoom, teclado e telas 320–430px. Sem presumir homologação física concluída.

## Investigação de estoque Trufadas — 18/10/2026 (registro histórico anterior à aplicação)

- Branch técnica isolada `fix/trufadas-recontagem-sem-dupla-baixa-20261018`, baseada na versão comercial unificada `work/checkout-premium-unificado-20261018` (`f64443a76c93d15cc5b63e0c107e795e15f6c0c4`). Não mesclar com main sem aprovação.
- Migração da cozinha ainda divergente incorporada como arquivo e teste da branch `fix/cozinha-trufadas-impressao-reserva-pendente-20261018`, já presente no runtime do Supabase; preservar no próximo merge.
- Luciane conferiu fisicamente seis pacotes Ninho e cinco Chocolate depois das saídas, sem novas saídas físicas desde essa conferência, segundo o operador. Não significa pagamentos automaticamente confirmados.
- Banco consultado sem alteração: por volta de 18h05, Ninho total_stock=2 version=10, Chocolate total_stock=3 version=12. Reconsultar imediatamente antes de qualquer reconciliação.
- Diagnóstico: reservas com expires_at=30 minutos voltam à vitrine enquanto pedido confirmado continua em andamento; confirmação tardia pode baixar produtos já considerados na contagem manual, por falta de marco de inventário.
- SQL proposto em `supabase/migrations/20261018185000_trufadas_stocktake_reservation_reconcile.sql`: marca `last_physical_recount_at`, helper de reservas, reservas mantidas durante pedido confirmado e consumo uma vez em `paid` ou `completed`; pedido pré-contagem resolve alocação sem baixa duplicada.
- Migração NÃO repõe estoque automaticamente, NÃO altera pagamentos, NÃO atualiza pedidos históricos e NÃO retrocede histórico. O usuário ainda NÃO autorizou DDL nem reposição em produção.
- Antes de autorização: confirmar se os 6/5 são pacotes livres e descompromissados fisicamente; reavaliar novos pedidos e versões; preservar snapshot das funções para rollback. Depois de autorização: migração, restauração por RPC administrativa sob verificação, testes de consultas e reconciliação sem vendas artificiais.
- Diferenciar pacotes que saíram fisicamente de pagamentos pendentes no banco. Sem deploy ou merge de main.

## Estoque Trufadas — Produção corrigida e reconciliada (18/10/2026)

- **Supabase comercial `edqiwvccmboyayojvuea`:** migrado em produção; sem alterações financeiras, de pedidos históricos ou de QZ/Meta/Tintim; nenhum deploy Cloudflare.
- Duas migrações registradas no banco: `20261018214151` (reconciliação e reserva) e `20261018214755` (preservação do marco e proteção contra reserva reativada sem estoque).
- **Marco físico registrado:** 18/10/2026 18:43:08 (America/Belem). Último pedido de Trufadas #1374 contém 1 Ninho, já pago/contabilizado, e não foi deduzido novamente.
- **Saldos após a intervenção:** Ninho = total 5, reservados 0, disponíveis 5, versão 12; Chocolate = total 5, reservados 0, disponíveis 5, versão 13. A função pública foi testada sob o papel anon e devolveu 5/5.
- Históricos `held` anteriores ao marco continuam preservados (20 reservas / 22 unidades) mas deixam de consumir as quantidades recontadas. Se um desses pedidos for confirmado posteriormente, o estoque NÃO deve sofrer nova baixa física.
- Os próximos pedidos com reservas novas passam a ser descontados durante a preparação/aceitação até pagamento confirmado ou conclusão operacional. Controle de versão continua válido.
- A partir dessa migração, atualizações comuns em `Pacotes em estoque` mantêm o marco congelado e devem considerar as reservas novas no **total** cadastrado; o painel calcula `Disponíveis = total - reservado`. Se necessário, melhorar o texto do painel em uma intervenção UI posterior, sem alteração financeira.
- CI da branch `fix/trufadas-recontagem-sem-dupla-baixa-20261018` no commit `f4ff201753f19a342bbd9eff01c61436d2156dcc`: 512/512 testes, build/TypeScript, ZIP de build, aprovado. Não publicar ZIP sem necessidade; revisão foi somente de backend.
- Nota: a homologação real de uma próxima venda e confirmação antiga ainda depende da operação (não foram criados pedidos de teste em produção). Consultar `docs/TRUFADAS-ESTOQUE-RECONCILIACAO-20261018.md` para detalhes.


## Nova fatia Coco Cremoso com Geleia de Morango — 24/10/2026

- Implementação na branch `feature/fatia-coco-cremoso-morango-20261024`, base `60b62fb9f48c1be755e106035ff444a5adca3444`.
- Nome comercial exato: **Coco cremoso com geleia de morango na massa branca**; preço unitário **R$ 20,00**; produto id `fatia-coco-cremoso-morango`; disponibilidade `slice_coco_cremoso_morango`.
- Integração do catálogo público `app/catalog.ts`, disponibilidade `app/menu-availability.ts` e cotação autoritativa `supabase/functions/_shared/commerce-catalog.mjs`, compartilhada pela Edge Function `create-whatsapp-order`.
- Mesmas opções e fluxo das demais fatias, com escolha de calda, quantidade, carrinho, WhatsApp, pedido e etiqueta. Os registros anteriores permanecem intocados.
- Migração incremental `20261024153000_fatia_coco_cremoso_morango.sql`, insere somente o novo item com controle individual no /admin, sem reativar produtos ocultos.
- Foto aprovada de origem `fatia_de_bolo_com_coco_e_frutas_vermelhas.png`. Assets de entrega `fatia-coco-cremoso-morango.webp` e `fatia-coco-cremoso-morango-card.webp` serão inseridos no ZIP de Cloudflare por empacotamento de assets aprovados; **os binários fotográficos não foram inseridos nesta branch do GitHub devido à limitação de transferência de mídia do conector**. Para qualquer build futura, os arquivos devem estar disponíveis em `public/` antes de empacotar.
- Cloudflare não publicado automaticamente. Antes da homologação comercial, validar o deploy ativo, que a foto abre, que a fatia aparece e que backend aceita cotação R$20 sem pedido artificial.


### Homologação técnica e aplicação do backend — 24/10/2026
- **Código do catálogo, disponibilidade, validador do backend e testes:** implementados e revisados no GitHub, sem alteração da `main`.
- **Supabase comercial:** inserção idempotente da linha `slice_coco_cremoso_morango`, tipo `slice`, categoria `category_fatias`, status `available`. Migração de produção registrada como `20261024182017_add_fatia_coco_cremoso_morango_20261024`.
- **Edge Function `create-whatsapp-order`:** versão 23 ativa. Foi alterado somente o catálogo compartilhado dessa função; os outros arquivos da versão 22 foram preservados e a configuração `verify_jwt=false` continuou igual por já usar autenticação própria com chave publicável.
- **Teste real de leitura do banco:** `anon` consegue consultar a nova linha como `available`. Não foram criados pedidos fictícios, nem simulados pagamentos.
- **CI:** execução `40119899885`, 515 testes aprovados, TypeScript/build íntegros e ZIP completo do código. Versão pronta para publicação manual.
- **Fotografia:** principal `fatia-coco-cremoso-morango.webp` e card `fatia-coco-cremoso-morango-card.webp` são incorporadas e validadas no ZIP final de entrega, baseado no ZIP aprovado do CI. **A mídia binária ainda não está no repositório GitHub e deve ser preservada no ZIP de entrega ou enviada para `public/` no GitHub antes de uma compilação futura.** Nunca assumir que um ZIP reconstruído apenas com o GitHub já contém essa fotografia.
- **Cloudflare:** NÃO foi publicado nesta intervenção. O novo produto só aparecerá na versão pública após o operador publicar o pacote consolidado. O estado Aberto/Fechado da loja não foi modificado.
- **Homologação prática pendente:** verificar no Safari a miniatura, preço R$20, escolha de calda, quantidade, carrinho, entrega/retirada, checkout até WhatsApp e opção Disponível/Esgotado/Oculto no /admin; não marcar um pedido fictício em produção.

### Refinamento final — título da fatia no cartão (24/10/2026)

- Branch `work/fatia-coco-nome-curto-vitrine-20261024`, origem `c0a4ac0bf6c578568b6494977da61374a0ebe674`. Escopo **apenas visual** na vitrine Fatias Artesanais.
- A fatia `fatia-coco-cremoso-morango` mantém `name: "Coco cremoso com geleia de morango na massa branca"` (catálogo de pedidos e backend).
- Novo `cardName: "Coco Cremoso com Morango"` e `subtitle: "Geleia de morango · Massa branca"` para **o cartão de seleção somente**.
- O cartão usa `slice.cardName ?? slice.name` para não alterar o texto das outras fatias. Escolha de calda, quantidade, carrinho, resumo, WhatsApp, preço R$20 e disponibilidade intactos.
- Peso global `SLICE_WEIGHT_GRAMS=380` permanece como estava; confirmar peso real da nova fatia posteriormente, sem fabricar medida.
- A foto oficial está presente no pacote de mídia aprovado, mas ainda não é versionada como binário no GitHub. Ao empacotar o build do mesmo commit, reinserir as duas imagens WebP aprovadas sem alterá-las e verificar ambos os recursos no ZIP final. Não publicar o Cloudflare automaticamente.

### Correção de repetição no pedido — Fatia Coco Cremoso (24/10/2026)

- Origem validada: commit `43ab818358369039c5a28a74aab507f80c391251`; branch de correção `fix/fatia-coco-sem-repeticao-checkout-20261024`.
- Causa: `productLabel()` concatenava `name + (subtitle)` inclusive quando o nome oficial já contém "geleia de morango na massa branca". Isso aparecia no carrinho, aviso após adição, resumo e payload WhatsApp.
- Corrigido sem tocar no catálogo nem no backend: `productLabel` retorna `product.name` integral para `fatia-coco-cremoso-morango`, sem repetição. As outras fatias preservam sua concatenação anterior.
- Helper exclusivamente visual `productCheckoutLabel` usa `cardName` ("Coco Cremoso com Morango") no carrinho, aviso de adição e resumo. Detalhe editorial "Geleia de morango · Massa branca" fica em linha secundária própria, não dentro do título. A vitrine permanece idêntica.
- WhatsApp usa nome oficial completo uma única vez, e a opção de calda no campo de acabamento; IDs, valores, disponibilidade, banco, cozinha e pixel preservados.
- Nenhum deploy Cloudflare automático; as fotos WebP aprovadas seguem fora do repositório como binários e precisam entrar no ZIP do commit (mesmo conteúdo do pacote anterior).

### Correção de rótulo no painel de Pedidos — 24/10/2026

- Base: `c0a6ac88dce2af5138055b48a1f91cd34ae6f45d`; intervenção `fix/admin-pedidos-quantidade-fatias-clara-20261024`. Escopo apenas visual no componente `AdminOrdersPanel` e helper puro `lib/admin-order-item-display.ts`.
- Caso real comprovado #1396: item Coco com `quantity=2`, `size_label="1 fatia"`, preço unitário R$ 20 e subtotal R$ 40; nenhum erro de quantidade armazenada. O painel mostrava `2x ... — 1 fatia`.
- Agora exibe `2x Coco Cremoso com Morango` em destaque e `2 fatias · Com calda de chocolate` como detalhe. Para outras fatias, singular/plural de acordo com `quantity` e o mesmo texto original das opções.
- Somente itens com variante `size_label="1 fatia"` recebem esse formato. Produtos com tamanho 750 ml e embalagens de pipoca conservam a exibição anterior.
- Sem alterações em banco, itens históricos, fila de impressão, ESC/POS, WhatsApp, pagamentos, Meta, estoque, cozinha ou registro de pedidos. Não publicar em Cloudflare sem autorização.
- O pacote Cloudflare completo precisa incluir as fotografias aprovadas `fatia-coco-cremoso-morango.webp` e `fatia-coco-cremoso-morango-card.webp`, ainda não versionadas como binários no GitHub. Validar rotas e imagens após empacotamento.

## Chocolate com Morango — pré-reservas em 25/10/2026
- 3 bolos × 7 fatias = 21 previstas, R$ 22 cada; estimativa de finalização às 17h (America/Belem).
- SQL migração `20261025154000_chocolate_morango_pre_reserva.sql`: duas tabelas de lote/alocação com RLS e sem acesso público direto; RPC de quantidade não revela pedidos; reserva transacional no INSERT de item; cancelamento libera uma vez; atendimento/WhatsApp mantidos.
- Em 25/10 às 15:28, marcado Chocolate com Morango `sold_out` no Supabase para evitar venda imediata enquanto a loja não tem fatias prontas.
- A RPC `create_whatsapp_store_order` reconhece exclusivamente o lote válido e registra `PRÉ-RESERVA` nas notas do pedido; a cozinha não aceita automaticamente esse pedido, nem imprime até 17h e início manual de preparo.
- O backend Edge revalida essa exceção em caso de `sold_out` e transforma erro de lote esgotado em mensagem amigável. O frontend exibe previsão, saldo de reservas e orientações, e mantém checkout/pagamento sem registrar pagamento fictício.
- Lote inicia `enabled=false`: somente habilitar depois de Edge migrada, CI validada e ZIP publicado em Cloudflare. Não ativar loja nem disponibilizar imediatamente sem essas etapas; usuário publica Cloudflare manualmente.
- Após contagem física da produção e atendimento, desabilitar o lote e administrar disponibilidade regular sem reabrir automaticamente se ainda indisponível.

### Estado de produção — pré-reserva 25/10/2026, após validação
- Migração SQL de pré-reserva aplicada no projeto comercial correto; lotes/ajustes de estoque isolados.
- `create-whatsapp-order` versão **24** implantada com base no código desta branch, preservando os 3 arquivos auxiliares anteriormente implantados e o estado `verify_jwt=false` protegido por validação de publishable key.
- Conferido com papel `anon`: `public_slice_preorder()` retornou `{active:true, remaining:21, ready_at:"2026-10-25T20:00:00+00:00"}` após habilitação do lote às 15:41 (America/Belem). Não foram criados pedidos artificiais.
- `menu_availability.slice_chocolate_morango` permaneceu `sold_out` até publicação do frontend novo; somente frontend atualizado pode habilitar a seleção por RPC de pré-reserva.
- Migração complementar `20261025154500_strawberry_preorder_guard.sql` impede trocar para venda pronta via painel enquanto o lote estiver habilitado.
- **Pendência física**: aguardar produção e confirmar à Luciane depois das 17h; a previsão não dispara automaticamente liberação de impressão.
- Não houve deploy no Cloudflare. O ZIP completo da mesma revisão deve receber as fotos WebP aprovadas e ser publicado manualmente. Não mudar main/merge.

## Refinamento de comunicação da pré-reserva Chocolate com Morango (25/10)
- Origem confirmada `12606e969166650dd38aa2eec93376c43a03fdf8`. Só copy: convite da próxima fornada na vitrine, rótulos de CTA ao escolher Chocolate com Morango, aviso no carrinho e WhatsApp.
- Sem alteração no checkout, quantidade de 21, estoque, horários, pagamento, redirecionamento Tintim, impressão, Supabase, regras de loja aberta ou outras fatias.
- Rótulo “Finalizar pré-reserva no WhatsApp” só quando carrinho tiver Chocolate com Morango em pré-reserva; demais produtos usam rótulo antigo.
- Evitar promessa de prontidão e pagamento confirmado: previsão 17h aproximada, loja confirma disponibilidade e entrega/retirada.
- Ao gerar ZIP completo, anexar as mesmas imagens aprovadas `fatia-coco-cremoso-morango.webp` e `fatia-coco-cremoso-morango-card.webp` apenas para não regredir outro sabor, sem tocar nele.
