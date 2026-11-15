# CRM — operação comercial prioritária (15/11/2026)

## Base e isolamento
- Repositório: railanzera-cloud/luciane-oliveira-doces-site.
- Branch: `feature/crm-operacao-comercial-priorizada-20261114`, PR draft #62.
- Base: `feat/paginas-lgpd-meta-20261114` (PR #61), que contém as páginas legais da Meta e o código comercial V4.7.14.1; não usar `main`.
- Supabase comercial exclusivamente `edqiwvccmboyayojvuea`. Projeto Luciane Gestão intocado.
- Não publicou Cloudflare, não criou ZIP nem enviou WhatsApp. Fotos do ZIP manual anterior não foram recuperadas/mescladas neste incremento.

## Problema observado
- Administrador mostrava 213 lembretes pendentes, 212 vencidos e somente 150 conversas na primeira listagem.
- O motor contava lembretes operacionais e o painel misturava contatos antigos, contatos bloqueados e oportunidades recentes.
- Os 644 clientes estavam em `consent_status=unknown`; nenhum lote foi convertido em `granted`.
- Não há prova de estoque físico ou de quantidade restante, apenas disponibilidade por status do catálogo.

## Entrega de código
- `components/admin-crm-panel.tsx`: visão comercial e recência de mensagem recebida nas últimas 48h; abas prioritárias, rótulos claros de próximo passo, dados técnicos recolhidos.
- `components/admin-crm-panel.css`: visual responsivo alinhado ao painel escuro, com alvos de toque e estados acessíveis.
- `lib/crm-operacao.ts`: comparação exata de produto confirmado com `menu_availability`; nomes ambíguos não recebem estoque inferido. Aviso de esgotamento impede preparo de contato **na interface**; a disponibilidade `available` não comprova quantidade.
- Lembretes antigos deixam de aparecer como dezenas de milhares de minutos de atraso e passam a pedir reavaliação.
- `crm_list_opportunities_page(p_offset,p_limit)`: leitura paginada de 250 registros por página, até 5000 na interface; limite/ordem definidos pelo servidor; fallback legado exibe aviso de leitura parcial.

## Banco aplicado
- Migration Supabase `20261115025757_crm_staff_paginated_opportunities_readonly`.
- Criada função aditiva, `STABLE SECURITY DEFINER`, com `crm_require_staff()`, `anon EXECUTE=false` e `authenticated EXECUTE=true` condicionado ao staff.
- Validação SQL read-only: páginas 250 + 250 + 159 = 659 conversas e 659 IDs únicos, cobrindo as 659 conversas no banco.
- Nenhuma outra função, tabela, consentimento, pedido, pagamento, estoque, cron, webhook ou flag de automação alterada.
- Após aplicação: `automatic_sends_enabled=false`, 0 tentativas de envio, 0 consentimentos marcados concedidos, 213 lembretes pendentes.

## Testes e limites
- Testes unitários para recência, catálogo esgotado/ambíguo, prazos legíveis e rascunhos sem escassez inventada.
- Teste CRM + typecheck isolado: GitHub Actions runs #43670393913 e #43670385323 **SUCCESS** no SHA `a3b687fd95f3fa67c7169d60f87eebac2ca6ede8`.
- Typecheck de todo o repositório, em primeira tentativa, encontrou problemas preexistentes em `components/admin-trufadas-stock.tsx`, `db/index.ts` e `worker/index.ts`, não atribuíveis ao CRM. Não modificar áreas não relacionadas neste PR.
- Validação de layout em Safari iPhone e no browser de Instagram, leitura real de RPC via PostgREST autenticado e compatibilização com ZIP Cloudflare ainda pendentes.
- Não comprovar envio real/compra/retorno financeiro com clique, anotação ou status da UI.
- Bloqueio de produto indisponível é por ora de interface; a autorização assistida transacional do servidor conserva os gates de consentimento, janela, compra e duplicidade. Não descrever o status do catálogo como controle de estoque físico ou garantia de envio.

## Próxima fase (não ativada)
1. Reconciliar versão de Cloudflare/ZIP e confirmar que o painel redesenhado usa a RPC paginada sob login da Luciane.
2. Validar a leitura de disponibilidade e os rascunhos de interesse com cliente próprio ou explicitamente autorizado; não inventar escassez.
3. Reavaliar regras dos lembretes de 45 min (e eventual 30 min por motivo, após dados reais), opt-in documentado e prova dos horários Meta/Tintim.
4. Homologar envio assistido e registrar envio **somente após envio manual real**; comprovar cancelamento após compra e resposta.
5. Separadamente, preparar transporte API com modelos e opt-in válidos, observando custo por mensagem, frequência, opt-out e compatibilidade de número/Tintim antes de qualquer ativação.
