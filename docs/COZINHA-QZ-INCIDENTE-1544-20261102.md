# Incidente de impressão — pedido #1544 — 02/11/2026

## Projeto e autorização
- Site comercial Luciane Oliveira Doces: `railanzera-cloud/luciane-oliveira-doces-site`, Supabase **exclusivamente comercial** `edqiwvccmboyayojvuea`.
- Branch isolada: `fix/cozinha-qz-pedido1544-diagnostico-20261102`.
- Origem validada: `work/admin-disponibilidade-premium-20261102` SHA `521299b9dfb5721b9a907fe219d527e967d97942`; integra a UX de Trufadas.
- Escopo: QZ Tray/POS-58 do notebook Windows, saúde da fila e diagnóstico. Não altera checkout, vendas, pagamento, RLS, migracões ou Luciane Gestão.

## Evidência do banco comercial — consultas somente leitura
- Pedido **#1544**, registrado em **02/11/2026 13:30:57 (America/Belem)**, canal WhatsApp, situação operacional `confirmed`, Pix manual `pending`.
- Primeira consulta às 13h35: `print_jobs(initial)` em `pending`, `attempts=0`, sem `claimed_at` ou `printed_at`.
- `kitchen_print_control.enabled=true`, `auto_mode_enabled=true`; `lod_kitchen_print_eligible(order)=true`, sem impedimento por corte temporal.
- Logs do Supabase indicam POSTs `/functions/v1/qz-sign` respondidos HTTP 200 ao Chrome/Windows entre **13h31 e 13h38**. **Conclusão limitada**: a assinatura remota respondia, mas sem prova do handshake local com QZ ou driver.
- Nova leitura: `claimed_at=13:40:43`, `printed_at=13:40:45`, `attempts=1`, `status=printed`, erro vazio. **Enviado ao QZ**, não comprova papel físico.
- A comanda anterior mais recente registrada como enviada ao QZ foi em 01/11 às 19h05. Não se constatou falha do servidor de pedidos.
- Existem `print_jobs` pendentes históricos, mas a RPC `claim_print_job` filtra por estado de pedido, elegibilidade e marco de implantação. Não limpar ou reimprimir antigos no atacado.

## Resolução imediata sem alteração no banco
1. Conferir se a comanda **#1544** apareceu no papel. Se sim, NÃO usar Reimprimir.
2. Se não apareceu, no Windows conferir papel, USB, fila e página de teste da POS-58; verificar se QZ Tray está aberto perto do relógio.
3. No Chrome do **mesmo notebook**: `/admin` → **Pedidos** → **Conectar impressão 58 mm**; permitir solicitação de acesso a aplicativos locais do Chrome somente para o site conhecido.
4. Conferir o nome da POS-58; se o QZ tiver enumerado impressoras e não reconhecer o nome salvo, escolher a correta explicitamente.
5. Testar saída física antes de tentar reimprimir. O status `printed` só confirma êxito reportado pelo QZ; nova impressão pode gerar duplicidade.
6. Se o Windows nem imprimir a página de teste, revisar driver, impressora offline, spooler, cabo e papel no equipamento físico. A conexão cloud não controla esses itens.
7. Evitar suspensão/hibernação do notebook, Chrome com aba Pedidos aberta, QZ Tray em execução. Wake Lock do navegador não substitui energia do Windows.

## Correção preventiva implementada em código
- O cliente QZ agora enumera as impressoras que **de fato estão instaladas**, antes de reutilizar o nome salvo.
- Se o nome mudou e existe **exatamente uma** POS-58 identificável, a seleção é recuperada sem inventar impressora.
- Se houver ambiguidade, o painel exige escolha manual entre as impressoras retornadas pelo próprio QZ. Não envia automaticamente para PDF/XPS/Fax/OneNote.
- Diagnóstico local explica falhas de autorização/local network, USB/driver e como retomar uma comanda pendente sem alterar pagamento.
- O texto da fila distingue processamento, alerta e espera; não afirma que uma comanda saiu em papel sem evidência.
- Mantidos QZ com certificado assinado, RPC claim/complete/fail idempotente, prevenção contra reimpressão duplicada, som de pedido e som separado de falha.

## Portões de entrega
- Suíte completa, build, TypeScript e pacote Cloudflare de mesmo SHA. Testes da seleção da impressora em `tests/qz-printer-recovery-20261102.test.mjs`.
- Não é possível executar handshake real de QZ/USB a partir da nuvem: teste com o notebook Windows e POS-58 físicos continua necessário.
- Não publicar nem mesclar sem autorização explícita e checagem da versão ativa Cloudflare; correção posterior **não causou** a recuperação observada às 13h40, pois não estava publicada.
