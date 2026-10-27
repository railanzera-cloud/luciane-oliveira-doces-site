# Rascunhos por sabor e origem do anúncio — CRM Luciane Oliveira Doces

**Branch** `feature/crm-fatia-rascunhos-personalizados-20261026`, base integrada `feature/crm-followup-preflight-20261026` `8aa47ea0c4e03f0b66960a6c0cae1f3b69630de2`.
Somente projeto comercial `railanzera-cloud/luciane-oliveira-doces-site`. Não tocar Supabase Luciane Gestão/Boutique, impressora, estoque, pedidos, pagamentos, Meta Pixel, Tintim webhook, envios ou produção Cloudflare.

## Evidência
Auditoria banco em 26/10/2026: 53 clientes, 51 conversas CRM, **zero** `interest_label`, **zero** consentimentos comerciais granted; 49 conversas vinculadas ao Tintim, 27 com ad_name, 21 com termos associados a fatias. Nomes reais incluem anúncios inequívocos (`CHOCOLATUDO`, `PRESTIGIO`, `MARACUJÁ`, `Chocolate com morango`) e ambíguos (`MORANGO` isolado). CRM continua agendando/cancelando lembretes automaticamente, mas envio indisponível.

## Mudança segura
- `crmAdSliceHint(adName)`: identifica APENAS um nome inequívoco de fatia que conste de anúncio individual, usando catálogo existente e evitando `MORANGO` genérico, nomes com múltiplos sabores e pipocas. Resultado `basis:ad_hint_only`. Não altera nenhum registro no banco.
- `crmSuggestedMessage(interest, adName?)` mantém interesse confirmado pela Luciane como prioridade. Quando ele está ausente e há anúncio inequívoco, gera abordagem `Você chegou pelo anúncio da fatia X`; **não** diz que cliente escolheu ou comprou o sabor; não promete estoque ou preço.
- Painel `AdminCrmPanel` exibe sugestão de sabor e rascunho ao lado do atendimento, mantendo bloqueio por `consent_status=granted`, opt-out, etapa possível compra e necessidade de abrir `wa.me` manualmente. Não cria evento Purchase nem registra mensagem enviada.
- Código preparado para publicar apenas após homologação do pacote Cloudflare correto. Nenhum deploy Cloudflare, GitHub main merge, edição de banco, webhook, credenciais ou envio.
- `CRM interest_label` continua não preenchido automaticamente: precisamos de preferência explicitamente reconhecida da conversa (sem texto armazenado) ou confirmação da atendente para assumir produto realmente escolhido.
- Etapa final de envio automático depende de canal API oficial compatível com a Coexistence Tintim, opt-in, validação de horário original recebido da API, aprovação de templates/custos quando aplicável, possível compra e idempotência. O preflight `crm_followup_send_preflight` já rejeita qualquer remetente enquanto configuração `automatic_sends_enabled=false`.
- Data source rastreada `ad_name` é apenas uma hipótese; não ser usado como declaração de intenção ou autorização para mensagens comerciais.
