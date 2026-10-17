# QZ Tray — conexão local sem carregamento infinito (17/10/2026)

## Sintoma reproduzido pelo relato
No Windows da Luciane, o som do Modo Cozinha funciona, mas **Conectar impressão 58 mm** gira indefinidamente, sem erro. A impressão 58 mm está instalada no Windows e o QZ Tray aparece ativo. Os logs da Edge Function qz-sign no horário da tentativa (aprox. 20h28–20h31, America/Belem, ou 23h28–23h31 UTC) não mostraram chamadas, **indício** de bloqueio local antes da assinatura; não é diagnóstico conclusivo.

## Correção incremental
- Base exata: `work/cozinha-alerta-modo-automatico-20261017`, commit `b28692fe5b9530d2b3dddaf9d63ff32fd584e8a8`.
- Timeout por etapa: importar módulo (12 s), QZ WebSocket no Windows (20 s), localizar impressora salva ou padrão do Windows (15 s), requisitar certificado/assinatura (12 s + leitura 8 s). Erro localizado e mensagem visível; permite nova tentativa.
- Progresso na tela: **Carregando módulo da impressora**, **Conectando ao QZ Tray no notebook**, **Consultando a impressora do Windows**. O próprio carregamento não deixa mais o botão permanentemente bloqueado.
- Ao conectar, libera o estado **Impressora identificada**. A fila já existente roda separadamente; não prende a interface aguardando `claim_print_job`.
- O polling silencioso a cada 20 s deixa de apagar erros de conexão, para a Luciane conseguir fotografar o diagnóstico.
- Usa a API oficial existente do QZ (`qz.websocket.connect`, `qz.printers.find`, `qz.printers.getDefault`) e o mesmo certificado/assinatura do Supabase. Não altera os segredos ou backend.
- Não modifica: QZ Tray instalado no Windows, API Supabase, migration, pedidos, pagamentos, CRM, cardápio, Trufadas, estoque, 7/30/90/intervalos, impressão, alerta sonoro ou operação automática.
- A pausa/desligamento automático permanece disponível; **não ativar o modo automático nem lançar pedido de teste antes da conexão real e verificação do nome da impressora**.

## Checkpoint e validação
- Testes automáticos adicionados para deadline, sucesso/erro e rastreio da etapa de conexão, além da suíte existente.
- GitHub Actions gera ZIP Cloudflare sem publicar.
- Após publicar o novo pacote: entrar em `/admin` no Windows → Pedidos → Conectar impressão 58 mm. Fotografar a etapa/erro caso ocorra depois do tempo limite. Conferir o **nome exato** da impressora antes de habilitar impressões automáticas.
- Se aparecer erro de WebSocket/QZ: confirmar QZ Tray aberto na bandeja do Windows, encerrar e reabrir QZ Tray, verificar bloqueio de conexão local do Chrome e possíveis janelas do QZ Tray atrás do navegador. Acesso às portas WebSocket locais e certificado podem exigir suporte específico do Windows.
- Se aparecer erro de impressora: conferir no QZ Tray/Windows a impressora instalada e padrão. Não selecionar outra impressora por tentativa sem verificação.
- Ainda falta homologação real no notebook Windows (a CI não testa o aplicativo QZ nem a impressora USB).
