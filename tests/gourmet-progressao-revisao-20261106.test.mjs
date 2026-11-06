import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteCartItems } from "../supabase/functions/_shared/commerce-catalog.mjs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/gourmet-steps.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const today = Date.parse("2026-11-06T15:00:00-03:00");
const item = (size, optionIds, quantity = 1) => ({
  product_id: "pipoca-gourmet", variant_id: size, option_ids: optionIds, quantity,
});

test("resumo Gourmet tem remoção direta, consciente, acessível e escopada aos sabores atuais", () => {
  assert.match(page, /className="boutique-flavor-summary gourmet-combination-review"/);
  assert.match(page, /role="group" aria-label="Revisar os sabores escolhidos"/);
  assert.match(page, /popcornOptionIds\.map\(optionId => \{/);
  assert.match(page, /className="gourmet-removable-tag"/);
  assert.match(page, /onClick=\{\(\) => togglePopcornOption\(flavor\)\}/);
  assert.match(page, /aria-label=\{\x60Remover \$\{flavor\.name\} da combinação\x60\}/);
  assert.match(page, /<X size=\{14\} strokeWidth=\{2\} aria-hidden="true"/);
  assert.match(page, /className="gourmet-combination-size"/);
  assert.doesNotMatch(page, /onClick=\{\(\) => setPopcornOptionIds\(\[\]\)\}/);
});

test("progresso visual usa o limite real do tamanho sem substituir as escolhas existentes", () => {
  assert.match(page, /className="gourmet-flavor-progress"/);
  assert.match(page, /Array\.from\(\{ length: popcornMaxOptions \}/);
  assert.match(page, /index < popcornOptionIds\.length \? "is-filled" : ""/);
  assert.match(page, /popcornMaxOptions = popcornVariant\?\.maxOptions \?\? 0/);
  assert.match(page, /<RadioGroup className="size-grid"/);
  assert.match(page, /const limitDisabled = popcornLimitReached && !selected/);
  assert.match(page, /const disabled = waitingForSize \|\| \(!available && !selected\) \|\| limitDisabled/);
  assert.match(page, /setPopcornOptionIds\(\(current\) => \{/);
  assert.match(page, /current\.filter\(\(id\) => id !== option\.id\)/);
  assert.match(page, /requestScroll\("gourmet-quantity-action"\)/);
});

test("editando combinação, o contrato de grupo máximo e quantidade permanece intacto", () => {
  const cases = [
    [["leitinho"], 2500],
    [["leitinho", "kinder-bueno"], 3000],
    [["leitinho", "nutella"], 3300],
    [["leitinho", "nutella"], 6600, 2],
    [["leitinho", "nutella", "kinder-bueno"], 5800, 1, "1l"],
  ];
  for (const [flavors, cents, quantity = 1, size = "500ml"] of cases) {
    assert.equal(quoteCartItems([item(size, flavors, quantity)], today).subtotalCents, cents,
      `combinação ${flavors.join(",")} ${size} ×${quantity}`);
  }
  assert.throws(() => quoteCartItems([item("500ml", ["leitinho", "nutella", "kinder-bueno"])], today),
    /sabores|limite|opç|exced|inválid/i);
});

test("acabamento premium mantém contraste, toque, foco e acessibilidade a movimento reduzido", () => {
  assert.match(layout, /import "\.\/gourmet-steps\.css";/);
  assert.match(css, /#sabores \.gourmet-flavor-progress-track/);
  assert.match(css, /#sabores \.gourmet-removable-tag/);
  assert.match(css, /min-height: 43px/);
  assert.match(css, /gourmet-removable-tag:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /#carrinho \.gourmet-/);
});
