# LUCIANE OLIVEIRA DOCES — CRM de acompanhamento assistido (26/10/2026)

## Identidade, isolamento e versão
Projeto comercial somente: railanzera-cloud/luciane-oliveira-doces-site.
Branch de intervenção: feature/crm-followups-assistidos-20261026.
Base remota: ops/chocolate-morango-pre-reserva-pausada-20261026 @ 22cb12358548ac8f17d6bb445d2508d605b214ce.
A base inclui o código validado no CI 7b3407c484d48ac5aa066f52960747934ef304f6. A modificação de 26/10 foi documental.
Outras branches de Mercado Pago e impressão Windows têm histórico divergente; nenhuma dessas áreas foi alterada aqui.
**O commit do Cloudflare ativo NÃO foi aferido. Não publicar automaticamente.**
**Não aplicar migration sem backup e confirmação de acesso autorizado da operadora.**

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

## Ativação segura
1. Tirar backup/snapshot verificado do Supabase edqiwvccmboyayojvuea.
2. Confirmar UUID real da Luciane em auth.users e autenticação no painel; não expor no GitHub.
3. Aplicar migration 20261026203000_crm_followups_assistidos.sql após revisão.
4. Provisionar somente a identidade confirmada com SQL privilegiado:
   INSERT INTO public.crm_staff_access(user_id) VALUES ('UUID-REAL-CONFIRMADO');
   Nunca usar UUID de exemplo nem liberar a todos autenticados.
5. Testar acesso negado a anon e usuários fora da ACL, permitido somente a staff.
6. Testar em ambiente isolado com contatos sintéticos, não com pedidos reais:
   importação idempotente, telefone, consentimento, opt-out,
   um follow-up pendente por oportunidade, cancelamento/resposta, compra manual.
7. Validar no Safari/iPhone e notebook; comparar registro real e ações autorizadas.

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
