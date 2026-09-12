# Luciane Oliveira Doces — checkpoint da Fase 2

Data: 12/09/2026. Estado: implementação em homologação, NÃO liberada para clientes.

## Continuação mais recente — segurança e Pix

- Escopo reafirmado por Railan: concluir Pix e cartão online, mantendo pagamento no recebimento, painel da cozinha, acompanhamento e WhatsApp. Somente impressão/QZ adiada. Não publicar Cloudflare nem Sites.
- Migração `20260912183000_phase2_retry_safety.sql` APLICADA: editor confirmou `Success. No rows returned`. O primeiro envio falhou porque o editor havia concatenado o SQL anterior; a entrada foi limpa e a execução correta terminou com sucesso. Não reexecutar por causa desse primeiro erro.
- RLS verificado ativo nas nove tabelas de pedidos/disponibilidade; anon não pode consultar orders nem executar diretamente o RPC de acompanhamento. Auditoria anterior à migração registrou zero pedidos.
- `LOD_ADMIN_USER_IDS` configurado no backend com os dois UUIDs de Railan/Luciane conferidos na tela Auth. `process-order-effects` publicado com autenticação interna ou usuário verificado nessa lista; JWT legado desligado após testes. Não há execução anônima arbitrária.
- `public-order-status` atualizado com projeção explícita de campos mínimos, token aleatório de 192 bits e sem consulta por número do pedido; JWT legado desligado após testes.
- Encontrado código de exemplo Supabase concatenado ao código real nas publicações antigas. `public-order-status` e `mercadopago-webhook` foram limpos e republicados. No webhook a revisão automática inicialmente recusou a publicação; após limpar o editor, comprovar visualmente a entrada correta e repetir a confirmação, a atualização foi aceita.
- `create-order`: correção do editor iniciada, mas publicação final NÃO confirmada antes do reinício do navegador. Auditar os arquivos publicados, incluindo as duas entradas de catálogo exibidas no editor, antes de retomar. Não presumir que a correção está publicada.
- `.env.local`: Public Key de teste fornecida por Railan configurada; `SITE_ORDERING_ENABLED=false`. Nenhum Access Token foi copiado do backend. Não habilitado checkout público de teste.
- QZ recebeu correção de autorização e testes antes do adiamento; NÃO publicado. Não continuar impressão nesta execução.
- Testes: build aprovado; 142/142 testes passaram; lint 0 erros/5 avisos img. Depois, ajustes específicos do Pix passaram em mais 3 testes novos (12/12 com a suíte backend). Não confundir testes isolados com uma transação real Mercado Pago.
- Pix: `payer.first_name` passa a usar o primeiro nome informado, permitindo o cenário oficial APRO. Webhook aceita `country_code=BRA` quando a Orders API omite moeda, sem substituir moeda estrangeira explícita. Essas duas últimas correções ainda são LOCAIS.
- Documento oficial de teste Pix: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/pix . Usa `test_user_br@testuser.com`, primeiro nome `APRO` e valor R$50,00; retorna `action_required/waiting_transfer` e depois aprovação automática. Duas pipocas 500 ml do conjunto 1 totalizam esse valor sem mudar o catálogo. Conferir disponibilidade real antes de criar o pedido.
- NÃO exigir prefixo TEST: a documentação atual da Orders API informa prefixo APP_USR também para credenciais de teste. Confirmar o ambiente pela configuração oficial, não só pelo prefixo.
- `tests/phase2-database-smoke.sql` preparado com rollback transacional; ainda NÃO executado. Não chama gateway e não prova webhook real.
- As três consultas HTTP externas tentadas nesta continuidade excederam 10 segundos; não provam resultado das funções.
- O navegador reiniciou e voltou à tela de login do Supabase. Novo acesso seguro solicitado. Ainda NÃO há evidência de Pix aprovado, webhook válido processado, pedido confirmado no painel ou acompanhamento atualizado de ponta a ponta. Cartão também não homologado. Preservar esses limites no relatório.

As seções abaixo registram o checkpoint anterior; os fatos acima prevalecem em caso de divergência.

## Projeto preservado

- Projeto Sites: `appgprj_6a8f9391fa9c8191a5c30f8430506936`.
- Código: `/workspace/sites/luciane-oliveira-doces`.
- Produção: https://lucianeoliveiradoces.pages.dev.
- Base anterior da Fase 2: `ca752e2a3f408d083375dab71fd34c284e865f48` (oito sabores e preço por conjunto), conferida igual à main remota antes de salvar este checkpoint.
- O prompt vigente da Fase 2 está no anexo Texto colado(3).txt. Ele autoriza pedidos, pagamentos online, painel, acompanhamento, CAPI e impressão. Substitui a proibição de pagamento online da rodada anterior.
- NÃO reconstruir o site. NÃO publicar no Cloudflare ou no espelho Sites sem autorização. NÃO reexecutar seed.

## Implementação presente no código

