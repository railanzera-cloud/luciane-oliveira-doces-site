# Impressão térmica segura — preparação técnica isolada (14/10/2026)

> **NÃO IMPLANTAR EM PRODUÇÃO NESTA FASE.** O repositório comercial, `main`,
> a branch editorial Premium 2.9.2 e o Supabase ativo permanecem inalterados.
> Trabalho exclusivo na branch `work/cozinha-qz-fila-segura-20261014`.

## Objetivo operacional

Evitar perda de tempo na cozinha sem preparar pedidos de visitantes que apenas
clicaram em **Finalizar pedido**. Registro de pedido **não é** pagamento
confirmado, aceite ou autorização para imprimir.

| Origem e pagamento | Condição para liberar comanda inicial |
|---|---|
| Site + Mercado Pago Pix/cartão online | Webhook oficial marca `paid`; pedido ativo |
| WhatsApp + Pix manual | Pix conferido como `paid` **e** pedido aceito (`confirmed` ou avançado) |
| WhatsApp + dinheiro/cartão na entrega | Pedido aceito pela equipe |
| Pedido `new` Pix manual, pendente, cancelado, concluído ou reembolsado | **Não** imprimir automaticamente |
| Reimpressão explícita | Pedido não cancelado, comanda inicial já impressa e solicitação de atendente |

Atenção: não há confirmação bancária automática para o Pix manual. Confirmar
recebimento manualmente (de preferência no extrato, não só por print) continua
necessário. Um envio no WhatsApp não prova pagamento.

## Achados observados em produção (somente leitura)

- Uma comanda antiga encontra-se em `print_jobs.status=pending`, vinculada a
  um pedido Pix online pago e já concluído. A fila existente pode imprimi-la
  erroneamente sem a migração de proteção.
- `claim_print_job` ainda não verifica estado do pedido, pagamento ou data.
- `create_whatsapp_store_order` registra pedido mas não cria trabalho de impressão.
  Os formulários de confirmação manual e aceite também não enfileiram.
- `qz-sign` existe no código, porém não constava da lista de Functions ativas.
- O painel atual possui som Web Audio de aviso e Supabase Realtime; alerta de
  registro não comprova venda paga, e o navegador pode suspender o áudio.

## Alterações PREPARADAS, não aplicadas ao banco

Arquivo: `supabase/migrations/20261014230000_kitchen_print_preparation_DISABLED.sql`.

1. Tabela de controle `kitchen_print_control` criada com `enabled=false`.
2. Ao ativar futuramente, `admin_set_kitchen_print_enabled(true)` fixa um
   **novo corte temporal**. Trabalhos anteriores ficam no histórico, mas jamais
   são reclamados pelo worker.
3. Trigger de pedidos enfileira exatamente uma comanda inicial após todas as
   condições; usa `job_key` único para idempotência.
4. `claim_print_job` seleciona somente pedidos e trabalhos elegíveis,
   com `FOR UPDATE SKIP LOCKED` para múltiplos workers.
5. `admin_verify_print_claim` repete a elegibilidade e confere token antes
   do envio de bytes à impressora.
6. `admin_get_kitchen_print_control` informa o estado autenticado. A função
   que muda a configuração exige atendente autorizado.

`lib/qz-print-client.ts` consulta `admin_get_kitchen_print_control` antes
de qualquer claim. Sem função no servidor, falha **fechado**, sem imprimir.
Na conexão pelo painel, não consome mais automaticamente trabalhos acumulados.
Os dados e a chave privada do QZ nunca devem ir para o navegador.

Nenhum SQL foi aplicado e nenhuma fila real foi consumida.

## Instalação física futura

Equipamento fotografado: Goldensky, etiqueta `SMX-JP58H`, térmica 58 mm,
alimentação 8,5 V / 2 A e conexão aparentemente USB. Compatibilidade do driver,
presença de buzzer e suporte efetivo a ESC/POS ainda não foram testados.

Quando a Luciane puder:

1. Instalar impressora/driver no Windows, imprimir uma página de teste local.
2. Instalar QZ Tray obtido em https://qz.io/download/.
3. Validar certificado, assinatura QZ e opções de segurança/licenciamento.
4. Testar impressão local ISOLADA, sem consumir `print_jobs` real.
5. Homologar regras num ambiente de testes, inclusive falhas, reimpressão,
   cancelamento, Pix não pago, Pix aceito, dinheiro/cartão e duplicidade.
6. Só depois aprovar migração para produção, instalar `qz-sign` com secrets
   fora do Git, publicar cliente e habilitar `kitchen_print_control`.
7. Operar com notebook ligado, QZ Tray ativo e painel autenticado/visível.
   Não prometer som/print quando notebook dormir ou navegador suspender.

O alerta do navegador continua sendo notificação de novo pedido para análise,
não sinal de pagamento concluído. Uma campainha no equipamento depende do
hardware e do comando aceito pela impressora.

## Bloqueadores antes de qualquer migração/deploy

- Ensaiar a migração SQL em banco **descartável** com as mesmas versões de RPC.
- Confirmar secret/certificado QZ fora do controle de versão; não publicar
  credenciais ou keys sensíveis em logs ou interface.
