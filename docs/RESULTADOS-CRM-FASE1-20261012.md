# Resultados / mini-CRM — Fase 1 (12/10/2026)

Objetivo: usar os pedidos que já entram no Supabase para apoiar gestão e Meta Ads,
sem confundir atendimento, pagamento e rastreamento de anúncios.

## Implementado
- Banco Supabase comercial: migration `20261012230000_admin_results_overview.sql`,
  função read-only `admin_get_results_overview(p_days)`, filtro de 7/30/90 dias, sem dados pessoais.
- Autorização: reutiliza `lod_require_authenticated_staff` (mesmo modelo atual do painel);
  `anon` não pode executar a RPC. Não concede acesso extra aos pedidos.
- UI: nova aba **Resultados** ao lado de Pedidos e Disponibilidade.
- Medidas: pedidos cadastrados, quantidade/valor com pagamento registrado como pago,
  quantidade/valor pendente, cancelados e cancelados com pagamento marcado.
- Origem: conversa Tintim vinculada, campanha próxima ao pedido e campanha histórica,
  sempre usando `tintim_order_tracking_snapshots` — um snapshot por pedido.
- Campanhas: por nome, ID e tipo de evidência; cada pedido entra uma única vez no grupo.
- Origem da visita: parâmetros da visita que gerou o pedido, não inferidos do Tintim.
- Canais: identificadores técnicos `site` e `whatsapp`; não devem ser confundidos
  com método de entrega ou prova de venda gerada pelo canal.
- Dados de teste são contabilizados enquanto constarem do banco.
- Período é baseado na CRIAÇÃO do pedido. A situação do pagamento é a situação
  atual dos pedidos criados no período, não recebimentos ocorridos naquele intervalo.

## O que o relatório não faz
- Não adiciona pagamentos, não confirma Pix, não executa follow-up e não envia Purchase.
- Não é ROAS, lucro, conciliação bancária, nem incrementabilidade de mídia;
  falta gasto por campanha e há possíveis vendas fora do Supabase.
- Não recupera cliques anteriores não registrados no site.
- Não atribui duas campanhas ao mesmo pedido, nem conta pedido pendente como receita.

## Segurança e dependências
- A função de autenticação existente `lod_require_authenticated_staff` verifica a
  conta autenticada mas ainda não há allowlist explícita de equipe no projeto.
  Planejar fortalecimento da autorização com acesso confirmado da Luciane antes
  de ativar cadastros públicos de usuários. Esta etapa preserva a configuração existente.
- A RPC retorna somente agregados; não fornece nome, telefone, corpo de mensagem,
  endereço, token ou identificador de cliente.
- Manter webhook Tintim, CAPI e fluxos de pedidos sem alterações.

## Próxima evolução — somente após homologação
1. Testar no Safari do iPhone os filtros 7/30/90 dias e totais contra o painel.
2. Confirmar com a Luciane quais pedidos são testes e cancelar os pendentes
   de teste, sem acionar o Purchase; não excluir histórico sem política definida.
3. Identificar despesas com Meta Ads por campanha (dados oficiais) e condições
   de cobertura antes de apresentar ROAS.
4. Definir fluxo de pós-venda/follow-up com consentimento, prazo e revisão humana,
   sem disparos ou alterações de status automáticos prematuros.
