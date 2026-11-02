# Edição Gourmet de Hoje — 02/11/2026 — Liberação controlada

## Escopo
- Projeto comercial: `railanzera-cloud/luciane-oliveira-doces-site`, Supabase COMERCIAL `edqiwvccmboyayojvuea`, Cloudflare Pages.
- Branch de entrega: `work/feriado-gourmet-preco-unico-20261102`.
- Origem cumulativa: `fix/cozinha-qz-pedido1544-diagnostico-20261102` SHA `18be356f4c713b9b685631c317acc029644e8902`; contém o admin compacto e o QZ de continuidade.
- Foco **somente Pipocas Gourmet de pote recheado**, não alterar preços das Pipocas Trufadas (pacotes) nem Fatias.
- Promoção já autorizada como especificação comercial para **segunda-feira, 02/11 (Finados), só hoje**. Ainda não autoriza automaticamente deploy do banco/Edge nem publicação Cloudflare, conforme protocolo do projeto.

## Contrato de preços
Preço vigente durante `[2026-11-02T00:00:00-03:00, 2026-11-03T00:00:00-03:00)`:
- 500ml: R$25,00 para todos os recheios disponíveis, até 2 sabores.
- 750ml: R$39,00 para todos os recheios disponíveis, até 2 sabores.
- 1 litro: R$49,00 para todos os recheios disponíveis, até 3 sabores.

Valores normais, que **não são modificados**:
- Grupo 1: R$25, R$39, R$49.
- Grupo 2: R$30, R$45, R$55.
- Grupo 3: R$33, R$48, R$58.
A combinação normalmente é cobrada pelo grupo mais caro, sem somar recheios.
Promoção ignora grupo de preço, mas **NÃO** suspende disponibilidade (esgotados permanecem esgotados), validação de ingredientes/opções, pagamento, entrega, Meta/Tintim, reserva de estoque nem limites do tamanho.

## Implementação
- `supabase/functions/_shared/popcorn-promotion.mjs`: relógio absoluto de Belém, horários de início/fim e tabela promocional.
- `app/catalog.ts`: já importa e usa a mesma função de promoção no cálculo do frontend.
- `supabase/functions/_shared/commerce-catalog.mjs`: já usa a mesma promoção na cotação autoritativa do backend WhatsApp.
- `supabase/functions/_shared/popcorn-quote-campaign.mjs` e `supabase/functions/create-order/index.ts`: cotação compatível do backend Site com desconto calculado no servidor, nunca confiando em valores do navegador. Overlay preserva outros produtos, taxas, linhas e opções.
- `hooks/use-popcorn-promotion.ts`: já atualiza relógio na borda exata, no foco e ao retornar à aba.
- `app/page.tsx`: banner editorial atraente na escolha do tamanho, preços por pote, textos claros e comparação real dos preços usuais de sabores especiais.
- `app/gourmet-feriado-20261102.css`: estilos isolados e responsivos, reduzida animação, sem tocar nas demais categorias.
- `tests/popcorn-weekend-promotion.test.mjs`: limite de tempo, três tamanhos, todos os 8 recheios e combinações, checkout WhatsApp e Site, restauração da tabela no dia seguinte.

## PRÉ-REQUISITO PARA PUBLICAR (IMPORTANTE)
**Não publicar somente o ZIP de frontend.** O Cloudflare exibirá R$25/R$39/R$49 mas as Edge Functions atualmente implantadas ainda têm regra de preços de outubro ou preços normais (verificado na inspeção inicial). A compra pelo Site e/ou WhatsApp pode então cobrar valor diferente ou rejeitar o carrinho.

Implantação coordenada após autorização específica, nessa ordem:
1. Snapshot/backup dos *códigos atuais* e versões das Edge Functions de produção: `create-whatsapp-order` versão 25, `create-order` versão 14 (verificar novamente antes de mudar).
2. Publicar `create-whatsapp-order` com os seus arquivos atuais preservados e `_shared/popcorn-promotion.mjs` atualizado para 02/11. Sem tocar em flags de JWT, autenticação, outros produtos ou fluxo de confirmação.
3. Publicar `create-order` preservando integralmente o `index.ts` atual e o `commerce-catalog.mjs` vigente, integrando somente o overlay `popcorn-quote-campaign.mjs` + promoção; alternativa ao passo 3: se o checkout Site estiver realmente desativado, registrar essa condição, mas não presumir.
4. Testar cotações puras com os dois handlers antes de liberar tráfego real. Não criar pedidos fictícios reais nem pagamentos de teste sem autorização.
5. Publicar o ZIP Cloudflare do **mesmo commit** validado, conforme versão remota ativa e histórico de produção, sem fazer merge automático da main.
6. Homologar no navegador do Instagram/Safari iPhone: escolher tamanho, Kinder Bueno + Nutella, confirmar subtotal, carrinho e finalização; confirmar preço registrado num pedido real voluntário. Conferir também os sabores pausados.
7. Às **00h00 de 03/11, America/Belem**, a promoção desaparece e os dois cálculos de servidor retornam à matriz normal sem operação humana. Evitar manter página aberta com carrinho velho; o frontend força recálculo ao finalizar.

## Reversão
- Se o frontend não puder entrar em produção, não deixar a promoção ativa somente no backend sem decisão comercial explícita. Reverter as Edge Functions aos arquivos/versões anteriores, ou concluir a publicação completa.
- Se a mudança falhar, preservar pedidos e pagamentos; não limpar `orders`, `print_jobs` ou estoques.
- Sem migrações SQL e sem alteração de banco planejadas. Sem reprecificar pedidos históricos.

## Limitações
- Um ZIP válido não é produção publicada. Não afirmar que a oferta está disponível para clientes até confirmar Cloudflare e Edge Functions.
- Esta entrega não inspeciona o vídeo específico (não anexado nesta solicitação até o momento); a implementação foi fundamentada no código real e nos requisitos informados.
