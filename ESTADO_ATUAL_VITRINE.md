# LUCIANE OLIVEIRA DOCES — ESTADO ATUAL DA VITRINE (LEITURA OBRIGATÓRIA)

**Atualizado em 14/10/2026 após aprovação visual no Safari do iPhone.**

> Fonte única de verdade para continuar os refinamentos fotográficos e editoriais do site comercial.
> Ler este arquivo e conferir o HEAD remoto da branch **antes** de qualquer mudança. Não tomar o ZIP mais recente por base de código e não recomeçar em versões v8/v9/v10 antigas.

## Projeto correto
- Repositório: `railanzera-cloud/luciane-oliveira-doces-site`.
- Branch de trabalho aprovada para refinamentos editoriais: `design/luciane-editorial-vitrine-experiment-20261013`.
- **Último checkpoint funcional visual aprovado:** `5abb4c5236fc7147972c7ab9cc5f58e5fc227732` (**v10.7**).
- CI do checkpoint funcional: [GitHub Actions 38525796504](https://github.com/railanzera-cloud/luciane-oliveira-doces-site/actions/runs/38525796504), resultado **success**.
- Site comercial: https://lucianeoliveiradoces.pages.dev/ .
- A branch `main` é distinta e **não recebeu automaticamente a v10.7**; publicação/merge exige autorização específica.
- O projeto Boutique 4.6 e o Luciane Gestão são independentes. Não alterar branches, Supabase ou arquivos desses trabalhos.

## Estado visual aprovado — NÃO REGREDIR
- **Pipocas Gourmet:** fotografia real **já aprovada pelo usuário em print no Safari às 04:10 de 14/10**. Arquivo definitivo `public/images/categoria-pipocas-editorial-enquadrada-v107.webp` usado pela home. O alias `public/images/categoria-pipocas-editorial-clara.webp` contém a mesma fotografia (fallback). Foto natural sobre fundo cappuccino, pote grande, laterais preservadas, com respiro sutil acima da tampa e abaixo da base. **Não regenerar por IA e não substituir sem solicitação específica.**
- **Fatias Artesanais:** arquivo `public/images/categoria-fatias-editorial.webp` é a fotografia real original aprovada, sem faixas/molduras bege artificiais. Não regenerar nem mudar o corte sem pedido expresso.
- **Cartões:** composição editorial com foto à esquerda, informações à direita, painéis chocolate profundo, cobre discreto, sombras contidas e layout mobile. Preservar as proporções e o enquadramento aprovado.
- **Pipocas Crocantes:** campanha própria, distinta dos potes Gourmet. Data **quinta-feira 15/10/2026** na comunicação e regra interna. `app/limited-cup-release.ts` define `launchDayStart: "2026-10-15T00:00:00-03:00"`; em `app/page.tsx` a chamada mostra `15/10` e `Estreia quinta`. O calendário NÃO libera pedidos automaticamente: as flags de integração comercial, aprovação da loja e estoque precisam continuar protegidas, salvo nova instrução.
- **Navegação:** Pipocas Gourmet rola suavemente ao configurador; edição limitada conserva proteção especial de salto seguro no Safari, sem venda antecipada. Barra flutuante, checkout e atendimento existentes preservados.
- Não alterar catálogo, preços, carrinho, entrega/retirada, WhatsApp, Meta Pixel/CAPI, Tintim, Mercado Pago, Supabase, administrativo nem disponibilidade por conta de trabalho estético.

## REGRA PERMANENTE SOLICITADA PELO RESPONSÁVEL — SALVAR NO GITHUB
1. **Toda alteração concluída e validada neste projeto precisa ser salva no GitHub na branch de trabalho correta por um commit/checkpoint antes da entrega.** Não deixar correções apenas dentro de um ZIP compilado.
2. Antes de trabalhar, verificar `HEAD`, branch, diff relevante e o arquivo afetado; preservar trabalho existente e evitar sobrescrever commits posteriores.
3. Fazer a menor alteração necessária. Não recriar produto real/fotografia quando a tarefa é usar ou reposicionar uma imagem já enviada. Versionar também **arquivos binários reais** usados pelo site.
4. Executar testes focados, checar TypeScript/build/CI conforme a área afetada; informar resultados honestamente. Se falhar, preservar checkpoint seguro e não declarar conclusão.
5. Gerar **ZIP de Cloudflare Pages** a partir da **mesma revisão commitada e validada**; conferir presença de `index.html`, `admin/index.html`, recursos fotográficos, CRC do ZIP e referências do bundle. Entregar o link ao usuário em cada atualização.
6. Informar no final: branch, **SHA exato do commit**, link GitHub, testes, ZIP e se a publicação foi realizada. A regra padrão é **não publicar em produção** e **não mexer na main** sem autorização explícita.
7. Depois de cada implementação relevante, atualizar este arquivo com o **último checkpoint funcional aprovado**, mudanças, verificações e pendências; não apagar decisões anteriores. Quando a aprovação visual depender do Safari físico, registrar esse status.
8. Se a conexão/limites de ferramenta impedirem commit ou ZIP, avisar claramente que o trabalho está pendente e não apresentar um ZIP diferente do GitHub como versão oficial.

## Próxima conversa
Abrir **este arquivo primeiro**, conferir o HEAD remoto atual de `design/luciane-editorial-vitrine-experiment-20261013`, e partir do último checkpoint aprovado. O commit `5abb4c5236fc7147972c7ab9cc5f58e5fc227732` é a referência funcional atual nesta data; commits posteriores podem conter apenas atualizações documentais. Não inferir que `main` ou o domínio publicado correspondem a essa branch.

## Fluxo de entrega
**Alteração solicitada → editar branch correta → validar → commitar no GitHub → gerar ZIP do mesmo commit → conferir no iPhone (quando visual) → publicar só com autorização.**
