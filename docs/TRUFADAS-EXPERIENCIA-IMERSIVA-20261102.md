# Trufadas — experiência imersiva progressiva — 02/11/2026

## Origem e decisão de produto
- Repositório: `railanzera-cloud/luciane-oliveira-doces-site`.
- Branch nova: `work/trufadas-experiencia-imersiva-20261102`.
- Base: `work/trufadas-configurador-premium-20261102`, SHA `28921ca12200feec54cb301e9fd51779ab076e4a`, 673 testes / CI e ZIP aprovados na etapa anterior.
- Demanda: eliminar números repetidos, reduzir excesso de instruções, dar espaço ao título "Escolha o tamanho", reforçar estados P/M/G e alinhar a transição de entrada às demais categorias.
- **Escopo estrito:** configurador interior de Pipocas Trufadas; preservar a vitrine inicial, cabeçalhos compartilhados, Gourmet, Fatias e todos os serviços comerciais.

## Nova jornada
1. A vitrine mantém três categorias; o clique em Trufadas preserva parâmetros de campanha e usa o mesmo `scrollTo({behavior:"smooth"})` das Pipocas Gourmet, respeitando `prefers-reduced-motion`. O antigo salto instantâneo da edição foi removido.
2. Internamente há um único título editorial "Escolha seu sabor", com os três cartões e fotos reais; a régua adicional 01/02/03 e os subtítulos numerados foram removidos.
3. Ao escolher um sabor, aparece o painel de tamanhos (P/M/G), com `padding` lateral consistente, badge de sabor, cartas visuais profundas, check dourado e press feedback. Sem inventar disponibilidade, peso ou preço.
4. Ao escolher um tamanho, aparece o painel "Seu pacote" com quantidade, preço exato e ação. Antes disso, a página não exibe subtotal enganoso. Trocar de sabor limpa tamanho e quantidade como antes.
5. Oferta de outras categorias e nota artesanal aparecem depois da seleção, ou quando a loja está fechada; estados de loja e estoque permanecem distintos.
6. O observer da barra inferior volta a observar o CTA quando este surge após escolher o tamanho, evitando duplicação de ações na tela do iPhone.

## Contratos preservados
- Preços P/M/G distintos por sabor, 9 SKUs, chaves de inventário, verificação remota, baixa/hold e concorrência.
- IDs históricos, fotografias aprovadas, catálogo, WhatsApp, Mercado Pago/Pix, QZ Tray, CRM, Meta/Tintim e painel.
- Sem alteração em banco, migrations, Edge Functions, Cloudflare ou `main`.
- Preservar a Edge Function `create-whatsapp-order` v25 observada na documentação do incidente de 01/11, sem reimplantá-la via pacote antigo.

## Validação e portão
- Testes Node relevantes e suíte total, TypeScript, build, pacote Cloudflare com integridade, executados no workflow da branch final.
- QA automatizada própria `scripts/qa-trufadas-imersiva.mjs`: Chromium/WebKit 320, 375, 390, 430, 1440 px; navegador simulado e dados sintéticos interceptados, sem pedidos nem transações em produção; fotos, preços, estados aberto/fechado/esgotado, seleção e overflow.
- Capturas devem ser inspecionadas; WebKit automatizado **não equivale** a Safari real no iPhone e navegador do Instagram.
- Somente oferecer ZIP homologado do mesmo SHA. Publicação e merge exigem autorização específica e confirmação do deployment atual.
