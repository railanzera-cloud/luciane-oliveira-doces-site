# Pix e detalhes do pedido — 01/10/2026

Base: c763bbeaf745b41f82bb29d2f962b5d13b0b0431, árvore limpa antes da alteração.

## Resultado

- A orientação aprovada do Pix aparece junto ao CTA final apenas enquanto `payment === "pix"`; desaparece ao trocar a modalidade. O CTA e seu fluxo não mudaram.
- A mensagem do Pix destaca o próximo passo, repete o total real como “Valor a pagar”, usa a chave e o titular atuais e termina em primeira pessoa. O valor é o total já recebido da criação do pedido; nenhum cálculo novo foi introduzido.
- Nenhuma nova mensagem de Pix/dinheiro/crédito/débito contém o bloco de link do pedido. Cartão e dinheiro mantêm o texto anterior, exceto pela retirada desse bloco. O argumento de URL do construtor permanece compatível, mas não é renderizado no texto.
- Os atalhos do site usam “Ver pedido”, “Ver meu último pedido” e “Detalhes do pedido”. A tela de finalização não diz mais que o link estará na mensagem.
- A página individual mantém status, pagamento, itens, total, atualizar, copiar link e contato. Informa que status e pagamento refletem registros da loja e orienta a confirmar o andamento pelo WhatsApp. Não promete rastreamento em tempo real. A consulta e a atualização já existentes foram preservadas.
- A home exige token válido, status elegível e `created_at` dentro de seis horas. A duração está centralizada em `HOME_LAST_ORDER_WINDOW_MS`, em `lib/home-last-order.ts`. Ao completar seis horas, oculta o contêiner inteiro e remove apenas a referência local correspondente. Há revalidação no retorno à página. Cancelados/concluídos também são ocultados.
- O token e o pedido no banco não expiram por essa regra da home. A página e URLs antigas permanecem consultáveis. Uma resposta/temporizador de pedido antigo não apaga a referência de um pedido mais novo.

## Arquivos alterados

Frontend:

- `app/order-checkout.ts`
- `app/page.tsx`
- `app/pedido/page.tsx`
- `components/home-last-order.tsx`
- `components/site-order-result.tsx`
- `components/whatsapp-order-result.tsx`
- `lib/home-last-order.ts`

Testes e documentação:

- `tests/menu-refinement.test.mjs`
- `tests/home-last-order.test.mjs`
- `tests/checkout-tracking-message.test.mjs`
- `tests/order-details.test.mjs` (novo)
- `docs/HOME-ULTIMO-PEDIDO.md`
- `docs/PIX-DETALHES-PEDIDO.md` (este arquivo)

## Validação local

`node --test tests/menu-refinement.test.mjs tests/home-last-order.test.mjs tests/checkout-tracking-message.test.mjs tests/order-final-refinements.test.mjs tests/order-details.test.mjs`: 111 testes aprovados.

Cobertura: Pix entrega/retirada, valores e identificação do Pix, texto completo aprovado, primeira pessoa, ausência de URL nas modalidades, abertura via link Tintim com o texto preservado, personalizações/carrinho e navegação, idempotência/retry/cliques repetidos, consulta por token antigo, status/admin, dados renderizados na página individual, seis horas antes/no limite/depois, expiração por temporizador, token novo versus antigo, recuperação/reabertura, ausência do contêiner quando oculto e orientação condicional do Pix.

`npm run package:cloudflare:production`: build e ZIP comercial aprovados.

Não houve cadastro de pedido real, mudança de estado ou alteração de banco durante esses testes. As consultas e dados de backend usados nas verificações foram simulados. Safari/iPhone e navegador interno do Instagram precisam de homologação visual em Preview; não foram executados neste ambiente. Não houve nova instalação nem auditoria financeira.

## Homologação em Preview

1. Enviar o novo ZIP completo ao Cloudflare Preview, mantendo a produção atual até aprovação. Não há migration, Function ou configuração de backend para ativar nesta rodada.
2. Montar um pedido Pix com retirada e outro com entrega. Conferir a orientação junto ao CTA; alternar Pix/dinheiro/crédito/débito e verificar que o texto específico do Pix some imediatamente nas demais modalidades.
3. Abrir a mensagem WhatsApp de cada modalidade: número real, itens, endereço/taxa quando aplicável e valores devem permanecer corretos. Pix deve terminar no bloco de próxima ação com o total exato, chave e titular. Nenhuma modalidade deve ter URL do pedido. Enviar os pedidos de homologação combinados com a loja pelo procedimento normal.
4. Usar “Ver pedido” na tela de finalização. Conferir dados, contato, copiar link, atualização dos detalhes e a orientação sobre os registros manuais da loja. Abrir também uma URL antiga já emitida.
5. No mesmo navegador/origem, voltar à home: pedido elegível de menos de seis horas deve mostrar o bloco compacto. Sem referência, cancelado/concluído ou com mais de seis horas, não deve haver bloco nem espaço reservado. Para conferir pedido antigo sem interferir no último pedido atual, abrir seu link em outra sessão/dispositivo e voltar ao cardápio. Não alterar datas no Supabase.
6. Repetir a conferência de layout e ações em Safari/iPhone e no navegador interno do Instagram. Cada navegador/origem mantém sua própria referência local. Aprovar o Preview antes de publicar manualmente a produção.

Nenhum deploy, push, migration ou publicação de Function foi realizado. A operação administrativa, pagamentos, criação do pedido, atribuição e eventos foram preservados.
