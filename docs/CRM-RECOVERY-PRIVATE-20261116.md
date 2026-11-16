# Observações privadas — preparo isolado

Incremento do PR #67. Não implantado no Supabase ou no ingresso ativo.

- `supabase/prepared/recovery-private-observations.sql` é um roteiro SQL para banco isolado, não uma migration produtiva. Cria schema privado com RLS e sem acesso direto de anon, authenticated ou service_role. Duas RPCs service-only com gate de origem e search_path vazio gravam/leem observações por conversa e ID de mensagem. A migração versionada será gerada no corte de instalação autorizado.
- O adapter grava somente o resultado semântico do classificador: IDs/variantes do catálogo, intenção e estado de confiança. Não grava telefone, corpo, payload original, segredo ou texto digitado. Identificadores da conversa/mensagem permanecem privados. Retentativa do mesmo ID não renova retenção nem duplica registro.
- A leitura ignora registros expirados, fora da janela e versões inválidas. O prazo de 30 dias limita visibilidade; a exclusão física por manutenção ainda precisa ser instalada no corte produtivo. Não há cron neste incremento.
- O montador aceita opcionalmente um store interno. Ele recupera observações somente quando coincidem ID, direção, horário e conversa oficial. Captura nova ocorre após HMAC e vínculo exato com a identidade do cliente. Sem store, mantém o modo anterior de leitura. Não aceitar esse objeto/configuração de navegador ou request público.
- `recovery-shadow` consome a observação semântica privada sem reconstruir mensagens fictícias nem exigir classificação individual da operadora. Falha de leitura/gravação impede candidatura silenciosa, sem alterar pedidos ou consentimento.

Validação local: 50/50 testes direcionados. Inclui PostgreSQL via PGlite com o SQL real, permissões anon/authenticated, gate service_role, RLS, idempotência, expiração e rejeição de corpo bruto; também recuperação de interesse entre execuções e captura somente de envelope correspondente. Fixtures exclusivamente sintéticas. Não equivale à homologação do número Meta.

## Homologação de echo, antes de alterar assinaturas

A documentação Meta descreve `smb_message_echoes` como eventos de saída do App; `smb_app_state_sync` descreve contatos, não substitui echoes. Verificar Coexistence com leitura autenticada de `is_on_biz_app` e `platform_type` e conferir apps inscritos/overrides, IDs do número e da WABA com a configuração privada do endpoint. Nunca copiar credenciais para documentação ou usar credenciais visíveis em capturas.

O parser e a RPC existentes têm suporte a echo. Importante: um echo recebido pode alterar last_outbound/status e reagendar lembretes. Não é um switch puramente visual. Envio automático permanece separado e bloqueado. O adapter privado continua sem ligação com a Edge ativa.

Procedimento proposto SOMENTE após identidade e Coexistence comprovadas e autorização da alteração:
1. Registrar estado das assinaturas e conexão Tintim, sem modificar callback/tokens/fornecedor. Conferir guardas de envio e saúde do webhook.
2. O proprietário ativa apenas `smb_message_echoes` no app/WABA confirmados, mantendo `messages`; não ativar sincronização de contatos ou histórico para tentar corrigir saída.
3. Telefone próprio/autorizado envia texto ao número comercial e a operadora responde pelo App no aparelho principal. Conferir evento inbound, echo com direção correta, IDs/horários, resposta HTTP e gravação. Repetir com segundo contato autorizado.
4. Conferir conversa App, eventos/atribuição Tintim, opt-out, dedupe e efeito esperado nos lembretes. Reentrega idêntica deve ser testada em banco isolado, sem reexecutar eventos reais por tentativa.
5. Em falha, proprietário restaura a assinatura anterior; não migra ou desconecta o número. Investigar erro de assinatura, filtro de IDs, subscription/override e dispositivo. Desativar assinatura não desfaz lembretes já alterados; não apagar dados para simular rollback.

A assinatura desativada é hipótese forte, não confirmação da identidade ou da elegibilidade do número. Não executar a alteração antes dessas verificações. A assinatura adiciona recepção de eventos; não constitui migração do App. O comportamento da instalação Tintim precisa de teste real, sem promessa de impacto zero.

Fonte oficial: https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
