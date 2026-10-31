# Pré-reserva Chocolate com Morango — sábado 31/10/2026, previsão 12h

## Pedido e identidade
Somente o produto **Chocolate com Morango**, id catalogado \`fatia-chocolate-morango\`, chave \`slice_chocolate_morango\`, preço R$22. Não alterar Prestígio, outros bolos ou pipocas. Loja de Paragominas (America/Belem). Previsão confirmada pelo gestor: **31/10/2026, 12:00**.

## Problema da implementação antiga
O lote único carregava \`reserved_units=9\` e alocações de 25/10; a interface e o SQL ainda exibiam 17h/25/10 ou 'mais 3 bolos'. Reutilizar esse lote sem versão faria cancelamentos antigos consumirem ou devolverem unidades do lote novo. A pré-reserva deve continuar idempotente e a aceitação/ impressão não confirmar pagamento.

## Alterações no código
- Nova geração UUID por lote (batch_id), criada ao preparar nova produção; alocações novas vinculadas ao UUID; cancelamentos históricos só alteram estoque do seu próprio lote.
- Previsão na vitrine e no WhatsApp lida da RPC \`public_slice_preorder\` com fuso \`America/Belem\`, sem texto fixo e sem prometer três bolos.
- Notes SQL do pedido formatadas pela mesma previsão; preserve metadata, histórico e WhatsApp.
- Novas alocações podem aceitar o pedido \`new → confirmed\` e disparar um job \`initial:\` único; pagamentos não são alterados.
- Integração do CRM da branch base \`feature/crm-fatia-rascunhos-personalizados-20261026\` preservada.

## Status da ativação
- A primeira migração isolou o lote de 31/10; a migração operacional seguinte configurou **24 fatias (3 bolos × 8)**, com \`enabled=false\` até a publicação do frontend. As reservas históricas ficaram isoladas. 
- Para ativar transacionalmente: **somente após** publicação comprovada do frontend correto, confirmar a capacidade configurada (24 unidades), ativar o lote e colocar \`menu_availability.slice_chocolate_morango\` em \`sold_out\` para o modo de pré-reserva. A loja em geral deve continuar com o estado operacional preexistente.
- Previsão: \`ready_at='2026-10-31 12:00:00-03'\`; vencimento \`expires_at='2026-10-31 23:59:00-03'\`. Quando o estoque se esgotar, desativar em conjunto sob orientação.
- Homologação obrigatória: validar status \`public_slice_preorder.active\`, quantidade e texto 12h, pedido real novo recebendo reserva com batch_id atual, estado confirmed e job initial único, Pix pending até comprovante. Não criar pedido fake em produção.
- Não publicar automaticamente no Cloudflare nem fazer merge em main.

Este arquivo é um checkpoint técnico; instruções posteriores do gestor podem definir quantidade e alterações de UI.