- Confirmar que o QZ Tray da máquina está funcionando e que o modelo de
  impressora suporta o formato ESC/POS de 58 mm.
- Aprovar regras distintas de dinheiro, cartão presencial, Pix manual e online.
- Verificar procedimento de expiração de `printing` e recuperação após queda
  sem reimpressão duplicada; hoje trabalho `printing` não volta sozinho para
  `pending` (deliberadamente conservador).
- Auditar os testes em browser real e o comportamento com a aba suspensa.
- Revalidar HEAD atual, funções remotas e fila antes de qualquer implantação.
- Jamais apagar a comanda pendente antiga nem mudar o estado de pedidos
  históricos sem decisão operacional separada.

## Validação desta etapa

Somente testes de lógica e inspeção estática do código; NÃO equivale a
impressão física ou SQL executado no Supabase. CI da branch valida
TypeScript, build e a suíte automatizada. Registre SHA após conclusão.

## Continuidade

Após testes, preservar branch e checkpoint. Não incorporar na branch Premium,
não gerar pacote de publicação para Production e não habilitar a fila
até a Luciane ter tempo para concluir a instalação física.

## Atualização operacional — QZ Tray instalado no Windows (15/10/2026)

- A Luciane confirmou por fotografia a página de teste do Windows impressa na **POS-58(copy of 1)**. O dispositivo é Goldensky SMX-JP58H/58 mm USB. O driver não precisa ser reinstalado.
- O **QZ Tray 2.3.0** foi instalado e confirmado pelo ícone da bandeja do Windows. Isso comprova o serviço local aberto, não a conexão com o site nem o protocolo ESC/POS.
- A branch passou a procurar impressora de **58 mm** explicitamente, e não a impressora padrão, evitando selecionar a Epson ou impressoras virtuais. Se nenhuma ou várias candidatas forem encontradas, falha fechada.
- Adicionado botão **Imprimir teste local**: imprime somente texto diagnóstico, sem carregar pedidos, sem consumir a fila e sem registrar venda.
- Complementado Realtime com polling de 15 segundos quando a aba estiver visível; o processamento permanece protegido por RPC com `enabled` e elegibilidade.
- Assinaturas QZ agora obtêm a sessão atual via `auth.getSession()` para não usar JWT vencido depois de horas conectado.

### BLOQUEIO REAL: certificado de impressão silenciosa

Conforme https://qz.io/docs/signing (QZ oficial), o QZ Tray gratuito **não autoriza automaticamente impressão silenciosa** apenas pela instalação. Para eliminar pop-ups de autorização, é obrigatório assinar requisições usando certificado confiável e chave privada **somente no servidor**.

Caminhos:
1. **Certificado oficial QZ** (licenciado, recomendado para várias máquinas ou operação formal). Gerar par X.509 + chave privada pelo portal da QZ e configurar como Supabase secrets.
2. **Demo Keys / Site Manager** (sem custo para ensaio em um único notebook): QZ Tray > Advanced > Site Manager > + > Create New; confirma instalação/override. Uma pasta `QZ Tray Demo Cert` é gerada na área de trabalho. O certificado é confiável **somente nessa máquina**, requer cuidados extras em reinstalação e pode não atender política/uso comercial de longo prazo. Não compartilhar `private-key.pem` em WhatsApp, chat, GitHub ou e-mail comum.

A função `supabase/functions/qz-sign/index.ts` utiliza:
- `QZ_CERTIFICATE`: certificado X.509 (público).
- `QZ_PRIVATE_KEY_PEM`: chave privada armazenada apenas nos **secrets do Supabase**, jamais no frontend/GitHub.
- `LOD_ADMIN_USER_IDS`: somente usuários administrativos autorizados.
- `SUPABASE_PUBLISHABLE_KEYS`: apikey validada pelo Supabase.
- `CHECKOUT_ALLOWED_ORIGINS`: host estritamente autorizado.

**Ainda não gerar chaves no ChatGPT nem inventar certificados**: o par confiável precisa ser obtido pelo caminho escolhido. O responsável deve inserir os segredos diretamente no painel protegido do Supabase; não colar no chat.

### Próximos passos de homologação obrigatórios

1. Escolher certificado oficial ou Demo Keys; registrar publicamente só a opção escolhida, nunca os valores privados.
2. Validar assinatura SHA-512 e CORS no `qz-sign` isoladamente.
3. Testar função de impressão local numa página de homologação, **sem pedido comercial**.
4. Revisar SQL em banco descartável ou branch de testes. Depois aplicar no Supabase comercial **com `enabled=false`**, preservando backlog e pedidos.
5. Publicar frontend homologado manualmente e conferir que a impressora selecionada é `POS-58(copy of 1)`.
6. Testar fim a fim um pedido aprovado elegível e cenários negativos no banco de testes.
7. Ativar explicitamente a automação somente após confirmação de impressão física, segurança e estados comerciais; revalidar filas antes de ativar.

**Estado:** a base comercial e o QZ signing endpoint ainda não foram implantados nesta etapa. Nenhuma comanda real deve ser impressa por esta branch até que esses bloqueios sejam resolvidos.
