# CRM — Triagem por evidência e operação manual (15/11/2026)

## Contexto
O usuário publicou o ZIP candidato anterior e homologou o CRM no Safari iPhone (70 entradas recentes, 0 para revisão assistida, 212 vencidos bloqueados, 658 acompanhamentos em curso e 1 finalizado). A tela abriu normalmente, mas tinha muitos dados não qualificados.

Análise read-only da base comercial `edqiwvccmboyayojvuea`:
- 644 clientes / 659 conversas, 0 consentimentos comerciais `granted`, 0 tentativas de envio e `automatic_sends_enabled=false` na última leitura.
- Eventos Meta oficiais: 129 entradas agregadas em **uma única conversa** de teste.
- Tintim: 9.056 eventos de entrada observados em 564 conversas (todos com `time_basis='webhook_received'`; não confundir com timestamp original da Meta).
- A triagem de clientes não pode usar apenas recência/sinal Tintim como permissão para contato ou prova de interesse.

## Incremento PR #65
Código em `feat/crm-triagem-evidencias-assistida-20261115` (base PR #64, que se apoia no PR #63 e no CRM PR #62).
- `supabase/migrations/20261115135500_crm_conversation_evidence_staff_readonly.sql`: função pública `crm_list_conversation_evidence()` com gate explícito `crm_require_staff()`, ACL `anon=false`, `PUBLIC=false`, `authenticated=execute` **somente mediante staff**. Retorna `conversation_id`, último evento Meta de entrada e último sinal Tintim de entrada + base do horário. Nunca expõe telefone, corpo da mensagem, consentimento ou compra.
- Migração **aplicada no Supabase comercial**; execução read-only com identidade staff autorizada identificou 565 conversas com alguma evidência (1 Meta, 564 Tintim; 0 últimos sinais Tintim com base `provider_timestamp`). Privileges e `search_path` conferidos. Nenhuma mudança no Supabase Gestão.
- `lib/crm-triagem.ts`: classificação fail-closed de proveniência e horário (só marca `official_matching` quando coincide com último inbound CRM dentro de 2 minutos); ordenação para inspeção humana dando mais valor ao produto declarado que a mero evento Meta de um número de teste; URL `wa.me` **sem `?text=`** validada para a equipe abrir o número no WhatsApp.
- `components/admin-crm-panel.tsx`: coleta a RPC opcional, degrada como `Origem não verificada` se indisponível; mostra fonte por contato e contagem de eventos alinhados no resumo; permite abrir número para **inspecionar** (sem envio/registro/consentimento); confirma antes de registrar que a loja respondeu, que o cliente respondeu ou que existe autorização comercial expressa. O histórico pode não estar no aparelho se não estiver conectado à conta correta.
- `components/admin-crm-panel.css`: refinamentos responsivos dos novos elementos.
- `tests/crm-triagem-evidencias-20261115.test.mjs`: evidência, segurança da RPC, timestamp, ordenação, URL sem mensagem e UI sem disparo.
- Testes legados atualizados somente para reconhecer os novos rótulos de lembrete e confirmação humana, não para abrandar as verificações.

## Testes e pacote
- Workflow CRM: [run 43722699911](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/43722699911), **925/925 regressões comerciais**, 7/7 testes iniciais CRM, checagem TypeScript CRM e build frontend aprovados no commit `d8cd7f160dcf939d5de23d7e296e48d91189f664`.
- Workflow de build do core: [run 43722692780](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/43722692780), arquivo `CRM_CORE_NOT_PUBLISH_COMMIT` SHA `d8cd7f160`, sem publicação automática.
- Compilação reconciliada offline com fotos do ZIP V4.7.14.3 já verificado, sem geração de fotografias.
- Arquivo de homologação: `LUCIANE_CRM_TRIAGEM_EVIDENCIAS_V47143_CANDIDATO_NAO_PUBLICAR_20261115.zip`
- **SHA256:** `dc5878fabf4d83a0743069135052c152f7591b034c111c7c5801607aaae1099d`.
- **Tamanho:** 16.073.976 bytes; **187 arquivos**; **157 mídias** byte-a-byte idênticas ao ZIP candidato anterior; **15 JS** aprovados via `node --check`; **36 imagens referenciadas** presentes; 14 referências HTML/CSS e 15 entradas do manifesto Vite, ZIP CRC íntegro.
- Como os arquivos de mídia não estão todos versionados no GitHub, um build isolado do repo **não deve** ser publicado em lugar do pacote consolidado. Preservar ZIP histórico como origem binária.

## Limites e próximos gates
- **Não publicado este novo ZIP**. Não houve mensagem WhatsApp, opt-in artificial, venda, pedido, preço/estoque, Edge de pedidos, CAPI ou financeiro alterado.
- Operação atual do CRM ainda é **somente assistida** e exige confirmação de consentimento comercial válido, janela, prova de mensagem/horário, estoque e compra. Não habilitar automação para o backlog.
- O atalho `wa.me/<numero>` abre o aplicativo sem texto; ele **não comprova envio**, não prova histórico carregado e não autoriza campanhas.
- Falta homologar a nova interface com login staff em Safari iPhone e realizar um teste **manual** de ponta a ponta com número próprio/autorizado, incluindo "já respondi" → lembrete 45 min → verificação elegível; não falsificar timestamps nem consentimentos.
- Para tornar follow-up comercial operacional em escala: projetar mecanismo de **opt-in explícito, voluntário, não pré-selecionado e auditável**, e obter timestamp confiável do provedor/Meta; não usar contrato de compra como autorização automática.
- Este é um incremento do ciclo 1; não representa ativação dos disparos automáticos.
