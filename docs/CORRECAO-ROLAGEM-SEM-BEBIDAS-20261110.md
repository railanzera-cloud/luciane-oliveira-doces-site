# Hotfix de rolagem do recebimento, sem refrigerantes

10/11/2026 · Site comercial Luciane Oliveira Doces · PR #25 draft

## Problema e solução

O usuário reverteu dois deployments de refrigerantes. O botão flutuante "Entrega ou retirada" rolava até o topo de `#recebimento`, que contém confirmação e sugestões de outros doces antes das caixas reais. Isso deixava as opções abaixo do foco, especialmente no Safari/Instagram mobile.

A correção mantém:
- Adição de doce → `#recebimento` (confirmação + complementos).
- Botão flutuante, progresso e edição de recebimento → `#recebimento-opcoes` (título + caixas reais).
- Seleção de entrega/retirada → campos subsequentes, preservando dados escolhidos.
- Refrigerantes desligados via `STORE_CONFIG.enabledExtras.drinks=false`, sem novos cartões/fotos de bebidas no frontend.

## Base e segurança

Base PR #22 `9811b7cb2e4800ba25599e154b6c5871256f761a`; funcional compilado `bf83b5fcbc0aa6515331956a24ac6630dadd7812`. Foram sincronizados 29 assets aprovados de Fatias/Cones e o CSS de navegação do ZIP anterior, para não regredir imagens, sem reconfigurar produtos. A fotografia integral e o card de Coco Cremoso são arquivos diferentes e seus hashes são protegidos pelos testes.

Supabase comercial: WhatsApp v35 ACTIVE; `create-order` v14 mantida. Quatro bebidas passaram de `available` para `hidden`, reconfirmadas, por autorização para deixá-las fora de venda durante a pausa; sem tocar outras categorias. Abertura `orders_open=false` foi constatada numa consulta mas não alterada.

## Validação

GitHub Actions [42843218379](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/42843218379): SUCCESS.
- 824 testes comerciais aprovados e build.
- 8 cenários WebKit isolados: 320/375/390/430, Fatias disponíveis ou esgotadas.
- Verificação de posição do destino real, caixas legíveis e botão flutuante funcional.
- ZIP conectado validado; não é Safari/Instagram físico, não publica no Cloudflare.

## Entrega

`Luciane-Oliveira-Doces-Rolagem-Corrigida-SEM-Refrigerantes-20261110.zip`

- 89 arquivos.
- 7.307.662 bytes.
- SHA256: `cc2787ea666d4f8b1ed03ea52828f28e3f5bb00250e78f6cb27807a9e6a18ae2`.
- Perfil comercial conectado WhatsApp-only.
- Possui `index.html`, `admin/index.html`, `pedido/index.html`, `_worker.js`, `_routes.json`, `_headers`.
- Nenhuma imagem dos novos refrigerantes, nem secrets/env/SQL.

## Publicação manual segura

O ID do deployment Cloudflare publicado não pôde ser verificado pela conexão disponível; não presumir que o rollback visual seja exatamente o SHA da PR #22. Guardar deployment anterior, conferir se não há clientes finalizando, publicar o ZIP pelo painel e testar no iPhone Safari/Instagram, especialmente adicionar → complementar → CTA Entrega/Retirada → campos → WhatsApp. Se falhar, restaurar o deployment anterior; não reverter o Supabase v35 nem constraint de pedidos. Pedidos gerais devem ser abertos via painel da loja no horário operacional; o hotfix não muda `orders_open`.

Para futura implementação de bebidas, partir desta correção de UX, não publicar cegamente PR #23/#24.
