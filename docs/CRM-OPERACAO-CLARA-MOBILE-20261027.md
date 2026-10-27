# CRM comercial | Operação clara no iPhone
Data: 27/10/2026. Base: feature/crm-motor-automacao-observavel-20261027 @ bdb9c93d2a64fa8f474eea6980857ff1c8e20303.
Branch: feature/crm-mobile-operacao-clara-20261027. Supabase exclusivo: edqiwvccmboyayojvuea.

## Evidência real
Em prints de Safari iOS 10h33/10h34, painel Clientes mostrou 5 pendentes = 5 vencidos = 5 bloqueados, auditoria 10h30, zero programados, 55 contatos em Acompanhar. Banco confirmou. Fotos revelaram navegação administrativa de 2 linhas sticky encobrindo atendimentos durante rolagem, detalhes técnicos de bloqueio extensos e repetição de indicadores. Exemplo Prestígio: menção real 27/10, sinal do cadastro Tintim 25/10, não confundir horário de etapa com horário de mensagem.

## Refinamentos entregues
- Somente `app/globals.css`, @media até 700px: abas admin deixam de ser sticky; header compacto; preserva desktop e vitrine/checkout.
- Diagnóstico do motor e motivos individuais de bloqueio são <details> com teclado, preservando todos os motivos sem poluição visual.
- Removidos três indicadores duplicados; permanecem números do motor e navegação.
- Acompanhar e Triagem mostram 15 por vez e "Mostrar mais" em lotes de 15; UI apenas, consulta RPC completa preservada. Contatos Tintim paginados localmente.
- Auto-refresh não esconde os cartões a cada minuto. Botão Atualizar indica refresh.
- Texto "Cadastro/etapa Tintim atualizada" reflete a origem de sinal, não prova última mensagem.
- Nenhum dado do cliente perdido, nenhum lote de WhatsApp enviado, sem migrar Supabase, tocar QZ Tray, Mercado Pago, pedidos, Pixel, CAPI ou catálogo.

## Homologação após publicação manual
Testar Safari iPhone: rolar em Acompanhar não mantém abas grandes por cima; diagnósticos fechados até abrir; mostrar mais 15; buscar reseta paginação; atualização automática mantém cards; Pedidos, Disponibilidade e Resultados seguem acessíveis. Exibir indicadores e estado real não comprova envio Meta. automatic_sends_enabled=false e pg_cron 5 min somente observa. CI deve validar full build/typecheck/testes/ZIP.
