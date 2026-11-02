# Refinamento da vitrine premium — 02/11/2026

## Linha de base preservada
Revisão anterior homologada: `work/vitrine-premium-reconstrucao-20261102`, `ba36a520e930313d9193ad62e0ba0ca369d91f83`. A branch desta entrega é isolada. Não alterou `main`, Cloudflare de produção nem Supabase de produção.

## Resumo das decisões
- Mantém-se a atmosfera aprovada — chocolate, creme, cobre e fotografias reais, sem regressão à lista branca.
- A introdução foi simplificada para “Cardápio artesanal” e “Escolha seu doce.”, removendo duplicação de marca e subtítulo dispensável.
- O destaque Trufadas ficou mais baixo e ganhou equilíbrio de proporções com a vitrine Gourmet/Fatias. A prioridade é visual, não implica maior margem ou volume de vendas.
- A foto de Paçoca deixou de ser pseudo-elemento de CSS e passou a ser uma `<img>` real, separada da Ninho; cada foto ocupa uma metade da moldura, sem corte de elemento à direita. São os WebP já homologados, sem substituir ou gerar imagens de produtos.
- Botões dos cartões complementares receberam melhor respiro, alinhamento e espaço mínimo de toque.
- O bloco de entrega/preparo virou faixa discreta, mas mantém os mesmos dados operacionais e a regra de pedido no WhatsApp.
- O indicador `data-featured` é atribuído somente à Trufadas; se ela estiver ausente, Gourmet/Fatias não herdam acidentalmente o formato do destaque.
- Comportamento responsivo: mobile com dois cartões complementares a partir de 351 px, alternativa empilhada para telas estreitas, desktop e foco de teclado. Movimentos reduzidos respeitados.

## Operação protegida
Nenhuma alteração de IDs, variantes, preços, catálogo, reserva, baixa, checkout, Edge Function, Pix, CRM, Meta/CAPI, Tintim, cozinha/QZ ou painel. O preço inicial das Trufadas continua derivado do catálogo. O hotfix `create-whatsapp-order` v25 permanece externo ao ZIP Cloudflare e NÃO deve ser redeployado.

## Validação
O workflow `.github/workflows/design-boutique-preview.yml` compila Next, confere TypeScript, executa todos os testes, verifica a estrutura do ZIP e compara navegadores Chromium e WebKit em 320, 375, 390, 430 e 1440 px. Compara a nova revisão ao commit base `ba36a520`, preservando evidências de antes/depois.

As fotografias secundárias devem carregar como imagens independentes, seus quadros devem caber integralmente no painel sem vazamento lateral, os botões não podem ter overflow, e a navegação de campanha com UTMs/fbclid e estados de estoque deve continuar válida. Navegador automatizado não substitui teste em iPhone físico.

## Entrega
Somente ZIP de Cloudflare correspondente ao commit aprovado pela CI. Publicação manual, sem deploy direto; rollback restaurando o deployment anterior do Cloudflare Pages.
