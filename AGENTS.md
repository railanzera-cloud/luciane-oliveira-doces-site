# Luciane Oliveira Doces — entrada oficial de agentes e continuidade (05/11/2026)

> **LEITURA OBRIGATÓRIA ANTES DE QUALQUER IMPLEMENTAÇÃO.** Este é o site comercial + `/admin` + `/pedido`, **não** Luciane Gestão. O histórico contém centenas de alterações e diversas branches: `main` pode estar muito atrás, um ZIP não substitui o repositório e uma CI aprovada não é deployment. A documentação histórica continua válida como **origem de decisões locais**, não como indicador universal do HEAD atual.

## Ordem de leitura

1. [Prompt Mestre Comercial](docs/continuidade/PROMPT-MESTRE-COMERCIAL.md) — visão, qualidade, método e regras permanentes.
2. [Memória de Decisões](docs/continuidade/MEMORIA-DE-DECISOES.md) — por que cada decisão foi tomada e o que **não** refazer.
3. [Referência Visual e UX](docs/continuidade/REFERENCIA-VISUAL-UX.md) — fotos, proporções, composições e experiências **aprovadas**; diferenciar aprovação histórica de nova preferência.
4. [Matriz de Impacto Comercial](docs/continuidade/MATRIZ-DE-IMPACTO-COMERCIAL.md) — dependências produto → SKU/preço/estoque → carrinho/checkout → backend/pedido/WhatsApp → admin/cozinha/CRM; **testar proporcionalmente ao risco**.
5. [Checkpoint Vivo](docs/continuidade/CHECKPOINT-VIVO.md) — último SHA de código comprovado, branch, CI, riscos, produção não comprovada e ponto de retomada.

**Depois** consulte `ESTADO_ATUAL_VITRINE.md`, `docs/ESTADO_INTEGRADO_COMERCIAL.md` e demais documentos históricos **somente da área afetada**. A prioridade operacional é a **tarefa atual do usuário**. Não escolher por conta própria produto, categoria ou refinamento. Não exigir que o proprietário reenvie conversas arquivadas quando o estado já está documentado.

## Base de desenvolvimento, publicação e release (12/11/2026)

> **Atualização de retomada (12/11):** o PR #37 foi **integrado sem conflitos** ao PR #36, agora a linha candidata consolidada está em `work/integracao-comercial-controlada-20261112` (merge `1b497c73be6ca181511984b489707f4a30b2a0be`), **sem merge em main**. O ZIP de código V4.6 (856 testes comerciais, WebKit) foi criado e seus hashes de assets correspondem à implantação de Produção `237b204c` exibida pelo proprietário; **o SHA-256 do ZIP não foi conferido no Cloudflare**. A Edge foi atualizada para **v38 ACTIVE**, agora com os Cascões antigos 18/18/20 e Natal 22, idêntica ao catálogo da V4.6. O gate continua `blocked` para homologação comercial real e confirmação integral do release. Não restaurar Edge/ZIP antigo separadamente. A suíte antiga de navegação que usava “Cones Trufados” foi corrigida para “Cascão Trufado” e a validação completa do PR #37 passou; confirmar novamente CI do HEAD de integração antes do corte. Os refrigerantes tiveram **direção UX aprovada** em D-C42, mas **não devem ser implementados antes de concluir este corte**. Não restaurar PRs #23/#24 automaticamente.



- **Leitura adicional obrigatória:** [Protocolo de Integração e Release](docs/continuidade/PROTOCOLO-DE-INTEGRACAO-E-RELEASE.md) e [Estado Estruturado de Release](docs/continuidade/ESTADO-DE-RELEASE.json). O JSON é um **snapshot datado**; nunca inferir situação ao vivo sem nova leitura.
- **Linha candidata atual (sem deploy):** `work/integracao-comercial-controlada-20261112` foi criada da V4.4 validada (`8df271026c11100afa726c9e4e276ee94d526f45`). Este SHA é referência de **código**, não de publicação. Um PR #34 paralelo de Cascões divergiu, por isso não fazer merge cego, rebase destrutivo ou cherry-pick em massa.
- **Contrato de prova:** registrar branch/HEAD, PR e CI; pacote final/hash/fotos; Edge/SQL/SKUs reais; deployment Cloudflare com ID/SHA; somente então decidir release. `main`, SHA mais novo, CI aprovada, ZIP e Cloudflare não são intercambiáveis.
- **Estado operacional atualizado em 12/11:** V4.6 está em Cloudflare Production `237b204c` identificada pela lista de assets, sem hash de ZIP verificado diretamente na plataforma. Edge `create-whatsapp-order` **v38 ACTIVE** tem os seis Cascões aos preços atuais e quatro Fatias de Chocottone R$22. v37 anterior foi preservada como referência de rollback no checkpoint #68. Verificar disponibilidade, homologação de WhatsApp/cozinha e Safari/Instagram físico antes de declarar release plenamente aceito.
- **Gate local:** `node scripts/check-commercial-release.mjs --preflight` verifica documentação; `--release` deve falhar enquanto existirem bloqueios. Este script é somente leitura e não substitui homologação física.
- Para novas conversas, ler os cinco documentos habituais **mais** os dois arquivos acima. Não promover a branch candidata à base de produção antes de conciliar Cloudflare, pacote e backend. Não recriar longos relatórios quando apenas um escopo mudou.

