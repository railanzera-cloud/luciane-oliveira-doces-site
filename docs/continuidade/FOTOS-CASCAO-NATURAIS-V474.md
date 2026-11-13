# Cascões — atualização fotográfica V4.7.4 (13/11/2026)

## Decisão aprovada
Apenas a capa da categoria **Cascão Trufado** e as imagens de **Kinder Bueno**, **Ninho com Morango** e **Ninho Nutella e Chocotone** serão substituídas. Na capa: trio no suporte de acrílico transparente. Na seleção de sabor: **um cascão isolado por card**, em cenário de cozinha/bancada de granito, sem repetições desfocadas. Fotos de Prestígio, Dois Amores e Ferrero Rocher são preservadas. Não mexer em preços, status, identificadores ou jornada de compra.

## Limite de fidelidade
As quatro composições aprovadas são **representações geradas a partir de fotos reais e referências fornecidas pela loja**. Não afirmar que são fotografias não editadas do produto real, nem inventar ingredientes fora dos sabores. Ninho com Morango mostra estágio aberto, antes do fechamento; Kinder também mostra acabamento aberto; Ninho Nutella e Chocotone aparece fechado com tampa de chocolate. A confeiteira considera mudar a finalização, portanto validar apresentação efetiva antes de declarar paridade com o produto entregue.

## Origem dos binários (fora do GitHub-base)
- Capa: `62037B90-FB3B-45A2-A320-97DE7D1BCF40(1).jpeg`.
- Kinder: `Cascao_Kinder_Bueno_individual_previa.jpg`.
- Ninho com Morango: `a_close_up_realistic_food_photograph_in_portrait.png`.
- Ninho Nutella e Chocotone: `Cascao_Ninho_Nutella_Chocotone_individual_previa.jpg`.

O GitHub-base contém o **código e as referências**. Os 11 WebPs de 13/11 são inseridos somente no ZIP comercial completo, com auditoria SHA-256 e preservação de todos os outros recursos. **Nunca publicar isoladamente o build do CI.**

## Caminhos de imagem
- `images/cascao-trufado-trio-home-20261113-v474.webp` + `...-360.webp` (1122×770, 360×247).
- Para cada `{kinder-bueno,ninho-morango,ninho-nutella-chocotone}`:
  - `images/cascao-trufado-{sabor}-20261113-v474.webp` (principal);
  - `images/cascao-trufado-{sabor}-card-20261113-v474.webp` (600×750);
  - `images/cascao-trufado-{sabor}-20261113-v474-360.webp` (360×450).

## Segurança visual/comercial
- Capa e imagens individuais são trocas fotográficas, sem modificar o checkout, o carrinho, bebidas, entrega, disponibilidade, pagamento, cozinha, monitoramento ou administrações.
- Manter fallback original caso a nova capa não carregue.
- Preservar todos os arquivos e imagens de V4.7.3 no pacote.
- Validar o recorte dos cards em Safari/iPhone e na home com três sabores visíveis.
- Publicação no Cloudflare é manual e exige autorização específica. Nenhuma alteração de dados/Edge/SQL é necessária.
