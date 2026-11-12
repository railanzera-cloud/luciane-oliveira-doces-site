# Reconciliação objetiva de branches concorrentes — 12/11/2026

> Relatório de decisão **somente de engenharia/documentação**. Não é um merge nem prova de publicação. Origem: estado remoto GitHub consultado em 12/11, PRs #23, #24, #34 e #35 e diferenças entre branches.

## Base segura de desenvolvimento

- Cadeia aceita para continuidade **de código**: PR #31 → #32 (checkout WhatsApp) → #33 (Cascão/Natal) → #35 (V4.4 fotografias). HEAD V4.4 `8df271026c11100afa726c9e4e276ee94d526f45`.
- Branch de integração documental: `work/integracao-comercial-controlada-20261112`. Sucessora direta, sem regressões nos arquivos do site.
- `main` permanece intacta. Em 12/11, candidata estava ~1.247 commits à frente de `main`; **essa diferença histórica não revela qual pacote está na Cloudflare**.
- Nenhuma linha deve ser promovida à produção enquanto Cloudflare, binários, preço/Edge e banco não tiverem provas compatíveis.

## Matriz de classificação

| Trabalho | Comparação com V4.4 | Decisão | Prova/risco |
| --- | --- | --- | --- |
| PR #34 — `feat/cascao-novos-sabores-natal22-20261112` | Comparação PR #34 → V4.4: **diverged**, 46 commits à frente de PR #34 e 40 atrás; merge-base `d19f381f132f...`. | **Não integrar automaticamente.** Funcionalidade de três novos SKUs, troca de nome e Natal R$22 já existe na cadeia #33/#35. | O PR #34 alterna grade para 2×3 no mobile e usa texto “Ninho com Nutella e Chocottone”, diferentes da V4.4 e das escolhas atuais do proprietário. Antes de resgatar alguma mudança, demonstrar benefício, revisar teste visual e pedir decisão. |
| PR #23 — bebidas | V4.4 vs PR #23: **diverged** (149 à frente, 4 atrás; ancestral `9811b7cb2e48...`). | **Referência técnica, não release.** Manter bebidas desativadas até desenho atual de complementos aprovado. | Implementação anterior usava grande bloco 2×2 e foi suspensa por UX; fazer cherry-pick traria lógica e CSS de época anterior. |
| PR #24 — doces antes de bebidas | V4.4 vs PR #24: **diverged** (149 à frente, 13 atrás; ancestral `9811b7cb2e48...`). | **Reaproveitar aprendizados sobre hierarquia e scroll**, não reativar sua UI automaticamente. | Revisões propuseram grid compacto, ancoragem de scroll e prioridade a doces; conferir se a V4.4 atual já implementa equivalente antes de extrair trechos. |
| PR #35 — fotografias V4.4 | Descendente de PR #33, commit `8df271026c...`, 849 testes e WebKit. | **Referência de código já aprovada para refinamentos.** | BINÁRIOS aprovados adicionados apenas no ZIP final de 117 arquivos. Não confundir GitHub com pacote. |
| PR #36 — governança | Descendente de V4.4, **sem mudanças em arquivos comerciais/visuais**, testes de documento. | **Candidata de integração para futuras branches.** | Não autoriza deploy. |

## Itens exclusivos a tratar antes de encerrar PR #34

1. **Grade 2×3 em mobile:** preservar versão V4.4 até demonstrar ganho real; o proprietário ainda não aprovou mudança de grid. Registrar como alternativa de UX, não regressão automática.
2. **Nomenclatura de terceiro sabor:** V4.4 aprovada `Ninho Nutella e Chocotone`; PR #34 contém `Ninho com Nutella e Chocottone`. Não alterar contrato comercial somente pelo merge.
3. **Migrações com nomes diferentes:** PR #33 e PR #34 registram migrações alternativas para os **mesmos** SKUs. Nunca executar ambas cegamente ou reexecutar em produção sem comparar `public.menu_availability`.
4. **Fotos:** V4.4 exige as quatro fotografias novas com amostras ao fundo, trio na home e 11 WebPs adicionais; PR #34 possui versão anterior de imagens. Não substituir arquivos aprovados.
5. **Testes:** PR #34 pode conter assertions úteis, mas migrar somente testes compatíveis com o comportamento aprovado, isoladamente, com CI no novo SHA.

**Decisão pendente de revisão final:** classificar PR #34 como “substituído após preservar insights” e, então, fechar PR com comentário, **sem excluir branch**. Esta ação não foi executada aqui.

## Evidência de backend e produção, separadas

- Supabase comercial, 12/11: `create-whatsapp-order` **v36 ativa**, Natal `1699/1899`, três novos SKUs não aceitos na Edge; `category_cones` e SKUs novos disponíveis no banco. A cotação de código V4.4 prevê `2000/2200`. **Incompatibilidade confirmada.**
- O handler do código verifica `orders_open`, status das categorias/produtos em `menu_availability`, preço esperado com recotação e retorna `price_changed` em divergência; mesmo assim, sem saber qual frontend está publicado, não é seguro confiar em ausência de falha real.
- Cloudflare: ID do deployment, hash do ZIP e SHA publicado **não comprovados**. Consulta pública disponível não fornece manifesto confiável. Não afirmar V4.4 já publicado nem inferir a partir da captura de cliente.

**Próxima fase:** plano operacional separado com backout e janela de preço, sem disparar alterações produtivas nesta governança.
