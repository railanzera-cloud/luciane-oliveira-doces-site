# Diagnóstico POS-58 e QZ Tray — 31/10/2026

Consulta somente leitura ao Supabase comercial edqiwvccmboyayojvuea: **21 print_jobs iniciais** no dia 31/10, **21 estados printed**, nenhum last_error. **8 demoraram mais de 30 segundos** até a reivindicação pela aba da cozinha; o pedido #1463 levou **795 segundos (9h34 até 9h47)** e o #1482 **55 segundos**. O atraso se concentra antes de o navegador/QZ pegar o trabalho. São 15 worker IDs diferentes para 21 jobs: consistente com novas sessões/reload, não comprova a causa. Todos os estados printed significam resposta bem-sucedida do QZ, não garantia de papel físico.

### Evidência visual
O print do painel foi feito no iPhone. Automático: Ligado é estado remoto; Impressora: Não conectada é **estado local deste dispositivo**. O QZ Tray precisa estar executando no notebook Windows, então o status do iPhone isoladamente não diagnostica o notebook.

### Ações simples no Windows antes de avançar
1. Confirmar POS-58 selecionada e impressão de página de teste pela fila do Windows; retirar documentos presos, conferir papel, cabo USB e impressora offline. Se a própria página de teste falha, não é o site.
2. Abrir o QZ Tray (ícone ao lado do relógio). No Chrome do **mesmo notebook** acessar /admin → Pedidos, clicar Conectar impressão 58 mm e verificar nome da impressora. Evitar permissões anônimas; certificado assinado já está configurado.
3. Deixar notebook na tomada, sem suspensão/hibernação, Chrome com aba Pedidos visível. A opção Manter tela ativa do painel é Wake Lock do browser; não substitui ajustes do Windows. Evitar tampa fechada sem configurar energia/ventilação.
4. Conferir economia de memória do Chrome e eventual proteção de segurança local/antivírus que bloqueie conexões a localhost; QZ Tray usa WebSocket local.
5. Em caso de comanda não sair, conferir no Windows se foi enviada; não criar reimpressão automática. Usar reimpressão manual somente depois de constatar a ausência de papel e confirmar duplicidade possível.
6. Se persistir, coletar logs QZ Tray e Spooler, hora/número do pedido, e print do estado **no notebook Windows** (não do celular).

### Correção no frontend em branch separada
- Botão de reimprimir estava oculto para pedidos WhatsApp, embora o backend admin_create_reprint exista. Agora está disponível a pedidos elegíveis, com verificação prévia de impressão inicial (status printed), sessão local QZ ativa e confirmação de risco de duplicidade.
- Clarifica que Impressora neste dispositivo não é estado remoto do notebook Windows e que Automático Ligado não significa papel físico.
- Não altera impressão automática, estoque, Meta, pagamentos, SQL, USB, driver nem estado de produção. **Branch não publicada.** Antes de publicar, conferir outras linhas recentes CRM e a versão live do Cloudflare.

Base de código: feature/pre-reserva-chocolate-morango-31102026 @ c803cf95713dcc544318b7b23bf970e5bebec1ca.
