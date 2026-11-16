# Instalação privada e acesso Graph — 16/11/2026

## Corte instalado

Autorizada e aplicada exclusivamente a migration `20261116112858_crm_recovery_private_observations.sql`: um schema privado, uma tabela, três RPCs. Arquivo inicialmente criado pelo CLI e reconciliado com a versão efetivamente registrada pelo Supabase. Sem scheduler, backfill, alteração da Edge ativa ou de tabelas existentes.

A primeira revisão somente de chaves externas não protegia todos os campos aninhados. Antes da instalação foi acrescentada validação fechada gerada do catálogo: todas as chaves obrigatórias, versão exata do catálogo, enums/listas finitas e igualdade exata de cada candidato com um objeto canônico. Não basta conter product_id válido: campos extras, nomes adulterados, objetos aninhados, email em lista de opções ou campos omitidos são rejeitados. O servidor não tem permissão direta de tabela; utiliza RPCs autorizadas. Administradores do banco continuam tecnicamente capazes de administrar o banco, portanto a proteção não substitui o controle de acesso de administradores.

Gerador: `node scripts/generate-recovery-semantic-guard.mjs`. Mudança futura do catálogo exige gerar/validar nova migration; nunca editar a migration já aplicada para fingir alteração remota. As fotografias e os preços não são alterados por essa geração.

Pós-instalação: testes SQL transacionais com rollback verificaram escrita/leitura, duplicação, rejeição aninhada, expiração/expurgo, bloqueio de anon/authenticated e reversão da revogação de EXECUTE do servidor. Referência FK obtida somente por leitura, sem editar conversa ou cliente. Nenhum registro de teste foi mantido. Tabela vazia, RLS ativo, acesso service-only restaurado e envio automático desligado na verificação final.

Advisor registrou somente informação esperada para esta tabela: RLS sem políticas, intencional para negar acesso direto. Nenhuma função nova exposta a anon/authenticated. Avisos anteriores do projeto não foram corrigidos fora do escopo.

## Expurgo antes de observações reais

- Os registros vencem em 30 dias; consultas já ignoram expirados e não usam observações com mais de 24 horas.
- `crm_recovery_purge_expired()` elimina até mil expirados por chamada com SKIP LOCKED; repetir até retornar zero. Nunca remove observações não expiradas.
- A captura real continua desativada até instalar e testar um agendamento horário autorizado, com identidade service_role, repetição em lotes e monitoramento de última execução/contagem pendente. O corte atual não autorizou novo scheduler e não o criou. Não confundir invisibilidade de registros vencidos com exclusão física concluída.
- Rollback operacional da integração é desligar o store e revogar EXECUTE, preservando dados privados; reversibilidade de permissão foi testada em transação. Não executar DROP ou purga geral para simular rollback.

## Acesso Graph sem Gerenciador de Anúncios

O Work atual não oferece uma conexão autenticada de gestão do WhatsApp. O verificador não autentica por si só: usa uma credencial disponibilizada em ambiente seguro. Não solicitar tokens por chat ou commit.

Caminho imediato: Graph API Explorer da própria Meta, no navegador do proprietário:
1. Abrir https://developers.facebook.com/tools/explorer/ e entrar com o perfil que administra a integração.
2. Selecionar o aplicativo comercial já utilizado. Escolher token de usuário e solicitar `whatsapp_business_management`, limitando a seleção aos ativos de WhatsApp pertinentes. Essa permissão tem capacidades de gestão; este procedimento utiliza somente GET. Não solicitar ads_read, ads_management ou permissão de envio para este diagnóstico.
3. Gerar o token pela interface Meta e mantê-lo ali. Não copiar para chat, screenshots ou arquivos versionados.
4. Executar GET `/PHONE_NUMBER_ID?fields=id,is_on_biz_app,platform_type`, depois GET `/WABA_ID/phone_numbers?fields=id`, depois GET `/WABA_ID/subscribed_apps`, substituindo pelos IDs já conhecidos. Usar a versão Graph suportada pelo aplicativo.
5. Confirmar: número na WABA, aplicativo correto inscrito e Coexistence (`is_on_biz_app=true`, `platform_type=CLOUD_API`). Conferir paginação. Compartilhar somente os resultados dessas verificações; se ocorrer erro, informar código/mensagem sem token.

Isso não altera assinatura e não conecta Ads Manager. Se a permissão estiver indisponível ou o app/ativo não aparecer, parar e informar a etapa exata; não criar outro app ou reconectar o número por tentativa.

Alternativa local/servidor: Node 22+ com `scripts/meta-linkage-readonly.mjs`, variáveis META_AUDIT_USER_TOKEN, META_AUDIT_APP_ID, META_AUDIT_WABA_ID, META_AUDIT_PHONE_ID, META_AUDIT_CALLBACK, META_AUDIT_VERSION configuradas no ambiente seguro. Introduzir token por prompt secreto/gestor de segredos, nunca em linha de comando literal, .env versionado ou histórico. Executar `node scripts/meta-linkage-readonly.mjs`; limpar as variáveis ao terminar. Sem META_AUDIT_APP_TOKEN, três consultas de ativos funcionam e `app_configuration_checked=false`; `ok=false` significa diagnóstico parcial, não falha automática de Coexistence.

Para ler também a assinatura do app por API, exige-se credencial de aplicativo em ambiente servidor. Não é necessário revelar App Secret para iniciar a etapa acima. App tokens permitem alterar configurações: não os colocar no frontend. Overrides e igualdade com os IDs efetivos da Edge ainda exigem conferência privada; os indicadores do verificador não autorizam ativação sozinhos.

Fonte: https://developers.facebook.com/documentation/facebook-login/guides/access-tokens

## Validação

53 testes direcionados locais aprovados, com fixtures sintéticas e SQL real em PostgreSQL/PGlite. Instalação produtiva testada separadamente por SQL em rollback. Nenhuma mensagem enviada, nenhuma assinatura ativada ou versão Cloudflare publicada. PR #67 permanece em rascunho.