- Canal site separado do WhatsApp; Pix Mercado Pago, Card Payment Brick, dinheiro e cartão no recebimento.
- Backend recalcula produtos, combinações e taxas e reconsulta disponibilidade; não confia no total do navegador.
- Pedido com UUID, código LOD, número legível e token de acompanhamento; atribuição preservada.
- Migrações de pedidos, tentativas, eventos, histórico, outbox e impressão com RLS.
- Webhook valida assinatura e consulta a Order no Mercado Pago antes de alterar pagamento.
- Painel Pedidos adicionado ao admin existente; Disponibilidade e Auth preservados.
- Acompanhamento `/pedido` e resultado de pagamento, consulta periódica e suporte Tintim.
- Purchase server-side somente para pedidos do canal site pagos; canal WhatsApp continua com Tintim. Nenhum Purchase foi adicionado ao Pixel do navegador.
- Suporte opcional QZ Tray com assinatura autenticada no servidor e fila de impressão com claim atômico.

## Correções nesta continuação

- Card Brick passou a ler `paymentTypeId` do segundo argumento oficial do callback, preservando a seleção de crédito/débito.
- CORS da função de efeitos permite preflight do admin nas origens configuradas; demais origens são rejeitadas. POST exige token interno ou usuário autenticado.
- Pedido de teste exige `META_CAPI_TEST_EVENT_CODE`; não pode ser enviado como Purchase real. Pedido offline antigo sem ambiente é tratado como teste.
- Novos pedidos offline também registram ambiente, para separar teste de produção.
- Preparada migração adicional para vincular eventos à tentativa correta, ignorar eventos tardios de tentativas anteriores e preservar histórico.
- Preparada recuperação de efeitos interrompidos com lease de dois minutos, limite de tentativas e confirmação vinculada ao worker responsável.
- Painel tenta processar a outbox a cada 30 segundos quando visível, além do gatilho de confirmação de pagamento. Não existe scheduler independente do painel nesta versão.
- Resultado não oferece QR/link de pagamento cancelado ou estornado; apresenta nova tentativa após falha/expiração sem limpar carrinho.
- Ações de preparo não aparecem para pedidos online não pagos; preferências locais de áudio não impedem o painel se o armazenamento do navegador falhar.
- Rollback operacional agora bloqueia a reversão se houver tentativas estornadas incompatíveis com a estrutura anterior; não apaga nem renomeia esses registros.

## Estado real do Supabase

Projeto existente: `edqiwvccmboyayojvuea`. Usuários, catálogo, configurações e seed não recriados.

| Migração | Estado |
| --- | --- |
| `20260912123000_phase2_orders.sql` | Aplicada no checkpoint anterior |
| `20260912154500_phase2_operations.sql` | Aplicada nesta continuidade; editor confirmou sucesso |
| `20260912183000_phase2_retry_safety.sql` | Preparada localmente, NÃO aplicada |

| Edge Function | Estado verificado |
| --- | --- |
| `mercadopago-webhook` | Publicada; verificação JWT legada desligada; versão publicada ainda não contém a chamada à função de efeitos |
| `create-order` | Publicada; verificação JWT legada desligada; precisa receber as correções locais posteriores |
| `public-order-status` | Publicada; verificação JWT legada ainda LIGADA, confirmada no painel |
| `process-order-effects` | Código local, ainda NÃO publicado; depende da migração de retry e das configurações Meta |
| `qz-sign` | Código local, ainda NÃO publicado; depende de certificado e chave QZ opcionais |

Não confundir o `verify_jwt=false` local em `supabase/config.toml` com uma configuração já aplicada no dashboard. A validação de identidade continua no código das funções. RLS das tabelas privadas permanece obrigatório.

## Configuração e próximo checkpoint

- `.env.local` contém os dois valores públicos existentes do Supabase. Não sobrescrever.
- `SITE_ORDERING_ENABLED` continua desativado por padrão; não foi habilitado no backend ou em produção nesta rodada.
- O usuário confirmou cadastro de `MP_ACCESS_TOKEN_TEST` e `MP_WEBHOOK_SECRET_TEST` no backend. Saúde do webhook anteriormente retornou ambos configurados; isso NÃO prova uma transação concluída.
- Falta configurar a Public Key de teste no build: `MP_PUBLIC_KEY_TEST`. É pública; NUNCA pedir Access Token por chat.
- Para CAPI: `META_CAPI_ACCESS_TOKEN`, `META_GRAPH_API_VERSION` e, na homologação, `META_CAPI_TEST_EVENT_CODE`. Pixel padrão preservado: `1491655855979140`.
- Para impressão opcional: `QZ_CERTIFICATE` e `QZ_PRIVATE_KEY_PEM` somente no backend, além de QZ Tray e impressora instalados na cozinha.
- Antes de alterar a verificação JWT legada nas funções pendentes, obter autorização explícita de segurança. Não alterar usuários, chaves do projeto, Auth ou RLS de disponibilidade.
- Aplicar a migração de retry com a versão correspondente de `process-order-effects`; suas assinaturas de RPC mudaram. Não publicar apenas metade desse par.
- Revalidar o estado remoto antes de continuar; não assumir que o usuário não fez alterações depois deste checkpoint.

