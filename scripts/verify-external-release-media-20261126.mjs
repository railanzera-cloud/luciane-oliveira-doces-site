// Usage: node scripts/verify-external-release-media-20261126.mjs <extracted final ZIP root>
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
const root=process.argv[2];
if(!root)throw Error("Informe a raiz extraída do ZIP FINAL, não o core.");
const contract=JSON.parse(await readFile(new URL("../docs/continuidade/MIDIAS-EXTERNAS-MASSA-BRANCA-20261126.json",import.meta.url),"utf8"));
for(const f of contract.files){
  const bytes=await readFile(path.join(root,f.path));
  assert.equal(bytes.length,f.bytes,f.path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),f.sha256,f.path);
}
console.log("Mídias externas obrigatórias: 3/3 verificadas.");
