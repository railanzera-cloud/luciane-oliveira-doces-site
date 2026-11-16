# Recuperação WhatsApp — montador servidor, incremento 2

Branch: `feat/crm-recovery-shadow-20261115`, PR draft #67, dependente do PR #65.

## Entrega

`supabase/functions/_shared/recovery-snapshot.mjs` implementa `assembleRecoveryEvaluation(client, config)`, um montador somente de leitura para execução interna no servidor. Reutiliza o núcleo de catálogo e as tabelas existentes de conversas/clientes, eventos oficiais/Tintim, vínculos de pedido, pedidos, disponibilidade, loja e acompanhamentos.

Não há endpoint HTTP, migração, cron novo ou integração ao ingresso ativo. A função não concede acesso: o cliente Supabase deve ser criado no servidor, com escopo autorizado, e nunca recebido do navegador. Não usa `rpc`, INSERT, UPDATE, DELETE, envio WhatsApp ou carregamento de credenciais próprias. O contrato SQL foi conferido no schema comercial; os testes usam fontes sintéticas, sem consultar linhas de clientes.

## Regras de confiança

- Cada fonte é consultada com colunas mínimas, contagem exata, ordenação e paginação. Falha, contagem ausente/variável, IDs repetidos, truncamento ou limite excedido impedem declarar consulta completa. Não busca tokens de acompanhamento, endereços, nomes, emails, notas ou conteúdo privado de pedidos.
- O escopo recente começa no maior valor entre criação da conversa e 24 horas antes do relógio explícito. É uma janela de observação, não reconstrução de todo o histórico ou receita vitalícia.
- Eventos de banco não têm texto. Somente um envelope Meta assinado, recebido transitoriamente por configuração confiável, pode acrescentar texto; exige identidade exata do cliente e ID/horário coerentes com o registro existente. Texto, chave da conversa, telefone e segredo não aparecem no resultado.
- Tintim com horário de recebimento é sinal de cobertura incompleta; nunca é promovido a horário do provedor. Atividade CRM mais recente que os eventos comprovados também impede declarar histórico completo.
- A configuração servidor `rollout.channel_identity_verified` precisa de data `channel_verified_since` cobrindo o início da janela. Não certifica mensagens anteriores ao início da homologação. `purchase_coverage_verified` só deve ser liberado após validação da cobertura real de identidade de compra. Esses campos não são flags do navegador e não autorizam envio.
- Consentimento exige estado concedido, evidência e data válida não futura; opt-out ausente/desconhecido é bloqueio. Nenhum dado é preenchido artificialmente.
- Telefone normalizado e pedido contemporâneo podem comprovar identidade direta. Vínculos Tintim, inclusive rótulo `confirmed` sem outra prova, continuam candidatos. Etapa `Comprou` bloqueia abordagem, sem confirmar receita. Pedido entregue/aceito não vira pagamento.
- Pedidos sem telefone e sem associação ao episódio impedem concluir ausência de compra. Isso não cria uma lista de tarefas para a operadora: o resultado continua silenciosamente bloqueado enquanto a cobertura não for resolvida.
- Um novo acompanhamento já registrado, loja fechada, disponibilidade desconhecida e demais bloqueios do núcleo continuam aplicados.
- Conversa e cliente são relidos ao final para detectar mudanças durante a consulta. Consistência é otimista, apropriada apenas à observação; nunca substitui transação/rechecagem imediatamente antes de um futuro envio.

## Testes e segurança

Testes do montador exercitam o contrato de consultas Supabase com um cliente sintético que só oferece SELECT, filtros, ordenação e paginação. Incluem envelope HMAC sintético até a decisão final, erro/truncamento, vínculo candidato, compra paga, pedidos sem identidade, opt-out, data futura, troca de versão, cobertura de atividade e privacidade do resultado. Não equivalem à implantação ou ao teste de permissões com a conta Meta real.

Revisão de divulgação: arquivos do incremento e histórico novo examinados para tokens, JWTs, App Secrets reais, chaves privadas e URLs com credenciais. As únicas chaves de teste são literais explicitamente sintéticas; fixtures e telefones são gerados para os testes. Não exportar snapshots ou resultados de dados reais no PR, logs ou artefatos de CI. Os dois commits locais iniciais foram publicados como um commit com árvore idêntica, sem incluir a branch de auditoria com dados operacionais.

## Próximo corte

1. Homologar os ativos e a cobertura real de entrada/echo com as capturas e números autorizados.
2. Validar o montador com cliente servidor autorizado em ambiente isolado; incorporar recebimento validado sem duplicar os webhooks existentes.
3. Definir persistência privada de observações mínimas e retenção. Neste incremento o texto só existe em memória; falta histórico de interesse entre execuções.
4. Resolver vínculo inequívoco pedido/cliente antes de liberar cobertura de compras; sem inferência por nome ou conversa de anúncio.
5. Preparar o corte de observação produtiva separadamente. Não ativar disparos ou alterar operação comercial por este PR.
