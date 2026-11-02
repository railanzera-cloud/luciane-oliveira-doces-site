# Vitrine de entrada · 02/11/2026

Base de continuidade: work/trufadas-ux-safari-20261101, `8caeb691b8da0cb50282106fe098548798528418`. A CI do pai funcional `61c41b26` passou. O commit seguinte registra o incidente da função create-whatsapp-order v25. O HTML da raiz pública coincidiu com o do pacote LUCIANE-SAFARI-UX-PUBLICAR.zip durante a inspeção. O ID do deployment não foi confirmado.

## Decisão de produto

A entrada anterior separava a apresentação de Trufadas das duas outras escolhas e colocava instruções, prazo e entrega antes da escolha. Isso é observável na ordem da página. O efeito sobre vendas não foi medido.

A direção A daria mais área a um lançamento, mas repetiria a prioridade permanente da entrada anterior sem uma fonte comercial que a justificasse. A direção B usa os mesmos três destinos em uma composição contínua. No telefone, a embalagem, o nome e a ação aparecem juntos. Em telas largas, as três alternativas ficam lado a lado. O prazo e a entrega vêm após a escolha. O título da categoria e seu configurador continuam sendo os destinos de cada ação.

## Navegação e operação

| Destino | Parâmetro de categoria |
| --- | --- |
| Pacotes com zíper | `?categoria=trufadas` |
| Potes recheados | `?categoria=pipocas` |
| Fatias | `?categoria=fatias` |

Links de histórico antigos de Trufadas continuam reconhecidos. A navegação altera somente a categoria e preserva UTMs, Tintim, fbclid e fragmento. Não há inferência de categoria a partir do nome da campanha. A vitrine lê a mesma disponibilidade do configurador. As imagens de 360 px derivam dos WebP já aprovados. Nenhuma migração, função ou configuração operacional integra esta intervenção.

## Reprodução e publicação manual

O workflow de preview executa o build, TypeScript, a suíte Node e a inspeção do ZIP. Para esta branch, também compila a base e compara os dois pacotes em Chromium e WebKit. O roteiro scripts/qa-vitrine.mjs utiliza dados sintéticos e intercepta tráfego externo. As capturas e medidas são artefatos separados do pacote publicável.

Conferir em iPhone físico o link da campanha dentro do Instagram, tocar nas três escolhas e voltar pelo navegador, sem concluir um pedido de teste em produção. Confirmar a identidade do deployment atual antes da publicação manual. Para reverter, restaurar aquele deployment no Pages. O rollback é de frontend e não inclui redeploy de Edge Functions ou restauração de banco.
