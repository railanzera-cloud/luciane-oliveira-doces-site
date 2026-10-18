# Cozinha automática + certificado QZ corretamente assinado

## Origem única
- Base: `1064a07eb43d7f0cb817b589bc38b5f512c9f19b`, versão completa com **Modo Cozinha** e diagnóstico QZ.
- Branch: `work/cozinha-completa-qz-assinado-20261017`.
- Entrega: único ZIP do Cloudflare Pages gerado pelo GitHub Actions, para evitar regressão por implantação de dois pacotes.
- Não misturar com `work/qz-certificado-corrigido-sem-automacao-20261017`, que se baseia no painel sem Modo Cozinha.

## Causa e correção
- O código anterior registrava erroneamente: `setCertificatePromise(() => (resolve, reject) => ...)`, em desacordo com a API oficial.
- Contrato oficial: `setCertificatePromise((resolve, reject) => ...)`, mas assinatura: `setSignaturePromise((request) => (resolve, reject) => ...)`. Referência: https://qz.io/docs/signing.
- Nova configuração em `lib/qz-security.ts` e `lib/qz-print-client.ts`: pré-consulta do **certificado público** à função `qz-sign`, validação do PEM, callback direto que retorna o certificado e assinatura SHA512 em callback separado. O token de sessão é atualizado nas reconexões.
- Nunca enviar `QZ_PRIVATE_KEY_PEM` ao navegador, nunca aceitar fallback anônimo, nunca desabilitar validação SSL/assinatura.
- Conserva limites de tempo: WebSocket QZ 20 s, consulta da impressora 15 s, consulta de assinatura 12 s, leitura da resposta 8 s.
- Testes do contrato de certificados, falhas e assinatura base64, mais testes completos da loja.

## O que fica intacto
- Controle **Modo Cozinha**, alerta persistente e reconhecimento, estoque, Trufadas, pedidos e faturamento, CRM/Tintim/Meta, Mercado Pago, compras online, QZ Tray local.
- O **Supabase já tem** a migração de cozinha instalada, não precisa reaplicá-la.
- **Banco agora:** `auto_mode_enabled=false`, desligado após rollback anterior. Publicar o ZIP por si só NÃO liga a aceitação automática: ela será ativada deliberadamente no painel, com a impressora correta já conectada. Isso impede que a publicação tenha efeitos sobre pedidos novos sem o operador perceber.
- Fila geral de impressão preservada. Backend `qz-sign` v7 e certificado existentes não alterados.

## Teste de homologação com Luciane
1. Enviar ao Cloudflare **somente** o ZIP desta branch. Atualizar o notebook Windows (`Ctrl+F5`) em `/admin`.
2. Manter **Modo automático desligado** inicialmente, mas deixar o QZ Tray ativo e a POS-58 conectada.
3. Clicar em **Conectar impressão 58 mm**, conferir se o nome correto `POS-58(copy of 1)` aparece. Ler a solicitação QZ; verificar se parou de aparecer `Anonymous`. Se aparecer outro nome ou site `Untrusted`, não marcar confiança permanente.
4. A correção do callback NÃO prova que o certificado seja confiável. A própria documentação QZ exige um certificado assinado por raiz reconhecida ou instalação da raiz própria, conforme configuração segura do Windows. Se persistir aviso `Untrusted`, fotografar os dados do certificado e conferir com QZ Site Manager antes de autorizar permanentemente.
5. Validar **uma comanda controlada**, com autorização da operadora. Nunca forçar pagamento para testar impressão.
6. Depois da validação de assinatura e impressão, ativar **Ligar automático** dentro do painel. Conferir uma impressão real autorizada com Pix manual ainda pendente; comanda identifica `PIX PENDENTE - CONFERIR` e o pedido não vira pago.
7. Para parar, usar **Desligar automático**; deixar fila conforme operação. Não publicar novamente o ZIP anterior nem instalar certificados não verificados.

## Estado de validação
- Código/testes e build devem passar na CI GitHub Actions antes de considerar o ZIP utilizável.
- A autenticação e a impressão silenciosa real só podem ser homologadas fisicamente no notebook Windows da Luciane. É incorreto prometer eliminação de todos os avisos QZ sem verificar a cadeia de confiança no cliente.
