# V4.7.13 — capa da categoria Cascão Trufado com trio real aprovado (14/11/2026)

## Pedido e decisão visual
O usuário pediu substituir **apenas a fotografia da capa da categoria Cascão Trufado na vitrine inicial**, sem gerar outra imagem nem trocar as fotografias individuais dos produtos. A imagem **explicitamente escolhida** é a **primeira composição coletiva** aprovada no chat, reenviada pelo usuário como `3FA1E744-6520-442E-9965-B06BDC2AC3D3.jpeg`, SHA-256 `659e671f0339db5a49e60c7d9c0a0fb511d3b174022c461867a1d4b923c6e108` (1448 × 1086 px).

Composição: Prestígio branco de coco à esquerda; Ninho com Morango (morango vermelho) **ligeiramente à frente e destacado no centro**, não todos alinhados no mesmo plano; Ferrero Rocher com castanhas à direita. Cenário caseiro de parede bege discreta, bancada de granito e suportes transparentes. **Não usar** a segunda geração que colocou os três topos perfeitamente alinhados.

## Escopo de código-fonte
Linha única em `app/page.tsx`, dentro do card `photo={coneIsVisible("cascao-trufado-kinder-bueno") ? ...}`:

- **Antes:** `/images/cascao-trufado-trio-home-20261113-v474.webp`
- **Depois:** `/images/cascao-trufado-trio-home-20261114-v4713.webp`
- Mantido o fallback `/images/cones-trufados-trio-20261108.webp` quando a condição de visibilidade não se aplica, a lógica de disponibilidade, `photoWidth={1122}`, e miniatura automática `photo.replace(".webp", "-360.webp")`.

Testes anteriores que verificavam o caminho v474 foram atualizados. Teste dedicado: `tests/home-cascao-trio-aprovado-v4713-20261114.test.mjs`.

## Mídias do pacote Cloudflare
Conversão fiel da imagem aprovada sem regenerar/retocar o conteúdo, somente resize LANCZOS e codificação WebP:
- `images/cascao-trufado-trio-home-20261114-v4713.webp`: 1122×842, SHA-256 `7913836d714400e444aa2ac8847ec6fa14133c1838d4cde5e43531d21c4e2347`
- `images/cascao-trufado-trio-home-20261114-v4713-360.webp`: 360×270, SHA-256 `f18e0c9d4c06b4397a23cf6f16c985d9d6d223bf33b8170b58fb60640ff8371c`

Base do pacote: `LODC_SITE_V4_7_12_BAUDUCCO.zip`, SHA-256 `d0d9920d129d616b46eb2286c6027741d90d006736f003c80a4057be290cef30`. Novo ZIP: `LODC_SITE_V4_7_13_CAPA_CASCAO_APROVADA.zip`, **169 entradas, 14.299.813 bytes**, SHA-256 `43c0edfbecfdab3bc670900db8143e59f2259270db3e7e70be9c8777e73e936f`.

Conservadas bit a bit **140 mídias anteriores**, inclusive os quatro Cascões recentemente substituídos e as fatias de Chocottone. Novo URL de capa e miniatura em arquivos distintos para evitar cache immutable. Os 15 módulos de frontend foram consistentemente renomeados para `-v4713.js`, com importações relativas/absolutas atualizadas. Validação do ZIP: CRC, manifesto 15 módulos, **134 referências internas encontradas**, **zero ausentes**, `node --check` dos 15 JS, texto de Bauducco e catálogo anterior inalterados.

A compilação foi atualizada no pacote de distribuição verificado; a fonte GitHub mantém o novo caminho correspondente. **Não** publicar o artifact isolado de CI, pois pode não conter todas as mídias históricas. Nenhuma modificação em Edge, SQL, preços, status real de produto, WhatsApp, pagamentos ou impressão. **Publicação Cloudflare é manual**, sem deploy realizado pelo assistente; Safari real e produção ainda exigem validação independente.
