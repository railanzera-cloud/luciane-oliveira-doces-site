# V4.7.6 — Kinder e Ninho Nutella sem fundo desfocado + preço mínimo do Cascão

**Data:** 13/11/2026. **Base:** PR #45, branch `feat/cascao-seis-fotos-enquadramento-v475-20261113`, commit `2eea28cae5b5cca618346e016607d983e87f3ad4`. Novo trabalho isolado na branch `fix/cascao-fotos-sem-desfoque-preco-v476-20261113`.

## Pedido e decisão visual

Substituir somente as fotografias de **Kinder Bueno** (card inferior esquerdo) e **Ninho Nutella e Chocotone** (card inferior direito). O usuário forneceu duas imagens de 1122×1402 com cenário de cozinha natural e sem prolongamento artificial desfocado nas laterais ou na base. Preservar o mesmo enquadramento aproximado 4:5, topo valorizado e casca centralizada; nenhuma mudança de cor, brilho, ingredientes ou preenchimento sintético.

As novas versões WebP são:
- `images/cascao-trufado-kinder-bueno-20261113-v476.webp`, `-card-20261113-v476.webp`, e `-20261113-v476-360.webp`
- `images/cascao-trufado-ninho-nutella-chocotone-20261113-v476.webp`, `-card-20261113-v476.webp`, e `-20261113-v476-360.webp`

Nas imagens de card, crops do original: Kinder `(111,15,1011,1140)`, Ninho `(146,45,976,1083)`, ambos para 600×750; reamostragem LANCZOS, WebP qualidade 86. As imagens grandes reproduzem a foto enviada; formato móvel 360×450. Não adicionar desfoque, faixas laterais nem objeto extra. Restantes quatro sabores e capa trio V4.7.4 permanecem integralmente preservados.

## Correção do valor mínimo

A V4.7.5 tinha o literal `A partir de R$14` no botão flutuante, divergindo da lista de seis Cascões de R$18/R$18/R$20/R$20/R$20/R$20. Em `app/page.tsx`, a variável `coneStartingPrice` passa a ser derivada das variantes vendáveis, com fallback ao catálogo quando a disponibilidade remota ainda não foi confirmada. Botão flutuante e card externo usam o mesmo cálculo. Backend, centavos, SKUs, pedidos, taxas e pagamentos permanecem inalterados.

## Pacote integral Cloudflare (não publicar automaticamente)

**Base imutável:** `LUCIANE_COMERCIAL_V4_7_5_CASCOES_SEIS_FOTOS_PADRONIZADAS_PUBLICAR_MANUALMENTE.zip`, SHA256 `f2b46410b0fe9eec1bc6b7cb63fdeb421e1fa13e5f6f5b1831e051e85446a111`.

**Novo:** `LUCIANE_COMERCIAL_V4_7_6_FOTOS_SEM_DESFOQUE_PRECO_CASCAO_PUBLICAR_MANUALMENTE.zip`, SHA256 `8cca763e0b7c927c75affb1b5529756f8076d33dda415a8fc6c7a3176ef11d37`. **151 arquivos**, 12.383.858 bytes. Mantém **todas** as 145 entradas de arquivo anteriores (mídias originais idênticas bit a bit) e soma seis WebPs novos. O bundle comercial V4.7.5 foi alterado pontualmente para espelhar a lógica dinâmica do preço e apontar às novas fotos, com renomeação coordenada dos JS cacheados sob `max-age=31536000, immutable`. Alterações textuais propagadas ao manifesto e HTML/rotas, sem troca de canais, APIs ou lógica de pedido.

**Provas locais:** ZIP CRC e lista íntegros; novos paths presentes; hash de todas mídias anteriores preservado; nenhuma referência JS antiga pendente; HTML aponta para entradas JS existentes. Testes de CI/visual devem ser registrados separadamente quando concluídos; sem declarar Safari físico ou atendimento real. Cloudflare, Edge, SQL, estoque, pagamento e `main` não alterados nesta implementação.

**Rollback:** republicar V4.7.5 completo (não ZIP de CI isolado), sem trocar backend de preços; nunca reverter Edge separadamente.
