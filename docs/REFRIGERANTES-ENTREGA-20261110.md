# Refrigerantes — entrega para homologação

10/11/2026 · America/Belem · Luciane Oliveira Doces

Implementação pronta para homologação, sem ativação produtiva. Código: `01afc47c3f899f632445163ee56a5e024d1b60cc`; base `9811b7cb2e4800ba25599e154b6c5871256f761a`; branch `feat/refrigerantes-complementos-premium-20261110`.

## Produtos e identidades

| Produto | Embalagem | Preço | Identidade | Disponibilidade |
|---|---|---:|---|---|
| Coca-Cola Zero | Lata 220 ml | R$4 | `coca-cola-zero-220` / `drink_coca_cola_zero_220` | Inicialmente oculta |
| Fanta Laranja | Lata 220 ml | R$4 | `fanta-laranja-220` / `drink_fanta_laranja_220` | Inicialmente oculta |
| Guaraná Antarctica | Garrafa 200 ml | R$3 | `guarana-antarctica-200` / `drink_guarana_antarctica_200` | Inicialmente oculta |
| Coca-Cola tradicional | Lata 350 ml | R$6 | `coca-cola-350` / `drink_coca_cola_350` | Inicialmente oculta |

Preservados os antigos IDs tradicional 220 ml/Fanta350 como históricos desabilitados. Fotografias são as quatro fornecidas, otimizadas em WebP sem reconstrução de produto.

## Experiência e preservação

A confirmação do doce apresenta os quatro refrigerantes em grade 2×2, depois os outros doces e recebimento. Oferta opcional: não há modal, rejeição, seleção padrão, carrossel ou nova etapa obrigatória. O CTA flutuante continua conduzindo à informação pendente. Depois de escolher recebimento, bebidas continuam no carrinho por `Adicionar refrigerante` recolhido. A quantidade aumenta no mesmo item, limitada a 99; remover/ajustar usa o carrinho existente.

Foram comparadas lista direta, grade compacta e primeira oferta expansível. A grade oferece visibilidade de todos os produtos sem esconder opções ou exigir outro toque. A primeira composição interna foi refinada por contraste e fotografias pequenas. A oferta final usa creme/chocolate, fotos em moldura preta e ações 44px. Não há comprovação de aumento de conversão; isso exige medição posterior.

IDs, sabores, caldas, preços dos doces, tarifas, endereço, pagamento, idempotência, recuperação, UTMs/Tintim, Pixel/CAPI, CRM, QZ e cozinha preservados. Não se dispara Purchase por adicionar bebida. Mantidas byte a byte as 58 imagens do último ZIP comercial; sincronizadas na fonte com manifesto de hashes. Microanimação do menu restrita ao pacote anterior também trazida para o código.

## Evidência executada

- 830 testes comerciais aprovados, zero falhas. Inclui paridade de preços, adulteração de valor/variante, quantidades inválidas, produtos legados, subtotal/frete, dois handlers reais em VM sem rede, erro/indisponibilidade, SQL isolada idempotente e itens ocultos/esgotados/ausentes, renderizadores da POS-58 e do admin e integridade de 58 assets.
- Build conectado ao Supabase comercial concluído; WhatsApp-only preservado, pagamentos online continuam desativados.
- TypeScript executado; mesmos quatro erros presentes na worktree limpa da base: `admin-trufadas-stock.tsx:165`, `db/index.ts:1`, `worker/index.ts:6` e `:7`. Nenhum novo erro; tsc integral permanece pendente dessas correções históricas.
- Chromium real: 320, 375, 390, 430 e desktop 1280 CSS px, por iframes da aplicação real. Sem overflow; imagens carregadas e botões 44px. Adições repetidas em todas as larguras. Na jornada observada: cone R$14 + 2 Coca Zero + Guaraná = R$25; Fanta = R$29; aumentar Coca = R$33; diminuir e remover Guaraná = R$26, mantendo doce; recarregar recuperou subtotal e retirada. Esgotado desabilita, Oculto some; item já no carrinho fica marcado e impede finalização. Falha de rede inicial não oferece bebidas.
- Capturas: primeira composição, revisão nas cinco larguras e estado final mobile (cone + Coca Zero, R$18). As imagens das revisões têm estados de carrinho diferentes; são registro do refinamento, não comparação de conversão.
- Limites: não Safari/iPhone/Instagram físico, WebKit, sessão admin real, saída física de papel ou pedidos/pagamentos reais. A SQL foi executada no PGlite isolado; a trava `FOR SHARE` foi revisada, mas não houve ensaio de concorrência multi-sessão no Postgres produtivo. Ações produtivas permanecem pendentes.

