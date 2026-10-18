# Operação contínua Windows + QZ Tray — recuperação após suspensão

## Contexto
- Produto: painel comercial Luciane Oliveira Doces, não Luciane Gestão.
- Origem: `work/cozinha-alertas-inteligentes-20261017` / `7416e86ca14c1d295c5da90299a3458637280d9b`.
- Problema observado em 17/10/2026: notebook apaga a tela e entra em suspensão, QZ Tray perde a sessão. O botão POS-58 parecia processar eternamente por conta da consulta periódica à fila.
- Meta: reforçar disponibilidade em notebook Windows **sem comprar automação**, respeitando a impressora real e sem alterar pedidos, pagamentos, estoque ou regras de entrega.

## Melhorias no painel
- `Manter tela ativa durante a cozinha`: Wake Lock de navegador quando **Modo Cozinha** e impressora estão ativos, com opção de desligar e preferência local. Indica se a proteção foi liberada/bloqueada. Reassume após retorno da aba.
- Navegador/Windows **não** impedem necessariamente suspensão quando a tampa está fechada, bateria está baixa, Chrome está em segundo plano, usuário bloqueou o dispositivo ou energia caiu. Wake Lock somente na aba HTTPS visível. Configurar Windows é obrigatório para uso confiável.
- Reconexão: quando o modo automático está ativo, a impressora previamente conectada foi lembrada e a aba está visível, verifica o QZ Tray a cada 30 s e ao retornar ao foco. Se perdeu conexão, refaz o handshake assinado, com limite e retentativa a cada 60 s; mantém nome e status.
- `connectKitchenPrinter` centraliza tentativas concorrentes em uma única promise. A rotina de fila já implementada tenta reconectar antes de reivindicar novos trabalhos; conexões recuperadas não recriam trabalhos nem alteram pagamentos.
- O botão deixa de mostrar spinner a cada consulta de trabalhos: indica apenas a conexão em andamento e o estado real do QZ, mostrando a fila como atividade separada.
- Timeout máximo de 45 s para resposta de `qz.print`: se houver falha, registra job como `failed` pela RPC original e mantém o alerta de erro. **Como a impressora pode ter imprimido depois do timeout, conferir papel e histórico antes de reimprimir**, para evitar duplicação. Não existe reimpressão automática nova.
- Nenhuma alteração no banco (migrations/RPCs) nem no QZ Tray instalado; a seleção prévia da POS-58 é preservada.

## Configuração obrigatória do Windows (conectado à tomada)
1. Windows 11: Iniciar → Configurações → Sistema → Energia e bateria → Tela, suspensão e hibernação. Em **conectado à tomada**, definir `Colocar meu dispositivo em suspensão após: Nunca`. Para máxima estabilidade, `Desligar minha tela após: Nunca` durante o expediente.
2. Se costuma fechar a tampa: Painel de Controle → Hardware e Sons → Opções de Energia → Escolher a função do fechamento da tampa → **Ao fechar a tampa, conectado à tomada: Nada a fazer**. Recomendável manter tampa aberta, com ventilação. Não deixar notebook fechado dentro de bolsa ou em local quente.
3. Manter notebook conectado à energia, QZ Tray ativo (ícone perto do relógio), Chrome com `/admin` aberto na aba **Pedidos**, Windows sem hibernar.
4. Se o Chrome restringir tarefas em segundo plano, deixar aba Pedidos visível durante a produção e conferir Energy Saver/Memory Saver nas configurações do Chrome.
5. Se a impressora USB ainda desconectar durante o uso mesmo sem suspensão, verificar cabo/USB, economia de energia do hub USB e driver POS-58 com um técnico Windows — isso NÃO é resolvido pelo site sozinho.

## Teste controlado após publicar o ZIP
1. Atualizar página no Chrome com Ctrl + F5.
2. Confirmar que o painel reconhece `POS-58(copy of 1)` e mostra conectada.
3. Confirmar que modo automático está ligado (mantido no Supabase), alerta sonoro e `Manter tela ativa` ativos. O botão de impressora não deve piscar/girar a cada 12 segundos.
4. Durante o expediente, aguardar mais que o período antigo de suspensão; a tela deve permanecer ativa se Wake Lock e Windows permitirem. Validar com um pedido real autorizado, sem alterar o status de pagamento.
5. Opcionalmente, fora da operação, fechar/reabrir Chrome para conferir reconexão da impressora sem clique manual. A autorização segura de QZ Tray continua necessária; se aparecer Anonymous/Untrusted, resolver confiança do certificado, **não marcar permissão permanente anônima**.
6. Se a sessão não reconectar: observar texto no painel, ver se o QZ Tray ainda está ativo, verificar se há erro de conexão e se o Windows está suspenso.
7. Testar a retentativa automática somente sem pedidos críticos, para não arriscar impressões durante ensaio.

## Segurança de rollback
- Esta branch mantém Modo Cozinha, alertas inteligentes, layout premium ESC/POS, QZ assinado, Trufadas, Resultados e checkout atuais.
- Reverter o ZIP volta só o frontend; o estado do Supabase não se altera. Desligar modo no painel se quiser pausar autoaceitação.
- Publicação Cloudflare **não** é executada pela CI; gerar pacote e enviar ao operador após validação.
