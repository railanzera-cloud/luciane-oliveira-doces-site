# LUCIANE OLIVEIRA DOCES — CRM de acompanhamento assistido (26/10/2026)

## Identidade, isolamento e versão
Projeto comercial somente: railanzera-cloud/luciane-oliveira-doces-site.
Branch de intervenção: feature/crm-followups-assistidos-20261026.
Base remota: ops/chocolate-morango-pre-reserva-pausada-20261026 @ 22cb12358548ac8f17d6bb445d2508d605b214ce.
A base inclui o código validado no CI 7b3407c484d48ac5aa066f52960747934ef304f6. A modificação de 26/10 foi documental.
Outras branches de Mercado Pago e impressão Windows têm histórico divergente; nenhuma dessas áreas foi alterada aqui.
**O commit do Cloudflare ativo NÃO foi aferido. Não publicar automaticamente.**
**Migração aditiva aplicada no Supabase comercial em 26/10/2026 após validação SQL reversível.** Não modificar o banco novamente sem revisão.

## Escopo da fase A0/B inicial
- Nova aba Clientes no painel /admin; Pedidos, Disponibilidade e Resultados continuam intactos.
- Importação pontual de contatos rastreados pelo Tintim ou cadastro manual, sem disparos.
- CRM independente de Tintim: crm_customers, crm_conversations, crm_follow_ups, crm_events.
- Consentimento com evidência; opt-out por telefone e cancelamento de lembretes.
- Lembrete de 45 min após a atendente confirmar que a conversa aguarda o cliente.
- Fila de lembretes vencidos com texto adaptado ao produto confirmado, sem supor disponibilidade.
- WhatsApp aberto por wa.me (sem API, sem prova de envio); atendente pode marcar enviado.
- Ações respondeu, comprou, adiar, encerrar. Compra manual não cria pedido, pagamento ou Purchase.
- Controle de acesso próprio crm_staff_access fechado até provisionar UUID autorizado.

## O que foi efetivamente aplicado no banco (26/10)
- Migração crm_followups_assistidos_20261026 retornou sucesso.
- 5 tabelas CRM novas com RLS; nenhuma tabela existente de pedidos/pagamento/estoque foi modificada.
- As duas identidades preexistentes de autenticação do painel foram incluídas na ACL do novo CRM.
- Um usuário sem vínculo com a ACL foi negado na consulta protegida.
- Testes reais em transação ROLLBACK: abertura de contato sintético, consentimento, espera, cancelamento por resposta, opt-out e bloqueio de novo agendamento. Sem dados de teste persistidos.
- Conferência pós-teste: 0 customers, 0 follow_ups e 0 crm_events; equipe autorizada 2 e RLS 5/5.
- **Cloudflare NÃO foi publicado**. A aba Clientes só aparece no site quando houver publicação explicitamente validada do pacote de mesmo commit.
- Nenhum WhatsApp enviado, nenhuma configuração WABA alterada, nenhum token da Meta.
- Rollback de dados existente não é necessário porque migração aditiva, sem alterações em pedidos; não apagar tabelas caso tenham registros comerciais futuros.

## Homologação e ativação pendentes
1. Conferir no Safari/iPhone e notebook as 4 abas, incluindo as mensagens do CRM.
2. Comparar contato rastreado do Tintim com o mesmo registro de CRM, sem disparar mensagem real.
3. Validar registro manual de interesse/consentimento em piloto restrito e autorizado.
4. Verificar deployment ativo Cloudflare antes de decidir pela publicação.
5. Conferir Meta Business Verification, número e Coexistence; sem envio automático até homologar eventos e custos.
6. Antes de qualquer envio, confirmar consentimento real; mensagens antigas do Tintim não provam permissão.

## Limites atuais
- Dos vínculos Tintim/pedido consultados, 97 eram candidatos e zero confirmados.
- O telefone estava preenchido em somente 4 dos 426 pedidos.
- O webhook Tintim persiste apenas subconjunto das mensagens recebidas com referência de pedido.
- Não há worker de envio, push, pg_cron nem Meta API.
- Consentimento desconhecido bloqueia abertura de mensagem comercial sugerida.
- Dados antigos de Tintim não comprovam opt-in.
- A aba não detecta automaticamente respostas no aplicativo ou vendas fora do site.
- Abrir wa.me não é confirmar envio, entrega nem conversão financeira.

## Próximas fases
A1: após verificar WABA, business verification, número e Coexistence, homologar webhooks inbound/outbound; verificar assinatura, dedupe e retenção mínima.
B: atualizar last_inbound/last_outbound com eventos oficiais e cancela por resposta comprovada.
C: worker de envios com bloqueio por compra, reply, opt-out, consentimento, janela 24h/template, limites de custo e idempotência com resultado incerto.
D: medir recuperação apenas com vinculação de pedidos e receita comprovada.
E: avaliar IA/Business Agent após dados suficientes.

Nenhum segredo da Meta ou token de cliente deve entrar no GitHub nem no bundle.
