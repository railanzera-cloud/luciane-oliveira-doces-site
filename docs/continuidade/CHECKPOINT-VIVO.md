# Checkpoint vivo — site comercial
**Data da fotografia:** 05/11/2026. Atualizar após cada incremento significativo. Este arquivo é um índice para verificar o remoto, não uma alegação de deploy.

## Estado comprovado na inspeção inicial
- Repo: `railanzera-cloud/luciane-oliveira-doces-site`.
- `main`: `26730be48be7f694ed92d9a23b0b8789bdbb7239` (linha histórica de outubro; **não presumir base de produção**).
- Base de leitura deste checkpoint documental: `work/gourmet-rolagem-contexto-premium-20261103` @ `62f7780c6d6ede5dceea9eba19212e67cd20f77a`. O SHA da branch documental deve ser consultado no remoto.
- PR #4 draft: `work/trufadas-variantes-pmg-20261101` @ `a8dddeec188c9a8d0865f8f35a97afb0ab80bd00`; PR #3 draft: `feature/pipocas-trufadas-pacotes-20261017` @ `c6115a8d18800249d65d92ea73c61f13a44dd6d2`. Não fazer merge implícito.
- Outras linhas independentes importantes: `work/finalizacao-whatsapp-recuperavel-20261102` @ `b6d7547dd2303f243ee95f38b3c10ec14c966191`; `work/followup-assistido-integrado-20261031` @ `f729cf5ab00633d6d564f101099ce8b76b364462`; `feature/pre-reserva-chocolate-morango-31102026` @ `c803cf95713dcc544318b7b23bf970e5bebec1ca`. Conferir HEADs novamente antes de usar.
- Docs históricos existentes: `ESTADO_ATUAL_VITRINE.md`, `BOUTIQUE_EDITORIAL_PREVIEW_CONTINUIDADE.md`, `docs/ESTADO_INTEGRADO_COMERCIAL.md`, `docs/CRM-ASSISTIDO-HOMOLOGACAO-20261031.md`, `docs/COZINHA-AUTOMATICA-CONTINUIDADE-20261017.md`. **Algumas seções históricas são superadas por seções mais recentes; nenhuma é fonte única do deploy.**

## Quatro estados que não podem ser confundidos
| Estado | Evidência exigida | Situação nesta fotografia |
|---|---|---|
| Código versionado | branch e SHA remoto | Múltiplas linhas verificadas acima |
| Código validado | CI/testes do SHA exato | Não inferir CI de documentação histórica; consultar checks |
| Pacote publicável | ZIP íntegro do mesmo SHA validado | **Não produzido nesta implantação documental** |
| Produção | Cloudflare deployment ID + assets/rotas/configuração conferidos | **Não comprovada** |

## Riscos / pendências reais
1. **Reconciliação de branches**: existe evolução paralela de UX Gourmet, Trufadas P/M/G, checkout WhatsApp, CRM, cozinha e pré-reserva. Não escolher “branch mais nova” como verdade única; construir mapa de ancestralidade/diff por tarefa e preservar contratos.
2. **Banco comercial**: migrations propostas não são prova de aplicação; Trufadas P/M/G requer confirmação do estado real, saldos, autorização e homologação operacional antes de ativação.
3. **Deploy e ZIP**: falta vincular a versão Cloudflare ativa ao código/artefato; não fazer publicação implícita.
4. **Validação visual**: screenshots e aprovações históricas são referência, mas não substituem homologação do layout candidato em Safari/iPhone e navegador interno do Instagram.
5. **CRM/cozinha**: não ativar envio, migrações, autoimpressão ou reimpressão sem verificação e autorização adequadas.

## Próxima tarefa concreta segura
Aguardar solicitação específica do responsável. Para o primeiro refinamento funcional/visual, verificar o código pertinente, confrontar `REFERENCIA-VISUAL-UX.md`, percorrer `MATRIZ-IMPACTO-COMERCIAL.md`, reconciliar apenas branches necessárias e executar com testes focados. **Não há feature escolhida automaticamente** por esta documentação.

## Protocolo de atualização
Após incremento: data, tarefa, branch base+SHA, branch candidata+SHA, diff, evidências de teste (comando/CI e status), comparação visual/decisão, migrations (propostas vs aplicadas), ZIP (se aplicável), Cloudflare (comprovado ou não), risco, bloqueio e próximo passo. Mover evidências superadas para histórico, sem apagá-las. Se CI do commit documental falhar, registrar e corrigir; não alegar verde antecipadamente.
