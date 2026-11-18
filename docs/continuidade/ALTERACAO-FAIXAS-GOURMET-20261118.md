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


## Implantação do backend — 18/11/2026 (posterior à preparação do ZIP)
- Proprietário autorizou a continuação e atualização das duas Edge Functions. Supabase comercial foi conferido com orders_open=false antes, durante e depois do procedimento.
- create-order: v38 -> **v39 ACTIVE**.
- create-whatsapp-order: v64 -> **v65 ACTIVE**.
- Em cada função, somente o arquivo commerce-catalog.mjs foi alterado: Ovomaltine grupo 1->2, Choco Cookies ao Leite grupo 2->1, CATALOG_VERSION atualizado para 2026-11-18.gourmet-ovomaltine-cookies-leite. Todos os outros arquivos, autenticação (verify_jwt=false), IDs, demais sabores, preços absolutos e integrações foram preservados.
- Snapshots exatos dos catálogos antigos no GitHub: docs/edge-release/rollback/20261118/create-order-v38-commerce-catalog.mjs e docs/edge-release/rollback/20261118/create-whatsapp-order-v64-commerce-catalog.mjs. Restore exige reimplantar o catálogo anterior em conjunto com os demais arquivos inalterados do bundle correspondente.
- Leitura posterior de ambas as funções comprovou código alterado, status ACTIVE e versões. Os oito sabores e as três tabelas de preço da vitrine e das duas Edges coincidem.
- O pacote Cloudflare V4.7.15.3 foi construído e auditado: SHA256 7393a8f5db1518b786c285b3fab9279eca27103a73773867a83e5de8bf7aa874, 115 arquivos reais incluindo 84 mídias; build/testes comerciais/WebKit/geração do ZIP verdes. Não foi publicado.
- **Pendência de publicação:** versão anterior V4.7.15.2 registrava 182 arquivos, dos quais 151 mídias. Apesar de o pacote novo ter todas as referências do build atual, a preservação integral de 67 mídias históricas adicionais não foi comprovada. O ZIP histórico LODC_SITE_V4_7_13_CAPA_CASCAO_APROVADA.zip foi localizado no acervo, mas sua leitura binária foi bloqueada nesta sessão. **Não publicar este ZIP como substituição integral sem reconciliação das mídias ou recuperação do pacote completo anterior.**
- orders_open continua false; não reabrir a loja antes da sincronização do site. Com o frontend antigo ainda no ar, reabrir antes da publicação poderia provocar price_changed em pedidos. Não houve SQL, deploy Cloudflare, merge main, alteração de disponibilidade, pedido real ou disparo.


## Evidência de deployment e WhatsApp encaminhada pelo usuário — 18/11/2026
- Capturas de tela do painel Cloudflare Pages da conta `lucianeoliveiradoces` mostram **deployment de produção com sucesso em 17/11/2026, às 7:49 AM (horário exibido pelo painel)**, com **179 arquivos carregados**.
- Identificador observado: `b5c4a65b-a7c3-4a2f-a7d4-66b8a32a4de6`.
- URL de deployment observada: `https://b5c4a65b.lucianeoliveiradoces.pages.dev`; domínio associado: `lucianeoliveiradoces.com.br`.
- A listagem visível das primeiras entradas inclui `.assetsignore`, `404.html`, `RELEASE-MANIFEST.json`, `coca-cola-220-card.webp`, `coca-cola-220.jpeg`, `coca-cola-350-card.webp` e `coca-cola-350.jpeg`, que **estão presentes** no ZIP candidato V4.7.15.3; contudo, a captura não expõe os 179 nomes e **não é um ZIP exportável**.
- A contagem entre o deployment mostrado (179 arquivos) e o ZIP candidato (115 arquivos reais) difere em 64 arquivos. A diferença de contagem **não prova necessariamente perda de 64 recursos** nem indica quais são, mas impede afirmar equivalência completa. Precisa do ZIP anterior ou do manifesto integral do deployment para conciliação rigorosa.
- A captura de WhatsApp mostra uma mensagem enviada "Teste de conexão" às 19:35, uma resposta da conta comercial às 19:36 e uma mensagem automática sobre o próximo horário de atendimento às 19:41. A aparência e o conteúdo são compatíveis com **mensagem de ausência do WhatsApp Business**; a imagem isoladamente não prova disparo de CRM, webhook echo ou evento de compra.
- Tentativas de consulta HTTP externa ao deployment e ao domínio oficial neste ambiente não obtiveram resposta utilizável; portanto nenhum conteúdo remoto foi extraído.
- A implantação exibida pode servir como referência de rollback, **desde que sua posição como versão anterior adequada seja verificada no painel no momento do corte**. Nenhuma publicação do frontend foi executada neste passo.
