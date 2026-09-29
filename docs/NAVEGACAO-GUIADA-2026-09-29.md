# Navegação guiada — 29/09/2026

Base: 2b238241c975da1d17567d9cb8670d87a0d3ea4c. Mudanças exclusivamente frontend; Function e catálogo compartilhado anteriores permanecem intactos. O usuário informou que o backend da calda já foi republicado manualmente.

## Correções

- Selecionar sabor da fatia conduz à etapa 2, calda; escolher chocolate ou sem calda conduz à etapa 3, quantidade. Nenhuma escolha automática. Cards com rádio acessível, seleção marrom/dourada, indicador e área de toque confortável.
- Adicionar fatia nova preserva feedback e conduz ao recebimento ou à primeira etapa ainda pendente quando já houver dados. Editar continua retornando ao carrinho, sem perder personalização.
- Ordem de validação e rolagem: carrinho, recebimento, região/bairro/rua/número quando entrega, identificação e pagamento. Retirada segue à identificação ou pagamento conforme os dados existentes. Digitação não dispara rolagem automática.
- Botão inferior orienta escolher a calda quando faltar; mantém adição após a escolha. Não permite adicionar sem escolher.
- Novos destinos de rolagem agendados por requestAnimationFrame após renderização, com cancelamento ao mudar a solicitação; sem temporizadores fixos nesses destinos. Mantida rolagem suave e prefers-reduced-motion. Campos incompletos enquadram também o rótulo, sem abrir automaticamente o teclado.
- Espaçamento inferior e safe-area para barra mobile. Recebimento passa a etapa 4 também no fluxo de fatias.

## Arquivos e validação

app/page.tsx, app/globals.css, tests/menu-refinement.test.mjs, tests/order-building-ux.test.mjs e este documento.

75 testes direcionados aprovados: navegação por pendências, calda obrigatória, personalização/edição, foco acessível, regressão básica de pipocas, carrinho/mensagem e finalização. Build comercial aprovado. Não realizadas auditorias gerais, instalações ou testes financeiros. Não foi feita nova homologação real em Safari; conferir no Preview título/opções enquadrados, barra inferior, endereço e edição no iPhone. Gravações não estavam anexadas diretamente a esta mensagem; os sintomas detalhados pelo usuário orientaram a correção.

## Entrega

ZIP Cloudflare atualizado e bundle Git completo. Nenhuma migration, Function ou outra alteração de backend necessária. Nenhuma publicação no GitHub, Cloudflare ou Supabase realizada. Publicação e homologação do Preview ficam sob controle do usuário.
