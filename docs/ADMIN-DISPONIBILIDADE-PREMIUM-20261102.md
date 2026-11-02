# Luciane Oliveira Doces — Disponibilidade Premium (02/11/2026)

## Origem e separação
- Repositório comercial: `railanzera-cloud/luciane-oliveira-doces-site`.
- Base: `work/trufadas-experiencia-imersiva-20261102`, SHA `03bea74aac951578e74444c5e9bfeab43255cb22`, aprovada com 674 testes + Chromium/WebKit.
- Candidata administrativa: `work/admin-disponibilidade-premium-20261102`.
- Alterar somente a aba **Disponibilidade** e as apresentações de inventário, NÃO a página pública, pedidos, pagamento, CRM, cozinha ou Luciane Gestão.
- Sem migrations, sem Supabase real alterado, sem publicação Cloudflare, sem merge na main.

## Problema de operação encontrado
O RPC `admin_get_trufadas_pmg_inventory` devolve `total`, `reserved`, `available`, `enabled`, `version` e `shortages`. `available` é `max(total-reserved,0)` quando o SKU está habilitado, ou zero quando desabilitado. O RPC `admin_set_trufadas_pmg_inventory` recebe **total físico absoluto**, validado contra o número atual de reservas. A UI antiga obrigava a operadora a somar unidades comprometidas manualmente e mostrava nove formulários um abaixo do outro. A reserva não é comprovação de pagamento.

## Nova arquitetura de tela
1. Aba Disponibilidade com topo de estado geral da loja. Abaixo, navegação **Trufadas | Gourmet | Fatias**. Somente uma categoria aparece por vez; navegação compacta e acessível.
2. Configurações gerais de visibilidade ficam recolhidas por padrão. Aviso explícito: o controle do item `category_pipocas` afeta **Gourmet e Trufadas**, não apenas Gourmet. O controle `category_fatias` é independente.
3. Trufadas: **Ninho | Paçoca | Coco Queimado**; cada sabor apresenta três botões P/M/G com saldo e estado. Só uma combinação possui editor aberto. O operador informa **pacotes livres para novos pedidos**, e a interface calcula `p_total = free + reserved`. A contagem comprometida não é rotulada como venda paga.
4. Ao salvar, o frontend consulta o estoque pelo RPC de leitura antes da escrita e confere versão, reservas, estoque e flag. Se houver mudança detectada, recarrega e pede confirmação. A RPC de escrita conserva validações, locks e permissão autenticada. Estado de estoque pago/consumido continua de responsabilidade dos processos existentes.
5. Salvar é explícito; alterações não salvas são identificadas, podem ser descartadas, e navegação de categoria e atualização são bloqueadas até salvar ou descartar.
6. Gourmet: comandos compactos para tamanhos ou sabores, apenas um grupo exibido de cada vez, mantendo os três estados e seus mesmos IDs/updates.
7. Fatias: busca por nome e cartões compactos, mantendo o guard da pré-reserva de Chocolate com Morango. **Não** modifica contratos de reserva, caixa ou impressão.
8. Carregamento remoto ou erro bloqueia comandos gerais da loja e dos status até a leitura válida.

## Fórmula e exemplo operacional
- Um pacote físico + um comprometido = **zero** livres, logo não liberar outro pedido.
- Um pacote comprometido e mais um pronto para outro cliente: informar **1 livre**. O painel salva `p_total=2` (não é uma venda adicional).
- Se a loja geral estiver fechada ou um SKU estiver pausado, os pacotes prontos permanecem cadastrados mas não são vendáveis.
- Ao marcar pagamento, os processos existentes reconciliam os holds. A nova UI não antecipa pagamento nem baixa estoque fora do fluxo.

## Validação
- `npm run build`, `npx tsc --noEmit`, suíte `node --test` completa.
- Testes novos: `tests/admin-disponibilidade-premium-20261102.test.mjs`, matemática pura em `lib/trufadas-stock-calculation.mjs`.
- `scripts/qa-admin-disponibilidade.mjs` usa Supabase Auth e RPCs **simulados**, intercepta todo tráfego externo e testa Chromium + WebKit em 390px e 1440px, inclusive a soma de comprometidos, pausa por SKU e acesso às outras categorias.
- CI produz ZIP Cloudflare completo do SHA aprovado. Conferir o HEAD exato e o resultado da CI antes de enviar pacote. Browser automatizado não substitui teste em Safari físico e Instagram.

## Publicação
- Não publicar ou mesclar por iniciativa desta alteração; comparar o deployment ativo do Cloudflare com o SHA da branch candidata e preservar atualizações posteriores.
- Nenhuma alteração necessária no Supabase para a UI; as RPCs P/M/G precisam estar na produção como documentadas na implantação original.
- Rodar em homologação com pedidos pausados e estoque sintético; jamais fazer pedidos reais de teste sem autorização.