## Ativação — somente após autorização específica

1. Reconfirmar contrato e versão ativa do Supabase comercial `edqiwvccmboyayojvuea`, guardar backup atual. Não usar Gestão.
2. Aplicar somente `supabase/migrations/20261110124038_refrigerantes_complementos.sql`: amplia check para drink, insere quatro linhas hidden sem sobrescrever estados e cria trigger invoker de validação transacional. Sem estoque físico ou liberação automática.
3. Atualizar `create-whatsapp-order` usando o handler atual conferido v34 e o bundle candidato completo: `index.ts`, `commerce-catalog.mjs`, `drinks-catalog.mjs`, `delivery-localities.mjs`, `popcorn-promotion.mjs`, `trufadas-variants.mjs`, `receipt-card.mjs`. Confirmar os sete arquivos e cotação depois do deploy. Cinco dependências/handler anteriores permanecem iguais; não publicar arquivos antigos de outra branch.
4. Manter `create-order` v14 intacta enquanto o canal online estiver desativado. O código candidato dos dois caminhos reconhece bebidas e foi testado; a implantação do caminho online tem diferenças históricas além de bebidas e exige homologação específica antes de habilitar pagamentos. Não copiar cegamente um catálogo novo para a v14.
5. Somente após backend compatível, subir manualmente `Luciane-Oliveira-Doces-Refrigerantes-Premium-20261110-Cloudflare.zip`. Guardar deployment anterior para rollback. Este trabalho não publicou no Cloudflare.
6. Homologar no iPhone/Safari/Instagram: reconhecer embalagem/nome/volume/preço, toques, repetição, carrinho, entrega, mensagem e comanda. A proprietária confirma disponibilidade real e libera cada bebida no admin; o agente não presume quantidade.
7. Se precisar recuar: ocultar as bebidas, restaurar frontend anterior antes de retirar suporte Edge. Não voltar o constraint a três tipos depois de existirem pedidos drink. Função anterior v34 e site v14 estão arquivados para comparação; não restaurar sobre uma versão produtiva mais recente sem revisão.

## Pacote e reprodução

ZIP: 93 entradas; 7.500.650 bytes; SHA256 `aea256e4ff9b2f948dac2631606da277f0c5651bcb76e2c48831068f4ec8beb4`.

Rotas `/`, `/admin`, `/pedido`, worker, headers, scripts, hashes de imagens e conexão comercial verificados. Não inclui dados de QA, chaves privadas ou ambiente de testes local. A chave pública compilada é a mesma do pacote comercial anterior.

Com a versão Node do projeto e as variáveis públicas corretas: `npm ci`; `node --test tests/*.test.mjs`; `npx tsc --noEmit`; `npm run package:cloudflare:production`; `node scripts/verify-refrigerantes-package-20261110.mjs`. Não colocar segredos no frontend. O build final não importa o plugin de fixtures.

O plugin `scripts/qa-refrigerantes-fixtures-20261110.mjs` é opt-in local: usar numa cópia temporária de Vite config e `.sites-runtime/qa-status.json` vazio; ele serve `__lod_qa` nas cinco larguras, intercepta apenas consultas locais e bloqueia eventos externos via CSP. Remover esse import e restaurar o ambiente real antes de compilar. Nunca publicar fixtures.

