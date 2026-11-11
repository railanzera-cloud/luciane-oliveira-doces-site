import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const navigation = readFileSync(new URL("../lib/whatsapp-handoff-navigation.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const view = readFileSync(new URL("../components/whatsapp-order-result.tsx", import.meta.url), "utf8");
const tracking = readFileSync(new URL("../app/pedido/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(navigation, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
const exports = {};
new Function("exports", outputText)(exports);
const { navigateToWhatsAppHandoff } = exports;

test("tenta navegação direta para o Tintim exatamente uma vez e preserva mensagem/campanha", () => {
  const previousWindow = globalThis.window;
  const assignments = [];
  try {
    globalThis.window = { location: { assign: href => assignments.push(href) } };
    const url = "https://tintim.link/whatsapp/abc/def?text=Pedido%20%231753&tt_source=campanha";
    assert.equal(navigateToWhatsAppHandoff(url), true);
    assert.deepEqual(assignments, [url]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("fallback quando navegação for bloqueada: não tenta outro endereço e não recria pedido", () => {
  const previousWindow = globalThis.window;
  const assignments = [];
  try {
    globalThis.window = { location: { assign: href => {
      assignments.push(href);
      throw new Error("navegador bloqueou");
    } } };
    assert.equal(navigateToWhatsAppHandoff("https://tintim.link/whatsapp/abc/def?text=pedido"), false);
    assert.equal(assignments.length, 1);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
  assert.match(page, /setWhatsAppResult\(registered\)/);
  assert.match(page, /window\.sessionStorage\.setItem\(ORDER_STORAGE_KEY, JSON\.stringify\(\{ \.\.\.savedOrder, order: next, whatsappResult: registered \}\)\)/);
  assert.match(page, /navigateToWhatsAppHandoff\(registered\.whatsappUrl\)/);
  assert.equal((page.match(/navigateToWhatsAppHandoff\(registered\.whatsappUrl\)/g) ?? []).length, 1);
  assert.match(page, /if \(whatsappResult\) return <WhatsAppOrderResultView order=\{whatsappResult\} \/>/);
});

test("não navega para domínio falso, http ou sem mensagem preparada", () => {
  const previousWindow = globalThis.window;
  const calls = [];
  try {
    globalThis.window = { location: { assign: href => calls.push(href) } };
    for (const url of [
      "http://tintim.link/whatsapp/abc/def?text=oi",
      "https://tintim.link.evil.example/whatsapp/abc/def?text=oi",
      "https://tintim.link/other?text=oi",
      "https://tintim.link/whatsapp/abc/def",
      "https://tintim.link/whatsapp/abc/def?text=",
      "javascript:alert(1)",
    ]) assert.equal(navigateToWhatsAppHandoff(url), false, url);
    assert.deepEqual(calls, []);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("recuperação: não comemora registro e oferece apenas um botão principal", () => {
  assert.match(view, /FALTA UMA ETAPA/);
  assert.match(view, /Envie seu pedido pelo WhatsApp/);
  assert.match(view, /Ao abrir|Abra o WhatsApp e toque em Enviar/);
  assert.match(view, /Se já enviou a mensagem, não precisa repetir/);
  assert.doesNotMatch(view, /registrado!/i);
  assert.equal((view.match(/className="whatsapp-final-primary"/g) ?? []).length, 1);
  assert.match(view, /<details className="whatsapp-final-help">/);
  assert.match(css, /\.whatsapp-final-card\.is-handoff-pending/);
});

test("acompanhamento: registro da loja não é confirmação de envio da mensagem", () => {
  assert.match(tracking, /Estado do registro no site/);
  assert.match(tracking, /Registrado no sistema/);
  assert.match(tracking, /site não consegue verificar o envio da mensagem/);
  assert.match(tracking, /Se já enviou a mensagem, não precisa repetir/);
  assert.doesNotMatch(tracking, /"Recebido pela loja"/);
  assert.match(tracking, /readStoredWhatsAppHandoff\(token, order\.order_number\)/);
});
