# Cascões Trufados V4.7.5 — seis sabores e enquadramento consistente (13/11/2026)

## Escopo aprovado
Substituir somente os **cards individuais** dos sabores Prestígio, Dois Amores, Ferrero Rocher, Kinder Bueno, Ninho com Morango e Ninho Nutella e Chocotone. Manter a capa da categoria **trio** V4.7.4, a grade de três colunas, seis SKUs, todos os preços, disponibilidade e a engenharia do checkout. A foto do Ninho com Morango foi refinada para reduzir pequenas imperfeições da casca e aproximar a temperatura de luz das demais. Não remover o aspecto artesanal.

**Decisão de enquadramento:** no card mobile 4:5, privilegiar a tampa/recheio e ~70–80% do cone, com proporção semelhante entre os seis sabores. Evitar cortar a casca acima da metade (aproximação excessiva), mas também não afastar tanto que o recheio fique pequeno. O enquadramento é pré-processado em arquivos WebP individuais; CSS genérico de recorte permanece inalterado. Suporte transparente e bancada de granito no ambiente de cozinha permanecem visíveis quando cabem.

## Matriz dos seis sabores

| SKU | Fonte visual | Foto principal/card WebP |
|---|---|---|
| cone-trufado-prestigio | `686F9966-6FE7-4D6F-AC8E-6E664C7F54DE.jpeg` | `cone-trufado-prestigio-20261113-v475.webp` / `cone-trufado-prestigio-card-20261113-v475.webp` |
| cone-trufado-dois-amores | `07E320F2-F10A-4880-9634-7472B3B78681.jpeg` | `cone-trufado-dois-amores-20261113-v475.webp` / `cone-trufado-dois-amores-card-20261113-v475.webp` |
| cone-trufado-ferrero-rocher | `020B876C-4F29-4094-940D-1AC7612B9DEC.jpeg` | `cone-trufado-ferrero-rocher-20261113-v475.webp` / `cone-trufado-ferrero-rocher-card-20261113-v475.webp` |
| cascao-trufado-kinder-bueno | `Cascao_Kinder_Bueno_individual_previa.jpg` | `cascao-trufado-kinder-bueno-20261113-v475.webp` / `cascao-trufado-kinder-bueno-card-20261113-v475.webp` |
| cascao-trufado-ninho-morango | `a_crisp_high_resolution_close_up_food_photograph.png` (imagem refinada a partir da foto de referência) | `cascao-trufado-ninho-morango-20261113-v475.webp` / `cascao-trufado-ninho-morango-card-20261113-v475.webp` |
| cascao-trufado-ninho-nutella-chocotone | `Cascao_Ninho_Nutella_Chocotone_individual_previa.jpg` | `cascao-trufado-ninho-nutella-chocotone-20261113-v475.webp` / `cascao-trufado-ninho-nutella-chocotone-card-20261113-v475.webp` |

Cada sabor ainda recebe variante `{prefix}-20261113-v475-360.webp` para operações em tamanhos menores; 18 novos arquivos WebP. Essas imagens são **representações geradas/editadas**, não documentos fotográficos não manipulados de produtos efetivamente vendidos. Os acabamentos devem ser validados com a confeiteira, principalmente nas tampas. Prestígio tem tampa clara firme e sem decoração; Dois Amores tem duas metades consistentes; Ferrero traz acabamento com castanhas e bombom.

## Limites técnicos e publicação
- `app/catalog.ts`: troca exclusiva de `image`, `cardImage` e textos alternativos relevantes dos seis sabores.
- `app/page.tsx`: atualização da foto de miniatura do Kinder Bueno nos complementos; **capa V4.7.4 intocada**.
- Scripts de teste históricos atualizados para as referências atuais, sem afrouxar regras de SKU, preço, carrinho e disponibilidade.
- Os binários são guardados no ZIP de distribuição íntegra; a branch contém referências e testes, não todos os assets de mídia. Usar build **conectado** (não o de QA visual) da CI como código compilado para Cloudflare. Não publicar ZIP do CI isoladamente.
- Nenhuma alteração em Supabase, Edge, SQL, Cloudflare, PIX, WhatsApp, QZ Tray, estoque, pedido ou preços; publicação somente manual e autorizada à parte.
