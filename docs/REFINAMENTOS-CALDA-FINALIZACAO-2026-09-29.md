# Calda, finalização e navegação — 29/09/2026

Base incremental: b84fc245 → 24a29a5 → commit desta entrega. O usuário informou que as duas migrations e duas Functions anteriores já foram publicadas e que o pedido #1004 foi homologado parcialmente no Preview. Não repetir migrations anteriores.

## Implementado

- Indicadores: preservados filtros/contagens, com três tons discretos de marrom e contraste claro. Pedidos concluídos não contam como pendentes.
- Abas Pedidos/Disponibilidade: corrigida altura fixa menor que os botões, contêiner com altura automática e recorte arredondado, alvos de toque de 44 px, transição apenas de cor (140 ms) e movimento reduzido respeitado. Nenhuma lógica administrativa alterada.
- Atualizar: mantidas consultas existentes, spinner/texto/aria-busy, respostas antigas descartadas; trava síncrona evita chamadas manuais duplicadas por cliques consecutivos. Atualizações automáticas existentes preservadas.
- Áudio: preservado ajuste do checkpoint 24a29a5, autorização por gesto e reconhecimento de suspensão do contexto. Primeiro carregamento não toca para todos os pedidos antigos; novo pedido acionável toca uma vez. Usar Ver todos para monitorar toda a cozinha, sem filtro de número. iOS pode suspender áudio em segundo plano/bloqueio; retornar e reativar por toque. Não há push.
- Fatias: opções calda-chocolate (Com calda de chocolate) e sem-calda (Sem calda, por favor), sem mudança de preços. Escolha obrigatória no novo cardápio, sem seleção automática. Cada linha pode ter uma escolha independente; quantidade da mesma linha compartilha a personalização. Edição/restauração preserva a escolha. Carrinhos antigos sem escolha exigem editar a fatia. Opção antiga de ninho não é oferecida; a estrutura/histórico não foi excluída.
- Backend: apenas catálogo compartilhado aceita as duas escolhas e retorna os nomes autoritativos, sem taxa e sem novas chaves de disponibilidade. Opções desconhecidas, ninho ou ambas juntas são rejeitadas. Pedidos/carrinhos antigos sem opções continuam aceitos no backend para compatibilidade da transição; não é atribuída uma escolha fictícia. O novo frontend exige a escolha antes de adicionar/finalizar.
- Mensagem, registro, painel e acompanhamento reutilizam option_ids/option_names existentes. Sem mudança em número, token, endpoint, idempotência, Pix ou rastreamento.
- Finalização: ícone, saudação, número, resumo de total/pagamento, instrução curta, WhatsApp verde dominante e acompanhamento secundário. Pix completo e demais botões removidos somente desta tela. Acompanhamento conserva seus controles. Voltar ao cardápio encerra apenas a sessão registrada correspondente ao token, preservando o último link salvo e evitando retornar indefinidamente à finalização; não apaga outro carrinho em andamento.

## Arquivos

Frontend: app/catalog.ts, app/page.tsx, app/globals.css, app/pedido/page.tsx, components/admin-orders-panel.tsx, components/whatsapp-order-result.tsx.
Backend: supabase/functions/_shared/commerce-catalog.mjs.
Testes: tests/menu-refinement.test.mjs, tests/checkout-tracking-message.test.mjs, tests/order-final-refinements.test.mjs, tests/manual-orders.browser.mjs.

## Testes

68 testes direcionados aprovados (catálogo/checkout/mensagem, finalização renderizada nas três modalidades manuais, callbacks reais de atualização e áudio, cliques duplicados, opções autoritativas e rejeição de opções inválidas). Build comercial aprovado e git diff --check limpo. Não executados testes financeiros, instalação, migrations ou acesso a pedidos reais. Não declarar homologação mobile/Safari completa: a validação automatizada usa renderização e callbacks; o teste real no iPhone continua no Preview, incluindo aparência das abas, calda, botão WhatsApp, retorno ao cardápio e som.

## Ativação manual — sem execução automática

1. Não aplicar nenhuma migration. O backend anterior já está publicado conforme informado pelo usuário.
2. Republicar SOMENTE create-whatsapp-order com o arquivo compartilhado commerce-catalog.mjs desta entrega. O index.ts da Function é idêntico ao anterior, incluído no pacote para facilitar publicação. Manter verify_jwt=false e as verificações de origem/chave existentes. Não alterar segredos. Não republicar Functions financeiras ou public-order-status.
3. Validar a nova versão no Cloudflare Preview após atualizar a Function: duas fatias com escolhas diferentes, preço inalterado, nomes no WhatsApp/painel/acompanhamento, retorno ao cardápio, áudio ativado e estado de atualização.
4. Publicar o ZIP comercial manualmente após sua autorização/homologação. O backend deve preceder o frontend, pois a versão antiga da Function rejeita adicionais de fatia. A aceitação de itens legados sem opção mantém o frontend anterior funcional durante essa janela.
5. Rollback do frontend: ZIP anterior 24a29a5, mantendo backend compatível e dados dos pedidos. Não apagar pedidos nem reaplicar/resetar migrations.

Nenhuma publicação Cloudflare/Supabase foi feita nesta rodada. GitHub não atualizado nesta entrega: acesso de escrita via Git local indisponível na tentativa anterior; checkpoint completo entregue em bundle, sem force push.
