import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("identificação jurídica usa dados do MEI informados e o domínio próprio", () => {
  const identity = read("lib/company-identity.ts");
  assert.match(identity, /69\.806\.739 LUCIANE GALVAO DE OLIVEIRA/);
  assert.match(identity, /69\.806\.739\/0001-91/);
  assert.match(identity, /contato@lucianeoliveiradoces\.com\.br/);
  assert.match(identity, /https:\/\/lucianeoliveiradoces\.com\.br/);
  assert.doesNotMatch(identity, /VINICIUS DE MORAES|68628320/);
});

test("rodapé mostra identidade oficial sem substituir navegação ou checkout", () => {
  const homepage = read("app/page.tsx");
  const footer = read("components/storefront-legal-footer.tsx");
  assert.match(homepage, /<StorefrontLegalFooter \/>/);
  assert.match(footer, /BUSINESS_IDENTITY\.legalName/);
  assert.match(footer, /BUSINESS_IDENTITY\.taxId/);
  assert.match(footer, /href="\/informacoes-da-empresa"/);
  assert.match(footer, /BUSINESS_IDENTITY\.email/);
});

test("página institucional é pública, possui metadata e apresenta dados comerciais", () => {
  const page = read("app/informacoes-da-empresa/page.tsx");
  const layout = read("app/layout.tsx");
  assert.match(page, /export const metadata: Metadata/);
  assert.match(page, /canonical: "https:\/\/lucianeoliveiradoces\.com\.br\/informacoes-da-empresa"/);
  assert.match(page, /Identificação jurídica/);
  assert.match(page, /Razão social \/ Nome empresarial/);
  assert.match(page, /Contato comercial/);
  assert.match(layout, /import "\.\/company-identity\.css"/);
});


test("empacotamento estático inclui a rota institucional completa", () => {
  const script = read("scripts/package-cloudflare.mjs");
  assert.match(script, /renderRoute\("\/informacoes-da-empresa", "\/?.*informacoes-da-empresa\/index\.html"\)/);
  assert.match(script, /"informacoes-da-empresa\/index\.html"/);
});
