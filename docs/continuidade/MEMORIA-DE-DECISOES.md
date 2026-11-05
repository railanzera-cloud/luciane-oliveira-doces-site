# Memória permanente de decisões — site comercial
Atualização inicial: 05/11/2026. **Decisões históricas extraídas de documentação e diretrizes fornecidas; verificar vigência no código e no deploy.** Não confundir registro de intenção com prova de publicação.

| ID | Decisão e motivo | Não fazer | Fonte/estado |
|---|---|---|---|
| C-01 | Continuidade por GitHub, não por transcrição de chat: evitar perda de contexto e regressões entre conversas | Recriar prompt integral a cada tarefa ou escolher `main` por hábito | Regra atual do responsável |
| C-02 | Design editorial artesanal: fotos reais aprovadas, composição proporcional, paleta chocolate/cappuccino/creme/cobre, mobile primeiro | Gerar novas fotos, alterar enquadramento aprovado ou empilhar componentes sem necessidade | `ESTADO_ATUAL_VITRINE.md` e aprovação visual histórica |
| C-03 | Refino visual e operação comercial são dimensões diferentes: aparência não pode alterar disponibilidade, estoque, preço ou pagamento | Ativar loja/produto por acidente | Contrato permanente |
| C-04 | Novos produtos/variantes são integrações ponta a ponta; SKU/IDs, preços, disponibilidade, carrinho, pedido, admin e cozinha devem concordar | Considerar “aparece na vitrine” como entrega completa | Erros relatados e contratos do catálogo |
| C-05 | Separar aceitação operacional de confirmação financeira e impressão física | Tratar `confirmed` como Pix aprovado, `printed` como papel emitido ou clique WA como envio | `docs/COZINHA-AUTOMATICA-CONTINUIDADE-20261017.md` |
| C-06 | Trufadas P/M/G têm nove SKUs planejados com estoque individual e migração controlada; a branch draft PR #4 não equivale a produção | Inventar gramagens M/G ou mapear “Cocada” automaticamente a “Coco Queimado” | `docs/ESTADO_INTEGRADO_COMERCIAL.md`; PR #4 |
| C-07 | Follow-up assistido depende de consentimento, produto confirmado, preflight, horário, revisão e ação humana; não equivale a disparo automático | Marcar interesse ou venda por sinal Tintim, ou abrir WhatsApp e registrar envio automaticamente | `docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md` |
| C-08 | Gourmet usa regra de maior grupo de recheio; preço promocional depende de condições comerciais reais | Somar adicionais por engano ou eternizar promoção temporária | `docs/ESTADO_INTEGRADO_COMERCIAL.md` |
| C-09 | Checkout WhatsApp precisa de recuperação e mensagens específicas por Pix, crédito, débito e dinheiro | Mensagem Pix para cartão; pedido duplicado ao retentar | `docs/ESTADO_INTEGRADO_COMERCIAL.md` |
| C-10 | QZ Tray/POS-58 exige elegibilidade, dedupe, retorno seguro e homologação física; impressão pode preceder confirmação de Pix manual conforme regra existente | Reimprimir automaticamente com resultado físico incerto | `docs/COZINHA-AUTOMATICA-CONTINUIDADE-20261017.md` |
| C-11 | Toda mudança publicável exige commit, testes e ZIP do mesmo SHA; Cloudflare ativo é estado separado | Chamar ZIP, branch e produção de “mesma versão” sem prova | `ESTADO_ATUAL_VITRINE.md` |
| C-12 | Isolamento absoluto: comercial `edqiwvccmboyayojvuea`, Gestão `cztafxixnfpliaygniuj` | Misturar migrações, dados, branches ou autorização | Prompt Mestre 4.0 fornecido pelo responsável |
| C-13 | Atualizações semanais podem redesenhar seções inteiras, mas devem manter referências visuais aprovadas e registrar por que a nova proposta é superior | Refazer soluções descartadas ou conservar uma tela inferior só por inércia | Direção atual do responsável |
| C-14 | Priorizar testes conforme dependências e risco; não auditar todo o produto a cada ajuste cosmético | Declarar homologação Safari físico por teste WebKit emulado | Direção atual do responsável |

## Como manter
Para cada decisão nova ou alterada: data, ID, contexto/problema, alternativas consideradas, decisão aprovada, justificativa, áreas impactadas, prova (branch/SHA/teste/print), restrições e eventual reversão. Não substituir aprovações do usuário por hipóteses de um agente. Se duas decisões conflitarem, registrar o conflito e solicitar apenas a escolha necessária. **Não apagar** histórico: marcar como superado e apontar sucessor.
