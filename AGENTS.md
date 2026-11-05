# Luciane Oliveira Doces — entrada oficial de agentes e continuidade (05/11/2026)

> **LEITURA OBRIGATÓRIA ANTES DE QUALQUER IMPLEMENTAÇÃO.** Este é o site comercial + `/admin` + `/pedido`, **não** Luciane Gestão. O histórico contém centenas de alterações e diversas branches: `main` pode estar muito atrás, um ZIP não substitui o repositório e uma CI aprovada não é deployment. A documentação histórica continua válida como **origem de decisões locais**, não como indicador universal do HEAD atual.

## Ordem de leitura

1. [Prompt Mestre Comercial](docs/continuidade/PROMPT-MESTRE-COMERCIAL.md) — visão, qualidade, método e regras permanentes.
2. [Memória de Decisões](docs/continuidade/MEMORIA-DE-DECISOES.md) — por que cada decisão foi tomada e o que **não** refazer.
3. [Referência Visual e UX](docs/continuidade/REFERENCIA-VISUAL-UX.md) — fotos, proporções, composições e experiências **aprovadas**; diferenciar aprovação histórica de nova preferência.
4. [Matriz de Impacto Comercial](docs/continuidade/MATRIZ-DE-IMPACTO-COMERCIAL.md) — dependências produto → SKU/preço/estoque → carrinho/checkout → backend/pedido/WhatsApp → admin/cozinha/CRM; **testar proporcionalmente ao risco**.
5. [Checkpoint Vivo](docs/continuidade/CHECKPOINT-VIVO.md) — último SHA de código comprovado, branch, CI, riscos, produção não comprovada e ponto de retomada.

**Depois** consulte `ESTADO_ATUAL_VITRINE.md`, `docs/ESTADO_INTEGRADO_COMERCIAL.md` e demais documentos históricos **somente da área afetada**. A prioridade operacional é a **tarefa atual do usuário**. Não escolher por conta própria produto, categoria ou refinamento. Não exigir que o proprietário reenvie conversas arquivadas quando o estado já está documentado.

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
