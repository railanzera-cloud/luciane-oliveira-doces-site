# Finalização WhatsApp recuperável — 02/11/2026

## Escopo aprovado
Incidente observado em Safari/iPhone: o cliente registra o pedido, escolhe **Ver pedido** e pode ficar sem entender como enviar a mensagem original de finalização. A loja registra e aceita operacionalmente, mas isso não confirma Pix/receita nem prova envio de WhatsApp.

## Decisão
- A tela de registro passa a orientar uma única ação principal: **Abrir WhatsApp e enviar pedido**.
- A instrução muda com Pix manual, crédito, débito e dinheiro; valor total e modalidade vêm da resposta do pedido registrado, nunca de seleções antigas.
- O acompanhamento conserva status e detalhes; com forma manual pendente, oferece o **mesmo link Tintim da mensagem original** quando o token e o número do pedido correspondem à sessão do navegador.
- Sem sessão correspondente (outro dispositivo/aba), apresenta contato assistido que informa o número do pedido; **não afirma recuperar os itens ou a chave Pix**.
- Em caso de confirmação operacional com pagamento ainda pendente, o rótulo público é **Recebido pela loja**.
- **Voltar à finalização** preserva a sessão; só **Fazer outro pedido** a limpa para recomeçar.
- Não houve mudança no banco, criação de pedido, envio de mensagem, pagamento, impressão automática, estoques, webhooks ou configuração Tintim/Meta.

## Base e validação
Base conservadora verificada: `fix/gourmet-clareza-final-20261102` @ `9450c5ae83228b0866a0f931006f1b19d37a1eaf`, descendente da linha integrada de 2026-11-02. Branch de entrega: `work/finalizacao-whatsapp-recuperavel-20261102`. A produção Cloudflare permanece sem verificação de deployment.

Arquivos: `components/whatsapp-order-result.tsx`, `app/pedido/page.tsx`, `lib/whatsapp-finalization.ts`, `app/globals.css` e teste dedicado.
A comprovação de build, TypeScript, testes globais e pacote Cloudflare depende da execução de CI/ambiente de build; nunca considerar aprovada por registro documental.

## Homologação real necessária
- Em iPhone Safari e navegador interno do Instagram: Pix, crédito, débito e dinheiro; em especial retorno de **Ver pedido → Abrir WhatsApp e enviar pedido**, botão voltar e retorno após troca de apps.
- Repetir teste com token de sessão diferente/outro dispositivo para validar assistência em vez de links de outra compra.
- Garantir que abrir WhatsApp não marca pagamento, envia sozinho ou duplica comanda; conferir após publicação em Preview.
- Validar origem e parâmetros Tintim após a navegação real, sem afirmar entrega da mensagem.
- Não publicar Cloudflare, não mesclar main e não alterar Supabase sem autorização.
