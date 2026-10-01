# Clareza da seleção de local de entrega

Refinamento incremental a partir de `c32c8f1ac8bec53dfe08374fb20b33d89042357e`, com árvore limpa antes da alteração.

## Mudanças

- Título: **Selecione seu bairro ou local de entrega**.
- Apoio discreto: **Selecione seu local para calcular a taxa de entrega.** Associado ao seletor por `aria-describedby`, sem novo card.
- Rótulo visível da opção `cidade`, inclusive no resumo: **Outro bairro dentro da cidade**. Identificador, catálogo interno, tarifa R$8, agrupamentos e ordem preservados.
- Campo manual: **Qual é o seu bairro?**, placeholder **Digite seu bairro**. A obrigatoriedade existente permanece restrita à opção genérica.
- A orientação de conflito no frontend cita o novo título. O validador e a mensagem original do backend não foram modificados.
- O texto selecionado pode ocupar até duas linhas para acomodar o rótulo maior no mobile. Altura de 48px, área de toque, dropdown e limite de rolagem existentes mantidos.

## Arquivos alterados

1. `app/page.tsx` — somente apresentação/copies da entrega.
2. `app/globals.css` — microcopy e quebra de linha do texto selecionado.
3. `tests/menu-refinement.test.mjs` — expectativas das copies e cobertura da apresentação.
4. `docs/ENTREGA-CLAREZA-SELECAO-LOCAL.md` — entrega e homologação.

## Testes

```sh
node --test tests/menu-refinement.test.mjs tests/checkout-tracking-message.test.mjs
npm run package:cloudflare:production
```

**93 testes passaram, sem falhas. Build e empacotamento comercial aprovados.**

Cobertura direcionada: título/apoio/opção genérica; bairro comum Promissão I com R$8; local específico com campo manual oculto; bloqueio de Acaizal e variações; todas as tarifas e localidades preservadas; troca para retirada e retorno à entrega; dados do endereço; valores coerentes da requisição/cotação/WhatsApp; barra mobile e navegação; regressão do checkout, Pix, dinheiro, crédito/débito, WhatsApp e rastreamento.

São testes locais com código real e fixtures. Não foram criados pedidos nem executadas consultas/mutações no Supabase remoto. Não houve teste físico em Safari/iPhone ou navegador interno do Instagram; a validação visual nesses ambientes fica para Preview.

## Homologação em Preview

1. Carregar o ZIP comercial desta entrega no Cloudflare Preview, preservando a produção atual. **Não precisa republicar Function nem aplicar migration.** O backend com proteção de localidade, já publicado, permanece o mesmo.
2. No iPhone/Safari e no navegador interno do Instagram, abrir Entrega e conferir título, apoio, lista longa e texto selecionado sem transbordamento.
3. Escolher **Outro bairro dentro da cidade — R$8**, digitar **Promissão I** e conferir campo manual e taxa R$8.
4. Digitar **Acaizal** nessa opção: conferir bloqueio e orientação para **Açaizal — R$10**, sem troca automática de tarifa.
5. Escolher **Açaizal — R$10**: conferir ausência de campo Bairro manual e permanência de rua/número/complemento/referência.
6. Alternar localidade específica, outro bairro e retirada; conferir valores atualizados, dados preservados e barra fixa funcionando.
7. Se fizer um pedido de teste, conferir a mesma taxa no registro e WhatsApp. Promover o frontend somente após homologação e autorização.

Nenhuma alteração de backend, banco, regras comerciais ou mensagem WhatsApp. Nenhuma publicação no GitHub, Cloudflare ou Supabase.
