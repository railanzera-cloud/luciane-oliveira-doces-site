# Chamada comercial — Últimas fatias de 31/10/2026

## Briefing real
Segundo o gestor, às aproximadamente 17h54 (America/Belem), sobravam **5 fatias de Chocolate com Morango** e **5 fatias de Prestígio**. A loja venderia até aproximadamente **20h**. O nome "presunto" foi interpretado como Prestígio pelo contexto do catálogo; confirmar em caso de divergência.

## Experiência criada
- Somente na categoria **Fatias Artesanais**, entre 00h e 19h59 de **31/10**, no horário de Paragominas. Nenhum banner em Pipocas, amanhã ou depois das 20h.
- Card destacado, premium e mobile-first, abaixo de "Escolha sua fatia": "ÚLTIMAS FATIAS DE HOJE", "Seu sabor favorito ainda dá tempo.", mensagem sobre escassez verdadeira e dois botões diretos com **R$22 Chocolate com Morango** e **R$20 Prestígio**, alimentados pelo catálogo.
- Botões selecionam sabor e levam à calda; fluxo normal de quantidade, checkout, Meta Pixel, pagamento e WhatsApp inalterado. Cards destacados com "Últimas de hoje".
- Proteções: somente disponibilidade real carregada do Supabase, loja aberta, categoria Fatias, sabor marcado disponível, sem modalidade de pré-reserva ativa. Um sabor esgotado é removido da campanha; ambos esgotados removem banner. A campanha termina automaticamente às 20h, com relógio local calculado para America/Belem. React atualiza a janela a cada 30s e quando a aba recebe foco.

## Integridade do estoque e transparência
- A operação atual de fatias é **manual** no banco: não existe contador transacional para baixar cada fatia ao registrar pedidos. Por isso a vitrine **não** fixa o número "5" como saldo permanente. Mensagem: "nas últimas unidades", "Pedidos até 20h ou enquanto houver disponibilidade". Nenhuma popularidade ou venda atribuída falsamente.
- Quando um sabor acabar, a Luciane/gestor precisa mudar sua disponibilidade para `sold_out` em Painel → Disponibilidade. A página já recarrega o status em intervalos de 30 s.
- O prazo até 20h é uma **janela de comunicação**, não altera `orders_open`: após 20h a loja precisa fechar pelo painel caso deseje interromper pedidos.
- Nunca usar escassez artificial ou cronômetro que reinicia. Não inventar números de pedidos ou depoimentos.

## Implantação
Branch isolada a partir da versão comercial publicada em 31/10: `feature/pre-reserva-chocolate-morango-31102026` @ `c803cf95713dcc544318b7b23bf970e5bebec1ca`. Código **não** inclui a branch não publicada da correção de reimpressão `fix/cozinha-reimpressao-e-diagnostico-20261031` para evitar deploy incidental.
Submeter build, TypeScript, testes e ZIP de Cloudflare. Sem alterações de Supabase/produção, pagamentos, pedidos, impressão, público, checkout ou CRM. Publicação apenas pelo operador.
