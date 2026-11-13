# V4.7.12 — identificação da massa Bauducco nos quatro cards de Natal

**Data:** 13/11/2026. **Escopo autorizado:** inserir uma linha de procedência **“Chocottone Bauducco”** imediatamente abaixo do sabor de cada fatia, **dentro da categoria de Natal**, preservando a vitrine externa e o título “Escolha suas fatias.”.

## Comportamento
- Quatro cards gerados por `visible.map(product)` em `components/christmas-collection.tsx`; inserir um `<span className="natal-product-base">Chocottone Bauducco</span>` diretamente após `h4` e antes da nota condicional `Brigadeiro branco`.
- Estilo localizado em `app/colecao-natal-2026.css`: tipografia pequena em bege suave, sem selo/logo ou falsa alegação de parceria; min-height do heading adaptado para harmonizar duas colunas em mobile.
- Trata-se de informação declarada pela proprietária sobre a **marca do chocottone utilizado como base**, não uma garantia independente de procedência. Se a marca mudar, a descrição precisa ser revisada.
- Não alterar fotos, nomes dos recheios, valores R$22, SKUs, disponibilidade, carrinho, Woo/WhatsApp, Edge, Pagamentos, QZ, Meta ou páginas externas.

## Base e release
Código-fonte isolado em `refine/natal-bauducco-subtitulo-cards-v4712-20261113`, derivado de `fix/cascao-ninho-nutella-chocottone-v479-20261113` (PR #49). O pacote de publicação manual **deve ser derivado do ZIP íntegro V4.7.11 já aprovado visualmente em produção**, e não de artefato CI sem as fotografias consolidadas.

Cloudflare segue **manual**. Não confundir testes e package com publicação efetiva.
