# Pipocas Gourmet — troca de faixa Ovomaltine × Choco Cookies ao Leite (18/11/2026)

## Origem e decisão
Solicitação e autorização explícita do proprietário em 18/11/2026: preservar a tabela vigente das três faixas e trocar apenas o enquadramento dos recheios **Ovomaltine** e **Choco Cookies ao Leite (chocolate)**. O sabor **Choco Cookies Branco** é diferente e permanece na faixa 2. Leitinho e Nutella não mudam. O Choco Nute histórico permanece na faixa 1, sem liberação de disponibilidade.

| Item de Pipocas Gourmet | Faixa anterior | Nova faixa | 500 ml antes → depois |
| --- | ---: | ---: | --- |
| Leitinho | 1 | 1 | R$ 25 → R$ 25 |
| Choco Nute | 1 | 1 | R$ 25 → R$ 25 |
| Choco Cookies ao Leite (chocolate) | 2 | **1** | R$ 30 → **R$ 25** |
| Ovomaltine | 1 | **2** | R$ 25 → **R$ 30** |
| Kinder Bueno | 2 | 2 | R$ 30 → R$ 30 |
| Choco Cookies Branco | 2 | 2 | R$ 30 → R$ 30 |
| Crispy Bueno | 3 | 3 | R$ 33 → R$ 33 |
| Nutella | 3 | 3 | R$ 33 → R$ 33 |

Tabela inteira preservada:
- Faixa 1: R$ 25 / R$ 39 / R$ 49 (500 ml / 750 ml / 1 litro).
- Faixa 2: R$ 30 / R$ 45 / R$ 55.
- Faixa 3: R$ 33 / R$ 48 / R$ 58.

Combinações continuam valendo a **maior faixa** presente. Nenhum aumento aditivo nem alteração na quantidade máxima de sabores. Nomes, IDs técnicos, chaves de disponibilidade, categorias e preços de outros produtos permanecem inalterados.

## Alteração de código
- Base: PR #68, branch `refine/checkout-clareza-carrinho-20261116` @ `222797e89eabb513ba14790be52ee6ad169830f4`. Esta base já preserva PR #66 (cozinha POS-58/QZ), fotos versionadas do checkout e UX V4.7.15.2. PR #67 de CRM é **paralelo**, não incluído.
- Branch independente: `fix/gourmet-troca-ovomaltine-cookies-leite-20261118`.
- `app/catalog.ts`: troca `pricingGroup` dos dois IDs e os apresenta nos respectivos blocos de preço.
- `supabase/functions/_shared/commerce-catalog.mjs`: mesmas alterações nos valores autoritativos, com atualização explícita de `CATALOG_VERSION` para `2026-11-18.gourmet-ovomaltine-cookies-leite`.
- Testes: paridade frontend/backend, casos antigos corrigidos, nova suíte de todos os tamanhos e combinações.

## Estado e bloqueios de implantação
**Desenvolvimento em branch; NÃO publicado.** Sem merge na main, SQL produtivo, migração, alteração de disponibilidade, implantação de Edge, envio WhatsApp ou pedido real. A validação CI deve ser anexada ao PR após execução.

Leitura remota de 18/11/2026: categoria Pipocas disponível no cadastro, porém os sabores e o tamanho 500 ml consultados estavam com status `sold_out`. Não modificar esses estados implicitamente.

**Risco comercial de publicação parcial:** o frontend recalcula os preços, mas o checkout valida novamente no servidor via catálogo autoritativo. Assim, frontend novo com Edge antiga (ou Edge nova com frontend antigo) poderia mostrar preço distinto do valor aceito. Antes do corte, confirmar as funções consumidoras do catálogo compartilhado e implantar frontend e backend de maneira coordenada, apenas com autorização própria, testando pedidos dos três tamanhos, preços e combinações; preservar o deployment/versões anteriores para rollback conjunto. O ZIP candidato precisa partir da composição comprovada do PR #68, com as mídias aprovadas. Não publicar um build parcial do GitHub nem usar cache purge como substituto de validação.

## Homologação futura
Conferir em ambos os domínios os dois sabores e seus valores para 500 ml, 750 ml e 1 litro; checkout misto e mensagens de WhatsApp; comportamento de combinações de maior faixa; /admin, QZ e mídias intactos. A execução de testes unitários e CI não substitui a comprovação de publicação/recebimento de pedido.
