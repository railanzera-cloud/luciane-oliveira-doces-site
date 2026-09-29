import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const messageSource = await readFile(new URL("../app/order-checkout.ts", import.meta.url), "utf8");
const navigation = await readFile(new URL("../app/menu-navigation.ts", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

function functionBody(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}`);
  const end = source.indexOf(`function ${nextFunctionName}`, start);
  assert.notEqual(start, -1, `Função ${functionName} não encontrada`);
  assert.notEqual(end, -1, `Limite após ${functionName} não encontrado`);
  return source.slice(start, end);
}

test("keeps simplified slices and explains the explicit WhatsApp send", () => {
  assert.match(page, /Sabores disponíveis/);
  assert.doesNotMatch(page, /calda|sauce/i);
  assert.match(page, /toque em enviar para encaminhar o pedido/);
  assert.match(page, /Registrar e continuar no WhatsApp/);
});

test("builds a clean payment-specific message with an order code", () => {
  assert.match(messageSource, /Olá! Finalizei meu pedido pelo cardápio da \*Luciane Oliveira Doces\*\./);
  for (const heading of ["RECEBIMENTO", "PAGAMENTO", "RESUMO"]) assert.ok(messageSource.includes(`*${heading}*`));
  assert.ok(messageSource.includes("*PEDIDO ${orderId}*"));
  assert.doesNotMatch(messageSource, /Segue para confirmação|USE APÓS A CONFIRMAÇÃO|Aguarde a confirmação da Luciane antes de pagar|Total estimado/);
  assert.match(messageSource, /Troco para:/);
  assert.match(messageSource, /Troco necessário:/);
});

test("preserves the exact Pix key and instructs payment inside WhatsApp", () => {
  assert.match(page, /holder: "Luciane Galvão de Oliveira"/);
  assert.match(page, /key: "03611974200"/);
  assert.match(page, /keyType: "CPF"/);
  assert.match(messageSource, /PRÓXIMO PASSO — PAGAMENTO PIX/);
  assert.match(messageSource, /Faça o pagamento e envie o comprovante nesta conversa/);
  assert.doesNotMatch(page, /Copiar Pix|clipboard\.writeText/);
});

test("uses only the Tintim Site Link with an encoded dynamic text parameter", () => {
  assert.match(
    page,
    /const TINTIM_SITE_LINK = "https:\/\/tintim\.link\/whatsapp\/2c956a42-229f-4d21-ade6-4442f8c048ed\/7522df92-bbe1-4bff-83ca-2629bba182eb"/,
  );
  assert.match(page, /\?text=\$\{encodeURIComponent\(message\)\}/);
  assert.doesNotMatch(page, /wa\.me|api\.whatsapp\.com/i);
});

test("routes both checkout CTAs through the same dispatcher and keeps one WhatsApp finalizer", () => {
  const finish = functionBody(page, "finishOnWhatsApp", "stickyBuilderAction");
  const builderAction = functionBody(page, "stickyBuilderAction", "handleStickyAction");
  const stickyAction = functionBody(page, "handleStickyAction", "handleFinalAction");
  const finalAction = functionBody(page, "handleFinalAction", "startAnother");

  assert.equal((page.match(/window\.location\.assign\(/g) ?? []).length, 0);
  assert.match(finish, /await createWhatsAppOrder\(/);
  assert.match(finish, /setWhatsAppResult\(registered\)/);
  assert.match(page, /className="whatsapp-button checkout-primary-button" onClick=\{handleFinalAction\}/);
  assert.match(page, /onClick=\{handleStickyAction\}/);
  assert.match(stickyAction, /if \(stickyUsesCheckoutAction\) handleFinalAction\(\)/);
  assert.match(stickyAction, /else stickyBuilderAction\(\)/);
  assert.match(finalAction, /if \(checkoutChannel === "whatsapp"\)/);
  assert.match(finalAction, /void finishOnWhatsApp\(\)/);
  assert.doesNotMatch(builderAction, /finishOnWhatsApp|tintimWhatsAppUrl|window\.location/);
  assert.equal((page.match(/tintimWhatsAppUrl\(/g) ?? []).length, 2);
  assert.doesNotMatch(page, /<a[^>]+href=\{tintimWhatsAppUrl/);
});

test("keeps one Meta Pixel base and the Tintim tracker", () => {
  assert.equal((layout.match(/fbq\('init', '1491655855979140'\)/g) ?? []).length, 1);
  assert.equal((layout.match(/fbq\('track', 'PageView'\)/g) ?? []).length, 1);
  assert.match(layout, /https:\/\/s\.tintim\.app\/static\/core\/tintim-1\.0\.js/);
  assert.match(layout, /window\.tt\.accountCode = '2c956a42-229f-4d21-ade6-4442f8c048ed'/);
  assert.equal((layout.match(/window\.location\.pathname === '\/admin'/g) ?? []).length, 2);
});

test("fires checkout and payment events only at their first real choices", () => {
  const fulfillment = functionBody(page, "chooseFulfillment", "choosePayment");
  const payment = functionBody(page, "choosePayment", "addOrUpdatePopcorn");
  const enterCheckout = functionBody(page, "enterCheckout", "chooseFulfillment");

  assert.match(fulfillment, /trackCheckoutStart\(\)/);
  assert.doesNotMatch(enterCheckout, /trackCheckoutStart\(\)/);
  assert.match(payment, /trackPaymentInfo\(paymentMethod\)/);
  assert.doesNotMatch(payment, /trackCheckoutStart\(\)/);
  assert.match(page, /checkoutStartedRef\.current/);
  assert.match(page, /paymentInfoTrackedRef\.current/);
  assert.match(page, /trackMetaEvent\("AddPaymentInfo"/);
  assert.match(page, /currency: "BRL"/);
  assert.match(page, /num_items:/);
});

test("does not send Contact or Purchase from the site", () => {
  assert.doesNotMatch(page, /trackMetaEvent\("(?:Contact|Purchase)"/);
  assert.doesNotMatch(layout, /fbq\('track', '(?:Contact|Purchase)'/);
});

test("preserves received campaign parameters when changing catalog category", () => {
  assert.match(navigation, /const url = new URL\(href\)/);
  assert.match(navigation, /`\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`/);
});
