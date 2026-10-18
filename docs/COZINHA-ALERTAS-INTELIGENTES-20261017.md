# Modo Cozinha — avisos curtos para pedidos e exceções para falhas (17/10/2026)

## Referência visual e diagnóstico
- Gravação enviada pelo cliente em 17/10/2026 (painel iPhone): `Pedidos → Modo Cozinha` mostra 4 pedidos antigos requerendo "Reconhecer aviso e parar som". A operação já aceita e imprime automaticamente novos pedidos de WhatsApp; não faz sentido exigir cliques para silenciar pedidos normais.
- Branch-base: `work/etiqueta-premium-confirmacao-pedido-20261017`, commit `b838fc774d29b92fad00a55a46492eadf35f3ff5`.
- Branch desta mudança: `work/cozinha-alertas-inteligentes-20261017`.

## Nova lógica — pedidos normais
- Apenas pedidos **novos desde a última leitura** geram notificação. Ao abrir/recarregar o painel, os pedidos carregados inicialmente viram a linha de base. Pedidos já conhecidos ou com status alterado não reiniciam a contagem.
- Um lote novo toca uma vez na detecção e novamente **5 segundos depois**; depois silencia automaticamente. Novos eventos no mesmo intervalo de 10 segundos são agrupados, sem multiplicar sons. O banner de chegada desaparece automaticamente após 12 segundos.
- Deduplicação em memória e `localStorage` dos IDs notificados. Janela máxima de 15 minutos para evitar soar pedidos muito antigos após interrupção.
- Aviso sonoro é independente da impressão: nenhuma confirmação de recebimento no painel é exigida e o usuário não precisa clicar para a comanda sair. O botão de reconhecimento foi removido.
- Mantidos Ativar/Testar som, Pausar som e volume Alto/Normal; a ativação inicial do áudio ainda exige um gesto por política do navegador.

## Exceções — impressão
- Consulta read-only ao `public.print_jobs` com autenticação já existente (RLS de `authenticated`). **Nenhuma migration, alteração de pagamento, alteração de status ou reimpressão automática nova.**
- Quando há job `failed` após o corte válido da fila e dentro de 6h, o painel apresenta alerta visual destacado e tom distinto a cada **30 segundos**, até o estado do trabalho ser resolvido.
- Quando há job `pending` / `printing` de pedido ativo e elegível aguardando mais de 2 minutos, mostra aviso de comanda atrasada, mencionando impressora, QZ e possível estoque. Não acusa a impressora de defeito físico sem evidência.
- Não emite alerta para trabalhos impressos, pendências recém-criadas, pedidos cancelados/históricos, fila explicitamente pausada ou jobs anteriores ao corte da fila. Falhas e atrasos são conciliados por leitura a cada 20 segundos; quando o job deixa de ter problema, o aviso some automaticamente.
- Botão "Silenciar alerta por 5 minutos" pausa somente o som de falha; o aviso visual fica visível. Não modifica status do pedido, fila, pagamento ou a comanda.
- O QZ Tray indicar sucesso na API não comprova papel efetivamente impresso. Problemas sem telemetria (papel, atolamento) podem não ser detectados pelo sistema.

## Interface
- Painel compacto com Automatico ligado/desligado, impressora conectada neste navegador, dois toques e silêncio, último lote de comandas enviadas ao QZ nesta sessão quando houver.
- Banner normal efêmero sem botão de confirmação. Banner de erro separado em cor de atenção, persistente enquanto problema existir.
- Estilo responsivo mobile sem repintar vitrine, etiquetas ou resultados.

## Escopo, segurança, testes
- Não altera a automação de aceite e impressão WhatsApp, certificados QZ, layout premium ESC/POS, Supabase, Trufadas, catálogo, Mercado Pago, Meta, Tintim, histórico ou filtros de faturamento.
- GitHub Actions deve passar TypeScript, build, testes completos, testes de seleção/deduplicação/erro e ZIP Cloudflare com CRC.
- Não publicar automaticamente: homologar em notebook Windows com QZ Tray conectada. Primeiro conferir teste de som, depois um pedido legítimo em operação; verificar som finito e impressão sem confirmação manual.
- Verificar alerta de impressão com uma situação real autorizada (não gerar erro de produção indiscriminadamente). Evitar trocar impressora ou desconectar USB durante expediente.
- Se o Windows suspender, o Chrome bloquear áudio em segundo plano, QZ sair do ar ou o notebook for desligado, o som pode não tocar. Esta mudança não cria push remoto ou monitoramento físico.
