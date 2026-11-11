# Entrega técnica — Natal 2026 — Chocotones individuais

**Data:** 11/11/2026. **PR:** #27 (`feat/colecao-natal-chocotones-20261111`, base PR #25). **Build funcional:** `d44fcec0a0b990cc3f4c215ae0c7689153ec301a`.

## Produto
- Ninho com Nutella, SKU `chocotone-ninho-nutella`, `chocotone_ninho_nutella`, R$18,99.
- Ferrero Rocher, SKU `chocotone-ferrero-rocher`, `chocotone_ferrero_rocher`, R$18,99.
- Casadinho, SKU `chocotone-casadinho`, `chocotone_casadinho`, R$16,99.
- Morango com Brigadeiro Branco e Chocolate, SKU `chocotone-morango-brigadeiro-branco-chocolate`, `chocotone_morango_brigadeiro_branco_chocolate`, R$18,99.

Todos são **porções individuais**, variante técnica `porcao`, sem personalização. Fotos enviadas pela loja, convertidas em WebP sem recriação de produto.

## Experiência
- Início: faixa premium natalina compacta antes dos quatro cartões habituais. O Natal não substitui categoria nem altera preço/estoque dos itens antigos.
- Coleção: quatro cartões com fotos, nomes e preços, ajuste `- número +` no próprio sabor de 0 a 99, CTA para o carrinho único.
- Backend/canal: WhatsApp-only; a função `create-whatsapp-order` versão 36 deriva da v35 publicada e mantém o suporte de refrigerantes já existente (itens ocultos). SQL migration aplicada e cinco linhas inseridas **hidden**.
- Admin: Configurações gerais → categoria Natal; aba Natal → Disponível/Esgotado/Oculto por sabor.

## Evidências
- [Actions 43004281550](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/43004281550) SUCCESS e QA WebKit 5 larguras.
- Suíte comercial 829/829, testes do catálogo 5/5; backend coteja centavos, rejeita variante forjada e valida estado remoto.
- ZIP Cloudflare: `Luciane-Oliveira-Doces-Colecao-Natal-2026-Cloudflare.zip`; **7.762.750 bytes**, **92 arquivos**, **SHA256 `5e19ea55f07e8194d81ecba627a6e2c67f8763105f019e641baf3ad2475f4fec`**.
- Todas as entradas da base compilada foram preservadas byte-a-byte e 8 fotos WebP adicionadas ao ZIP. **Esses binários estão no pacote entregue ao usuário, não no GitHub; não compilar um ZIP novo sem readicioná-los.**

## Ativação manual na ordem certa
1. Confirmar backup/restauração do deployment atual e aguardar clientes finalizarem.
2. Fazer upload manual do ZIP no Cloudflare Pages (o código NÃO foi publicado automaticamente).
3. Conferir a home (quatro categorias intactas, ribbons da coleção), imagens, preços, quantidades em iPhone Safari/Instagram e /admin.
4. Na aba `/admin`, liberar categoria `Edição Especial de Natal` nas configurações gerais e cada um dos quatro sabores como Disponível. A coleção e sabores foram deixados hidden por segurança.
5. Homologar pedido de teste com chocotones+outros doces, taxa de entrega/retirada, mensagem WhatsApp e comanda na cozinha. Não marcar pagamento/entrega como concluídos só por existir pedido.
6. Encerrar Natal ocultando `category_natal`, sem apagar histórico. Se houver regressão, ocultar categoria e restaurar frontend anterior; manter backend compatível.

## Sem alterações
Não mudar itens de refrigerantes, taxas, produtos antigos, Métodos de pagamento, CRM/Meta/Tintim, login/admin, impressora de forma específica, `orders_open`, ou Gestão. Nenhum deploy Cloudflare, pagamento, mensagem ou pedido real foi disparado nesta entrega.
