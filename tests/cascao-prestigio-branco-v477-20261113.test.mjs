import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CONES } from "../app/catalog.ts";
const catalog = await readFile(new URL("../app/catalog.ts",import.meta.url),"utf8");

test("Prestígio V4.7.7 usa somente a foto branca aprovada, sem alterar preço ou ID", () => {
  const prestige=CONES.find(p=>p.id==="cone-trufado-prestigio");
  assert.ok(prestige);
  assert.equal(prestige.name,"Prestígio");
  assert.equal(prestige.variants[0].price,18);
  assert.equal(prestige.image,"/images/cone-trufado-prestigio-20261113-v477.webp");
  assert.equal(prestige.cardImage,"/images/cone-trufado-prestigio-card-20261113-v477.webp");
  assert.match(prestige.imageAlt,/totalmente branco/);
  assert.match(prestige.imageAlt,/tampa branca/);
  const entry=catalog.split('id: "cone-trufado-prestigio"')[1].split("options: [],")[0];
  assert.ok(!entry.includes("prestigio-20261113-v475.webp"));
});

test("Prestígio mantém 6 SKUs e os outros cinco sabores/valores permanecem intactos",()=>{
  assert.deepEqual(CONES.map(p=>[p.id,p.variants[0].price]),[
    ["cone-trufado-prestigio",18],
    ["cone-trufado-dois-amores",18],
    ["cone-trufado-ferrero-rocher",20],
    ["cascao-trufado-kinder-bueno",20],
    ["cascao-trufado-ninho-morango",20],
    ["cascao-trufado-ninho-nutella-chocotone",20]
  ]);
  for (const [id,version] of [
    ["cone-trufado-dois-amores","v475"],
    ["cone-trufado-ferrero-rocher","v475"],
    ["cascao-trufado-kinder-bueno","v476"],
    ["cascao-trufado-ninho-morango","v475"],
    ["cascao-trufado-ninho-nutella-chocotone","v476"]
  ]) assert.match(CONES.find(p=>p.id===id).cardImage,new RegExp(version+"\\.webp$"));
});