## Arquivos do incremento funcional

- `app/admin/page.tsx`
- `app/catalog.ts`
- `app/category-navigation-packaged-20261108.css`
- `app/drink-complements-20261110.css`
- `app/layout.tsx`
- `app/menu-availability.ts`
- `app/page.tsx`
- `components/drink-complements.tsx`
- `docs/approved-assets-20261110.json`
- `docs/edge-release/rollback/20261110/site-v14.json`
- `docs/edge-release/rollback/20261110/whatsapp-v34.json`
- `lib/site-order.ts`
- `public/fatia-abacaxi-brigadeiro-branco-20261108.jpeg`
- `public/fatia-abacaxi-brigadeiro-branco-card-20261108.webp`
- `public/fatia-bombom-uva.avif`
- `public/fatia-chocolate-cenoura-card-6de0c35d.webp`
- `public/fatia-chocolate-cenoura.jpeg`
- `public/fatia-chocolate-maracuja-card.webp`
- `public/fatia-chocolate-maracuja.jpeg`
- `public/fatia-chocolate-morango-card.webp`
- `public/fatia-chocolate-morango.jpeg`
- `public/fatia-coco-cremoso-morango-card.webp`
- `public/fatia-coco-cremoso-morango.webp`
- `public/fatia-ninho-morango-card.webp`
- `public/fatia-ninho-morango.jpeg`
- `public/fatia-prestigio-card.webp`
- `public/fatia-prestigio.jpeg`
- `public/images/cone-trufado-dois-amores-20261108-360.webp`
- `public/images/cone-trufado-dois-amores-20261108.webp`
- `public/images/cone-trufado-dois-amores-card-20261108.webp`
- `public/images/cone-trufado-ferrero-rocher-20261108-360.webp`
- `public/images/cone-trufado-ferrero-rocher-20261108.webp`
- `public/images/cone-trufado-ferrero-rocher-card-20261108.webp`
- `public/images/cone-trufado-prestigio-20261108-360.webp`
- `public/images/cone-trufado-prestigio-20261108-v2-360.webp`
- `public/images/cone-trufado-prestigio-20261108-v2.webp`
- `public/images/cone-trufado-prestigio-20261108.webp`
- `public/images/cone-trufado-prestigio-card-20261108-v2.webp`
- `public/images/cone-trufado-prestigio-card-20261108.webp`
- `public/images/cones-trufados-trio-20261108.webp`
- `public/images/cones-trufados-trio-card-20261108.webp`
- `public/images/refrigerante-coca-original-350-20261110.webp`
- `public/images/refrigerante-coca-zero-220-20261110.webp`
- `public/images/refrigerante-fanta-220-20261110.webp`
- `public/images/refrigerante-guarana-200-20261110.webp`
- `scripts/qa-refrigerantes-fixtures-20261110.mjs`
- `supabase/functions/_shared/commerce-catalog.mjs`
- `supabase/functions/_shared/drinks-catalog.mjs`
- `supabase/functions/create-order/index.ts`
- `supabase/migrations/20261110124038_refrigerantes_complementos.sql`
- `tests/delivery-edge-isolated-flow-20261105.test.mjs`
- `tests/drinks-commerce-20261110.test.mjs`
- `tests/order-building-ux.test.mjs`
- `tests/phase2-backend.test.mjs`
- `tests/popcorn-premium-pricing.test.mjs`
- `tests/popcorn-weekend-promotion.test.mjs`
- `tests/trufadas-approved-assets-20261101.test.mjs`
- `tests/weekend-slices-mode.test.mjs`

Continuidade: atualizados Memória de Decisões, Referência Visual/UX, Matriz de Impacto e Checkpoint Vivo; Prompt Mestre permanece válido. O commit de documentação posterior não muda a árvore funcional usada para o pacote.