## Testes efetivamente executados

- `npm test`: build de produção concluído e **130/130 testes passaram**.
- `npm run lint`: **0 erros, 5 avisos de img** (quatro preexistentes e um do QR Code).
- `git diff --check`: aprovado.
- Na consulta HTTP de encerramento, `create-order` respondeu 405 ao GET, como previsto para um endpoint POST. Webhook e consulta pública excederam o timeout de dez segundos; isso não confirma falha permanente nem substitui a validação pelo fluxo real.
- Dez novos testes isolados executam o handler de efeitos com HTTP e credenciais fictícios: CORS, autenticação, ausência de configuração, segregação teste/produção, canal/estado, hash e ID estável, falha Meta e contrato do Card Brick.
- Testes de migração são inspeções de código SQL, NÃO testes transacionais reais no banco.
- O build emitia avisos de proxy/classificação de rotas e um conflito de porta HMR na suíte; os comandos terminaram com código zero e os 130 testes passaram.

## Pendências que impedem aceite final

1. Aplicar/validar a migração adicional e publicar as funções correspondentes, com configuração de acesso aprovada.
2. Configurar a Public Key de teste e habilitar SOMENTE uma homologação controlada, sem expor o checkout incompleto a clientes.
3. Testar Pix, cartão aprovado/recusado, 3DS e webhook válido assinado com as credenciais de teste. Não houve pagamento real ou simulação de sucesso declarada como pagamento confirmado.
4. Cobrir idempotência de ponta a ponta: retry técnico deve preservar chave E corpo; revisar especificamente o token do cartão se o SDK gerar outro token após timeout ou recarga. Não tratar uma resposta desconhecida como recusa e iniciar cobrança nova.
5. Validar a migração de retry em banco, eventos concorrentes/tardios, reconciliação de pagamento e recuperação da outbox. Na ausência de painel aberto, não há cron de retry; ao atingir dez tentativas, a falha exige tratamento operacional explícito.
6. Confirmar formato real de expiração Pix e dados de desafio retornados pela Orders API; conferir resultado/restauração, privacidade, edição e retorno após recarga.
7. Testar admin autenticado com Railan/Luciane, Realtime, múltiplas abas, alertas e restrições de operação.
8. Testar `/pedido` com token válido, inválido e ausência de dados pessoais.
9. Homologar eventos na área de testes da Meta, sem contaminar vendas reais; sem token CAPI, suporte fica implementado mas não comprovado por envio real.
10. QZ: conferir reconexão/renovação da sessão de assinatura, impressora escolhida, falha de impressão e comportamento com várias abas; teste físico 58 mm pendente.
11. Revisão visual/mobile, iPhone/Safari real, teclado, safe area, WhatsApp e retorno: não concluídos nesta Fase 2.

## Arquivos desta Fase 2

- Interface: `app/page.tsx`, `app/globals.css`, `app/admin/page.tsx`, `app/admin/layout.tsx`, `app/pedido/page.tsx`.
- Componentes: `admin-orders-panel.tsx`, `mercado-pago-card-form.tsx`, `site-order-result.tsx`.
- Clientes/configuração: `lib/admin-orders-client.ts`, `lib/commerce-config.ts`, `lib/qz-print-client.ts`, `lib/site-order.ts`, `types/qz-tray.d.ts`.
- Backend: `supabase/config.toml`, cinco Edge Functions, catálogo server-side e três pares de migração/rollback.
- Build: `.env.example`, `vite.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `scripts/package-cloudflare.mjs`.
- Testes: três suítes `phase2-*` e ajustes nos testes existentes de dispatcher/renderização.
- Este documento de continuidade.

Catálogo público, preços por conjunto, imagens, Fatias, tracking base e integrações anteriores não foram reescritos nesta continuação.

## Publicação e rollback

- **Não houve deploy no Cloudflare nem no espelho Sites nesta Fase 2.** Houve aplicação de migrações e publicação parcial de funções no Supabase conforme a tabela acima.
- O código deste checkpoint não é uma versão final aprovada para produção.
- Nenhum novo ZIP final de produção foi gerado. Pacotes antigos em `outputs/` não representam esta Fase 2.
- Os ZIPs anteriores foram preservados. O pacote de rollback antigo `a616252` reintroduz regras já retiradas, inclusive calda; não usar automaticamente.
- Para retorno à base imediatamente anterior, preservar o commit `ca752e2a3f408d083375dab71fd34c284e865f48` e não executar SQL de rollback sem avaliar dados e dependências.
- A reversão completa da primeira migração remove dados da Fase 2 e requer autorização específica. Nunca executá-la automaticamente.

Referência técnica consultada para o callback de cartão: [documentação oficial do Card Payment Brick](https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md).
