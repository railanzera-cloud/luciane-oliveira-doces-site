// Run on the operator's computer: node lod-cartao-local.mjs
// Tokenization only. No Orders/Payments API, backend requests, proxy, or secrets.
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicKey = "APP_USR-da60bbc8-ecf5-4c38-bbec-55b3a278a4b6";
const port = 8789;
export const page = String.raw`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Luciane — homologação de cartão</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#171717;color:#f5f5f5;font:16px/1.55 system-ui,sans-serif}main{max-width:680px;margin:32px auto;padding:24px}h1{font-size:27px}p{color:#d6d3d1}button,input,textarea{font:inherit}button{padding:12px 18px;border:0;border-radius:8px;background:#edc5b2;color:#221811;cursor:pointer}button:disabled{opacity:.5;cursor:default}label{display:block;margin:16px 0 6px}input,textarea{width:100%;padding:12px;border:1px solid #737373;border-radius:8px;background:#242424;color:white}#status{padding:16px;border:1px solid #737373;border-radius:8px;margin:18px 0}#brick{background:white;border-radius:10px;overflow:hidden;margin:18px 0}small{display:block;color:#c4c4c4}code{overflow-wrap:anywhere}a{color:#edc5b2}[hidden]{display:none!important}textarea{min-height:240px}
</style></head><body><main>
<p>Luciane Oliveira Doces · ambiente local</p><h1>Verificar formulário de cartão</h1>
<p>Esta ferramenta usa a chave pública de teste existente. Os campos seguros são do Mercado Pago. Nenhum pedido ou pagamento é criado aqui.</p>
<p><strong>Primeira etapa:</strong> clique em Carregar formulário e devolva o resultado. Não preencha cartão nesta etapa.</p>
<label for="amount">Valor de referência do formulário (R$)</label><input id="amount" type="number" min="1" max="500" step="0.01" value="30">
<small>Valor apenas para inicializar o formulário; não confirma preço, disponibilidade ou cobrança.</small>
<button id="load" type="button" style="margin-top:18px">Carregar formulário</button>
<div id="status" role="status" aria-live="polite">Aguardando início.</div>
<div id="brick"></div>
<section id="next" hidden><p>Formulário carregado. Pare aqui e informe esse resultado.</p>
<details><summary>Etapa posterior: gerar token de teste</summary>
<p>Use esta etapa somente quando a requisição no backend estiver preparada. Token gerado não significa pagamento aprovado.</p>
<p>Use apenas os <a href="https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards" target="_blank" rel="noopener noreferrer">dados oficiais de teste</a>: Mastercard 5480 8328 0103 3311, validade 11/30, CVV 123, CPF 12345678909, e-mail test@testuser.com. Titular APRO para o cenário de aprovação ou OTHE para recusa. O resultado financeiro será verificado no backend.</p>
<button id="tokenMode" type="button">Habilitar geração de token de teste</button></details></section>
<section id="result" hidden><h2>Token gerado; pagamento não enviado</h2>
<p>Copie este JSON apenas para o testador autorizado do backend quando orientado. Não inclui número completo nem CVV. Não reutilize token consumido.</p>
<textarea id="output" readonly aria-label="JSON do cartão tokenizado"></textarea><button id="copy" type="button">Copiar JSON</button>
<small>O resultado fica somente nesta aba; fechar ou recarregar descarta o token.</small></section>
<p><small>Para encerrar, feche a aba e pressione Ctrl+C no terminal. Não é necessário entrar na conta Mercado Pago ou informar Access Token.</small></p>
</main><script>
'use strict';
const publicKey = ${JSON.stringify(publicKey)};
const byId = (id) => document.getElementById(id);
let controller;
let mp;
let used = false;
let sdkPromise;
function status(message) { byId('status').textContent = message; }
function loadSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('O SDK não respondeu em 20 segundos.')), 20000);
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => { clearTimeout(timer); window.MercadoPago ? resolve() : reject(new Error('SDK carregado sem inicialização.')); };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Não foi possível carregar o SDK neste navegador.')); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
async function render(tokenMode) {
  const amount = Number(byId('amount').value);
  if (!Number.isFinite(amount) || amount < 1 || amount > 500) throw new Error('Informe valor entre R$1 e R$500.');
  if (controller) { await controller.unmount(); controller = undefined; }
  byId('result').hidden = true;
  byId('output').value = '';
  used = false;
  status('Carregando campos seguros do Mercado Pago…');
  controller = await mp.bricks().create('cardPayment', 'brick', {
    initialization: { amount, payer: { email: 'test@testuser.com' } },
    customization: {
      visual: { hidePaymentButton: !tokenMode, texts: { formSubmit: 'Gerar token de teste' } },
      paymentMethods: { maxInstallments: 1 }
    },
    callbacks: {
      onReady: () => { status(tokenMode ? 'Modo de tokenização: preencha somente dados oficiais de teste.' : 'FORMULÁRIO CARREGADO — nenhum token ou pagamento criado.'); byId('next').hidden = false; },
      onError: (error) => {
        const cause = typeof error?.cause === 'string' ? error.cause : error?.cause?.code;
        status('ERRO DO FORMULÁRIO: ' + (typeof cause === 'string' ? cause.slice(0,160) : 'Falha nos campos seguros.'));
      },
      onSubmit: async (data, additional) => {
        if (!tokenMode || used) throw new Error('Tokenização não habilitada ou token já gerado nesta etapa.');
        const name = String(additional?.cardholderName || '').trim().toUpperCase();
        const lastFour = String(additional?.lastFourDigits || '');
        if (!['APRO','OTHE'].includes(name) || lastFour !== '3311'
          || data?.payer?.email !== 'test@testuser.com'
          || data?.payer?.identification?.type !== 'CPF'
          || String(data?.payer?.identification?.number).replace(/\D/g,'') !== '12345678909') {
          status('Use somente o cartão Mastercard e os dados oficiais de teste indicados acima. Nada foi enviado ao backend.');
          throw new Error('Dados diferentes do cenário de teste autorizado.');
        }
        if (typeof data.token !== 'string' || !data.token || typeof data.payment_method_id !== 'string'
          || !['credit_card','debit_card'].includes(additional?.paymentTypeId)
          || Number(data.installments) !== 1) throw new Error('Resposta de tokenização incompleta.');
        const card = { token: data.token, payment_method_id: data.payment_method_id,
          payment_type_id: additional.paymentTypeId, installments: 1,
          payer_email: 'test@testuser.com', identification: { type: 'CPF', number: '12345678909' } };
        used = true;
        byId('output').value = JSON.stringify(card, null, 2);
        byId('result').hidden = false;
        status('TOKEN GERADO (' + name + ') — nenhum pedido ou pagamento enviado.');
      }
    }
  });
}
byId('load').addEventListener('click', async () => {
  byId('load').disabled = true;
  status('Carregando SDK oficial…');
  try { await loadSdk(); mp = new window.MercadoPago(publicKey, { locale:'pt-BR' }); await render(false); byId('amount').disabled = true; }
  catch (error) { status('ERRO: ' + error.message + ' Recarregue a página antes de tentar novamente.'); }
});
byId('tokenMode').addEventListener('click', async () => {
  byId('tokenMode').disabled = true;
  try { await render(true); }
  catch (error) { status('ERRO: ' + error.message); }
});
byId('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(byId('output').value); byId('copy').textContent = 'JSON copiado'; }
  catch { byId('output').select(); status('Selecione e copie o JSON manualmente.'); }
});
</script></body></html>`;

export function createLocalServer() {
  return createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    if (req.headers.host !== '127.0.0.1:' + port) { res.writeHead(403); res.end('Host não autorizado.'); return; }
    if (req.method !== 'GET') { res.writeHead(405, { Allow:'GET' }); res.end(); return; }
    if (req.url !== '/') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });
    res.end(page);
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createLocalServer();
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? 'Porta 8789 ocupada. Encerre a execução anterior desta ferramenta.' : 'Não foi possível iniciar: ' + error.code);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log('Abra http://127.0.0.1:8789 no navegador deste computador. Encerrar: Ctrl+C.'));
}
