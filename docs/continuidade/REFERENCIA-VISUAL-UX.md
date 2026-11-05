# Referência visual e UX — comercial
**Objetivo:** preservar a direção aprovada e permitir refinamentos reais, não congelar o design. Evidência histórica: `ESTADO_ATUAL_VITRINE.md`, `BOUTIQUE_EDITORIAL_PREVIEW_CONTINUIDADE.md` e branches específicas; confirmar arquivos no SHA usado.

## Direção editorial aprovada historicamente
- Marca artesanal sofisticada, superfícies chocolate/cappuccino, creme e cobre/dourado discreto; tipografia editorial, hierarquia nítida, fotografias reais dominantes, respiro proporcional, sombras contidas e CTA inequívoco.
- Na vitrine de 14/10, foram aprovadas fotografias reais de Pipocas Gourmet e Fatias Artesanais e seus enquadramentos; `public/images/categoria-pipocas-editorial-enquadrada-v107.webp` e `public/images/categoria-fatias-editorial.webp` são referências **daquela linha**, não licença para reverter refinos posteriores.
- Categorias e configuradores devem equilibrar foto, preço, escolhas e próxima ação. Evitar títulos repetidos, caixas decorativas, altura excessiva, instruções longas, CTA invisível na primeira dobra e rolagem que perde contexto.
- Refinos Gourmet posteriores trabalham rolagem contextual ao pote/tamanho/preço e primeira escolha de recheio; preservar a lógica efetivamente presente no branch escolhido.
- Checkout WhatsApp: recuperação clara, ação principal evidente, resumo fiel e mensagens condicionais ao pagamento; não usar microcopy que pareça confirmar pagamento ou envio.

## Critérios de comparação
1. Registrar a tela/fluxo de origem, SHA, viewport/navegador e problema observado (print, vídeo ou relato). Não inventar captura ou medição.
2. Formular objetivo observável: menos passos, clareza de CTA, foto legível, conteúdo visível, redução de redundância, retorno seguro ou velocidade.
3. Implementar respeitando fotos, dados e regras existentes. Verificar primeira dobra, scroll, toque, foco, teclado, acessibilidade, estados vazios/carregando/erro e responsividade.
4. Comparar **antes/depois** no mesmo fluxo e largura quando possível. Registrar evidência e status: aprovado pelo responsável, apenas candidato, ou aguardando Safari físico.
5. Registrar no `MEMORIA-DE-DECISOES.md` escolhas aprovadas e rejeitadas; atualizar aqui só padrões duradouros. Não supor que teste automatizado prova preferência estética.

## Preferências de colaboração
O responsável faz refinamentos frequentes e busca evolução perceptível da experiência, não “ajustinhos” cosméticos por padrão. Recomendar simplificação e reestruturação quando houver ganho claro; não adicionar elementos só para parecer premium. Questionar a proposta com base em legibilidade, hierarquia, conversão plausível, manutenção e custo. Diferenciar observação de hipótese de aumento de vendas.

## Referências de revisão por área
| Área | O que preservar/avaliar |
|---|---|
| Home/categorias | Fotos aprovadas, recorte, proporção, hierarquia, descoberta do produto e CTA |
| Gourmet | Etapas, preço pelo maior grupo, disponibilidade, scroll contextual e retorno |
| Trufadas | Sabores/tamanhos/SKUs, fotos reais, seletor compacto, estado esgotado vs loja fechada |
| Fatias | Foto e identidade reais, nomes claros, estoque/pré-reserva, fluxo de escolha |
| Carrinho/checkout | Resumo, edição sem perda, taxas e pagamento explícitos, próximo passo |
| WhatsApp/pedido | Mensagem correta, recuperação após abertura, distinção abrir/enviar |
| Admin/cozinha | Clareza operacional, status confiáveis, sem ações redundantes nem impressão incerta |

**Regra:** aprovação visual só existe quando houver evidência explícita; o restante é proposta ou implementação técnica.
