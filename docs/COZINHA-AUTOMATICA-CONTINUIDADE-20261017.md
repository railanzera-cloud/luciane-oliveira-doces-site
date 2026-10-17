# Luciane Oliveira Doces — alerta e cozinha sem serviço pago (17/10/2026)

## Base e isolamento
- Base do frontend: `work/resultados-vendas-restaurados-trufadas-20261017` / `5ab4d506afe54d988b197bc85c0db24988b2a53e`.
- Escopo exclusivo do painel comercial `/admin`, QZ Tray existente e banco comercial Supabase `edqiwvccmboyayojvuea`. NÃO confundir com Luciane Gestão.
- Sem alterações ao catálogo, preços, estoque estrutural, Tintim, Mercado Pago, Meta, site do consumidor, pagamentos ou regras de lançamento.
- A instalação da migration é segura com `auto_mode_enabled=false` por padrão. **O modo de impressão antecipada só passa a funcionar após ativação explícita no painel pela operadora.**

## Alerta de cozinha no notebook
- Botão Ativar alertas/Testar som: liberação de `AudioContext` por gesto; padrão Alto com opção Normal.
- Quatro notas audíveis por ciclo, repetindo a cada 8 segundos **até reconhecer o aviso**. Faixa visual clara e botão de reconhecimento no topo da aba Pedidos.
- Detecta pedidos novos mesmo que o Realtime falhe: reconciliação silenciosa a cada 20 s; a detecção inclui pedidos sem confirmação financeira, exclui concluídos/cancelados e se limita a pedidos após a ativação do alerta (máximo de 8 horas).
- Marcados como reconhecidos persistem no navegador entre recarregamentos (localStorage); reconhecimento **não altera estado do pedido**, status de pagamento nem sua impressão.
- Nunca garante som quando o Windows está bloqueado/hibernando, quando o navegador suspende áudio, ou quando o painel está fechado. Manter aba aberta, volume do Windows ligado e notebook sem suspensão.

## Controle opcional de autoaceitação e impressão
- Flag remota em `kitchen_print_control.auto_mode_enabled`, com `auto_mode_started_at`; protegida por RPCs `admin_get_kitchen_auto_mode_v1` e `admin_set_kitchen_auto_mode_v1` (somente equipe autorizada). A flag é **desligada por padrão**, independente do controle geral da fila.
- Ao habilitar (necessita QZ conectado na própria sessão), novos pedidos *WhatsApp* elegíveis gerados **depois da ativação** transitam de `new` para `confirmed` por trigger, com histórico `source='system'`; `payment_status` e `paid_at` não são alterados. Não há ação sobre pedidos antigos, do site online, cancelados ou histórico financeiro.
- Geração da comanda inicial conserva deduplicação atual `initial:<order_id>`, corte temporal da fila, trava transacional `claim_print_job` e verificação `lod_crocante_print_allocation_ready`.
- Quando habilitado, permite impressão de WhatsApp `manual_pix` ainda com `payment_status='pending'` e dinheiro/cartão na entrega. A comanda identifica explicitamente `PIX PENDENTE - CONFERIR` e demais formas pendentes. Pagamentos Mercado Pago continuam exigindo aprovação real.
- **Estoque das Trufadas:** transição para `confirmed` mantém trigger de estoque original. Dinheiro/cartão na entrega podem confirmar o compromisso de estoque ao aceitar; Pix manual permanece pendente até pagamento. Comandas com alocação incompleta não passam pela elegibilidade original.
- Controle separado **Pausar impressão / Reativar impressão** usa a RPC existente `admin_set_kitchen_print_enabled`. Pausar a fila desliga o disparo de todas as comandas; ao reativar ela redefine o corte para impedir envio retroativo de pedidos criados durante a pausa.
- Se QZ Tray perder conexão, a rotina tenta restabelecer conexão **antes** de reivindicar novo job, sem duplicar impressão. O operador continua precisando do navegador/QZ/USB ativos.
- Reconhecer alerta não aciona impressão, e imprimir não marca pagamento confirmado ou entrega concluída.

## Segurança, rollback e testes
- Novo trigger somente de `AFTER INSERT`; a função original de fila permanece e a elegibilidade é ampliada só sob o opt-in, não desabilita verificações existentes.
- Para rollback operacional instantâneo, clicar **Desligar automático** e/ou **Pausar impressão**. Não apagar trabalhos pendentes, não alterar enum ou pagamentos.
- Sem publicação automática do Cloudflare, sem acionamento da fila ou testes geradores de pedidos reais. Pós-upload, validar em notebook da Luciane um pedido *real autorizado* primeiro, com impressora de teste conectada, conferindo pagamento pendente e cancelamento; acompanhar o histórico/sem impressão duplicada.
- Passos no Windows: deixar notebook ligado sem suspensão; abrir /admin → Pedidos; clicar Ativar alertas e ouvir o toque; conectar impressora 58 mm/QZ Tray; conferir Fila ligada; habilitar modo automático; testar pedido real; reconhecer toque; verificar estado e comanda. Se a impressão não for desejada, pausar fila **antes** de testes de pedido.
- Recomendável conferir volume em alto-falantes reais da cozinha antes do uso, sem prometer volume físico que exceda o volume do computador.
