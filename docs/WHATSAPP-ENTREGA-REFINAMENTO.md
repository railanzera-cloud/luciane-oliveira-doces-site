# WhatsApp e local de entrega — refinamento incremental

Base: `2bf1ebb4e3dae231e8cac61930b2e9e6b2eafdc6`.

## Alterações

- Pix: somente a frase final passa a **Vou fazer o Pix e enviar o comprovante por aqui.** Negrito, chave, titular e total preservados.
- Crédito na mensagem registrada: **Crédito à vista**, sem `(1x)`. Débito e dinheiro preservados, assim como **Acréscimo já incluído no total.** Nenhuma modalidade volta a incluir URL de acompanhamento.
- Seleção de entrega: **Onde será a entrega?** A lista, sua ordem e todas as tarifas permanecem intactas.
- A estrutura existente já utiliza o nome da localidade específica como bairro e oculta o campo manual. Foi preservada e testada para todos os locais cadastrados.
- Dentro da cidade mantém o Bairro obrigatório. Se o texto corresponder exatamente ao nome de uma localidade específica após normalização de acentos, caixa e espaços, a finalização é bloqueada com orientação para selecionar a opção tarifária correta. A tarifa não é trocada automaticamente.
- A orientação aparece junto ao Bairro, com associação acessível ao campo, e no feedback final. CTA principal e barra mobile retornam à seleção de entrega, inclusive ao trocar de retirada para entrega com dados já preenchidos.
- A comparação é compartilhada entre frontend e servidor, sem fuzzy matching ou inferências sobre textos diferentes. Bairros comuns continuam com a tarifa da cidade.

## Arquivos alterados

- `app/order-checkout.ts`: duas copies da mensagem registrada.
- `app/page.tsx`: label da seleção, validação, orientação e destino da navegação para corrigir conflito.
- `supabase/functions/_shared/commerce-catalog.mjs`: comparação compartilhada e rejeição da combinação conflitante em `quoteFulfillment`.
- `tests/menu-refinement.test.mjs`: novas copies; localidades, variações, formulário real, bloqueio, barra mobile, requisição/valores/WhatsApp e recálculo.
- `tests/checkout-tracking-message.test.mjs`: atualização da frase Pix esperada.
- `docs/WHATSAPP-ENTREGA-REFINAMENTO.md`: entrega e ativação.

Sem migration. Sem alterações no código de `create-whatsapp-order/index.ts`, mas essa Function precisa ser republicada com a dependência compartilhada atualizada para proteger também solicitações diretas ao servidor. `create-order` também importa o mesmo arquivo no código local; não é necessário reabrir ou publicar o fluxo online nesta rodada. Os demais endpoints e dependências financeiras permanecem intactos.

## Validação local

```sh
node --test tests/menu-refinement.test.mjs tests/checkout-tracking-message.test.mjs tests/receipt-card.test.mjs tests/home-last-order.test.mjs tests/order-details.test.mjs tests/order-final-refinements.test.mjs
node --test --test-name-pattern='parity|catalog|server calculates pickup' tests/phase2-backend.test.mjs
npm run package:cloudflare:production
```

123 testes passaram (121 na bateria direcionada e 2 de paridade/entrega do backend). Build e empacotamento comercial aprovados. Os testes exercitam o código real com fixtures locais; não criam pedidos nem consultam ou alteram o Supabase remoto. A integração com persistência é verificada pela composição da requisição e cotação usada pelo endpoint, sem afirmar homologação remota de banco.

Cobertura: todas as tarifas/localidades; normalização conservadora; endereço sem repetição; Pix, dinheiro, crédito e débito; entrega e retirada; totais da mensagem e requisição; alterações de carrinho/local/pagamento; rejeição no backend; idempotência existente; copies/URLs; regressão de detalhes, home e administração. Não foram executados testes financeiros online do Mercado Pago.

Safari/iPhone e navegador interno do Instagram exigem homologação visual no dispositivo, em Preview. Não foram testados fisicamente nesta execução.

## Ordem segura de ativação manual

1. Guardar o ZIP comercial e o backend atualmente publicados para eventual reversão. Nenhum dado histórico precisa ser modificado.
2. Publicar **somente `create-whatsapp-order`**, levando `supabase/functions/create-whatsapp-order/index.ts` e os dois arquivos em `_shared` do pacote backend desta entrega. O índice e a regra de cartão são os atuais, sem alterações; o arquivo atualizado é `commerce-catalog.mjs`. Manter as configurações e credenciais existentes. Não aplicar SQL.
3. Pelo processo manual já utilizado (ou CLI, no diretório extraído com autenticação existente):
   ```sh
   supabase functions deploy create-whatsapp-order --project-ref edqiwvccmboyayojvuea --no-verify-jwt
   ```
   **Este comando é uma instrução para ativação posterior; não foi executado.**
4. Validar o backend atualizado antes de promover frontend: uma solicitação nova com cidade + Acaizal deve receber rejeição `invalid_order` com orientação de local específico, sem criar pedido; cidade + Centro e seleção Açaizal devem continuar válidas. Pedidos antigos e reenvios idempotentes já registrados permanecem preservados.
5. Carregar o ZIP comercial no **Cloudflare Preview**, mantendo a produção atual.
6. No iPhone/Safari e navegador interno do Instagram, testar:
   - Cidade + bairro comum → R$8 e Bairro visível.
   - Cidade + `acaizal`, `AÇAIZAL` e espaços → orientação, sem finalizar nem mudar silenciosamente a taxa; CTA/barra retorna à entrega.
   - Selecionar Açaizal → R$10, sem Bairro manual; rua/número/complemento/referência preservados.
   - Outro local, retirada, mudança de pagamento e carrinho → totais atualizados.
   - Conferir pedido registrado/painel/WhatsApp: mesmo local, taxa e total; pagamento segue manual.
   - Pix com a frase nova; crédito sem `(1x)`; débito/dinheiro preservados; nenhuma URL de pedido na nova mensagem.
7. Promover o frontend somente após essa homologação e autorização.

Nenhuma publicação GitHub, Cloudflare ou Supabase foi realizada. O pacote backend inclui apenas a Function necessária, suas dependências e configuração para publicação individual. A página `/pedido`, tokens e links antigos continuam preservados.
