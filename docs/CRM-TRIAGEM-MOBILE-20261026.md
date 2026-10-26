# Checkpoint CRM — Triagem mais clara no iPhone (26/10/2026)

Projeto somente Luciane Oliveira Doces, repo railanzera-cloud/luciane-oliveira-doces-site, Supabase comercial edqiwvccmboyayojvuea, fuso America/Belem.
Origem auditada: feature/crm-followups-assistidos-20261026 @ 09e188d8f9b02d5253ea2e6d720af4f276477c23. Branch nova: feature/crm-triagem-mobile-20261026.
O usuario confirmou ter publicado o ZIP anterior. A gravacao de tela 26/10 15:46 local mostrou nova aba Clientes no iPhone com contatos carregados. O commit do Cloudflare ativo nao foi auditado externamente.

## Problema observado
Muitos contatos aparecem com cartoes muito altos; campos de interesse e consentimento ficam todos abertos. Varios registros sem nome de contato. A interface mostra "Novos", mas nao comprova que o cliente enviou mensagem recentemente ou que a Luciane respondeu. Sem busca, a operadora teria de percorrer muitos contatos.
Consulta em 26/10 após publicação: 45 clientes, 45 conversas, 1 follow-up pendente, zero eventos oficiais Meta; 45 contatos sem consentimento conhecido e sem opt-out. Naquele momento, 44 conversas estavam in_progress, uma waiting_customer. O numero de pedidos pode variar enquanto a loja opera.

## Solução sem migração
- Cartoes de contato recolhidos por padrao; mostrar detalhes quando necessario; vencidos abrem com maior evidencia.
- Busca no painel por nome, telefone, interesse confirmado ou origem.
- Aba "Triagem" em vez de "Novos" para evitar falsa urgencia ou inferir conversa ativa.
- Orientacao explicita: Tintim organiza contatos, mas nao comprova resposta; a atendente so deve usar "Ja respondi" depois de realmente responder.
- Acao renomeada para "Ja respondi · lembrar 45 min".
- Confirmacao antes de converter manualmente e antes de optar pelo bloqueio comercial, reduzindo cliques acidentais.
- Busca, expansão e micro-layout mobile isolados em components/admin-crm-panel.tsx e components/admin-crm-panel.css.
- Nenhum banco, pedidos, MP, PIX, cozinha, Tintim, CAPI, Meta Business, Cloudflare ou main alterado.
- Não foram inferidos produtos a partir de anuncios; mensagem continua apenas sugerida e condicionada a consentimento.

## Ainda nao implementado/ativado
- Monitoramento oficial WhatsApp inbound/eco outbound em conta real; a Edge Function existe no GitHub mas nao esta publicada/associada a WABA.
- Cancelamento automatico de follow-up por resposta em operacao real ainda não homologado.
- Envio automatico de mensagens continua desligado no banco. Nada envia com o painel fechado.
- Consentimento comercial precisa de evidência, nao pode ser presumido do clique no anuncio.
- Pedido no Supabase sem telefone ou vinculo exato pode escapar da deteccao de compra; ainda exige indicacao manual de "Comprou" quando aplicavel.
- Empreendimento Meta, numero e Coexistence devem ser avaliados; nenhuma alteracao de numero.
- Homologacao Safari fisico e pacote publicado exigem teste real após publicação de ZIP novo.