## Regras de engenharia, design e verdade

- **Comece pelo GitHub real:** HEADs/ancestry/PRs/diffs de branches relevantes. Compare implementações aprovadas não integradas. Verifique CI do SHA exato e versão de produção independente quando necessário. Não chamar `main`, a branch mais nova ou um ZIP antigo de versão publicada sem prova.
- **Não perder o “bom” visual:** a referência visual é o baseline das aprovações da área. Anotar o que se preserva e a melhoria desejada; comparar de fato antes/depois quando as capturas existirem; não declarar aprovação do usuário por passar em teste DOM.
- **Implementação de negócio vai até o fim:** adicionar Pipocas Trufadas não é apenas criar card. Cada sabor/tamanho/SKU/preço deve atravessar catálogo, disponibilidade, carrinho, pedido aceito pelo backend, WhatsApp/pagamento, painel, estoque e cozinha segundo os contratos atuais.
- **Não fabricar fatos:** foto real somente com fonte/autorizações, saldo físico, preço, peso, status de pagamento, consentimento, resultado financeiro, Purchase e mensagem enviada não podem ser presumidos.
- **Estado operacional ≠ pagamento:** pedido criado/aceito não garante Pix ou cartão; abrir WhatsApp não garante envio; `printed` não comprova papel; CRM não comprova venda.
- **Isolamento:** GitHub `railanzera-cloud/luciane-oliveira-doces-site`, Supabase COMERCIAL `edqiwvccmboyayojvuea`, Cloudflare `lucianeoliveiradoces.pages.dev`. Não tocar em `railanzera-cloud/luciane-gestao`, Supabase `cztafxixnfpliaygniuj` ou projetos de outros clientes.
- **Autorização:** implementar e testar código/documentação no escopo pedido; **SQL produtivo, Edge deploy, alteração de estoque/dados reais, eventos externos, envio de CRM, Cloudflare e merge em main** precisam do consentimento específico exigido pela mudança. Não remover guardas para facilitar um ZIP.
- **Qualidade:** testes proporcionais aos riscos, TypeScript/build e CI quando publicável, atenção ao iPhone Safari e navegador interno Instagram. WebKit automatizado ≠ Safari físico; pacote aprovado ≠ produção.

## Ritual de finalização de incremento

1. Citar base, branch, SHA e diff de arquivos; demonstrar o que a alteração melhora e que jornada ela não quebrou.
2. Registrar resultados de testes **executados no SHA**, prova visual, limites, SQL/Edge e estado real de deploy, com datas.
3. Atualizar `MEMORIA-DE-DECISOES.md` apenas ao adotar/reverter decisão importante; `REFERENCIA-VISUAL-UX.md` após refinamento visual aprovado; `MATRIZ-DE-IMPACTO-COMERCIAL.md` se surgir contrato novo; `CHECKPOINT-VIVO.md` em toda mudança significativa. Atualizar o Prompt Mestre só se alterar visão permanente.
4. Se uma feature publicável, gerar e conferir ZIP fiel ao SHA somente quando apropriado; **não** produzir um ZIP de site por alteração puramente documental.
5. Explicitar próximos passos concretos e bloqueios sem repetir etapas concluídas para simular progresso.

### Comando curto para uma nova conversa

> “Continue o projeto comercial Luciane Oliveira Doces. Leia `AGENTS.md` e os cinco documentos de `docs/continuidade/`, confirme o estado do GitHub e dos contratos necessários e execute minha próxima tarefa preservando o padrão visual aprovado, toda a jornada comercial e as melhorias já validadas.”

Se não houver ferramentas conectadas ao GitHub ou navegador exigido, informar o limite sem fingir inspeção. Se o usuário enviar **somente o Prompt Mestre**, reconhecer e aguardar uma tarefa concreta.

> **Estado pós-corte de preços (12/11):** Cloudflare painel Production mostra deployment `237b204c-d5a5-4d3a-a8e7-7bfc3d699cc0` e assets compilados compatíveis com V4.6. A Edge `create-whatsapp-order` foi corrigida para **v38 ACTIVE**, com catálogo igual ao código candidato (Cascões 18/18/20 + 3 novos a 20 + Natal 22). Isto **não** comprova envio real de WhatsApp, impressão ou equivalência criptográfica de ZIP, e `main` continua não integrada. `category_cones` e `category_natal` estavam `sold_out` na leitura remota; não alterar disponibilidade automaticamente. Consultar Checkpoint Vivo #68 e JSON de release; a feature de refrigerantes D-C42 permanece não implementada. Não realizar novo deploy sem analisar a produção atual.

