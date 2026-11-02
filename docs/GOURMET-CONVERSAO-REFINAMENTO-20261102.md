# Luciane Oliveira Doces — Refinamento de Conversão Gourmet (02/11/2026)

## Base e segurança de publicação
- Repositório comercial: `railanzera-cloud/luciane-oliveira-doces-site`, separado de Luciane Gestão.
- Branch: `work/gourmet-refinamento-conversao-20261102`.
- Base cumulativa validada: `fix/cozinha-worker-id-undefined-20261102`, commit `3c0f76a1a8f3fbf068c73bab1941c656d7e5cae5` (inclui admin compacto, Gourmet 02/11 e correção QZ do worker).
- **Somente mudanças de apresentação e navegação Gourmet no frontend e testes.** Nenhuma mutação Supabase, checkout, pagamento, estoque, impressão QZ, Trufadas ou Fatias neste trabalho.
- O backend WhatsApp produção foi atualizado **em outra etapa, com autorização para correção urgente de vendas**, para `create-whatsapp-order` v26: a campanha reconhece preços 25/39/49 até 03/11 00:00 em America/Belem. Revalidar versão na hora de publicar, não regredir.
- `create-order` produção v14 pode ainda não ter a campanha; CI conserva `SITE_ORDERING_ENABLED='false'` (caminho ativo é WhatsApp). Não ativar site checkout/MP sem sincronizar o backend.

## Problemas identificados e corrigidos na experiência
1. Antes: promoção exibia três cartões informativos de preços iguais aos três seletores interativos abaixo, gerando ambiguidade. Agora há **uma peça editorial compacta sem preço em falso botão**, seguida dos três tamanhos reais.
2. Antes: sticky "Escolher meus sabores" navegava ao início da seção, e o visitante via título e imagem, sem o primeiro campo clicável. Agora scroll direcionado ao **primeiro tamanho ou primeiro sabor disponível**; quem escolheu os sabores acessa a quantidade/adiciona produto. O offset mantém o alvo visível acima da barra inferior e respeita `prefers-reduced-motion`.
3. Antes: "Sem adicional hoje" aparecia em Leitinho, que já tem o preço base, e em outros sabores. Agora o rótulo promocional e o valor antigo riscado aparecem **apenas em recheios dos grupos mais caros**, com economia real por pote/tamanho; sabor base não ganha falso desconto.
4. Três tamanhos Pote Gourmet (500 ml, 750 ml, 1 litro) agora formam **uma única grade de cartões interativos uniformes** no celular, com radio accessible, valores vivos do catálogo e estado selecionado legível. Limite de sabores continua exibido.
5. Componente `StorefrontCampaignEditorial` reutilizável + objeto de copy `GOURMET_HOLIDAY_CREATIVE`; precificação, disponibilidade e vigência continuam exclusivamente em `supabase/functions/_shared/popcorn-promotion.mjs` e catálogo. Novas promoções exigem decisão de preço e deploy de backend separados, nunca apenas mudar copy.

## Testes
- `node --test tests/*.test.mjs`, `npm run build`, `npx tsc --noEmit --project tsconfig.boutique.json`, `npx tsc --noEmit --project tsconfig.kitchen.json`.
- Novo teste de regressão `tests/gourmet-refinamento-conversao-20261102.test.mjs`.
- Novo roteiro visual `scripts/qa-gourmet-refinamento-20261102.mjs` com Chromium e WebKit em 320, 390, 1440 px, data do feriado e após expiração. Testa CTA real, radio clicável, seletor de sabores, disabled por estoque, preço promocional 500ml e retorno a R$33 após expiração.
- QA usa dados simulados sem registrar pedidos nem efetuar pagamentos. Safari/Instagram físico requer homologação posterior.

## Antes de publicar
1. Verificar branch/HEAD mais recente, CI e ZIP gerado do mesmo SHA; conferir se a produção Cloudflare não contém alterações posteriores.
2. Conferir status de `create-whatsapp-order` v26 em produção e `SITE_ORDERING_ENABLED=false` no ZIP. Se houver divergência de preço, **não publicar**, para não reproduzir erro HTTP 409 `price_changed`.
3. Não alterar Supabase nem Mercado Pago neste pacote. Evitar migrar SQL, mudar CRM ou QZ e nunca publicar substituindo operação posterior sem conciliação.
4. Publicar somente com autorização para publicar. Conferir no iPhone físico que o sticky aponta aos controles, o desconto é honesto e que um pedido **real, voluntário** é registrado pelo preço mostrado, sem gerar duplicatas.
5. Às 00h00 do dia 03/11 o texto promocional desaparece e os grupos de preços permanentes voltam no catálogo e backend WhatsApp.
