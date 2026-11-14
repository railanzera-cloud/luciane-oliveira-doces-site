import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = file => readFileSync(new URL("../"+file,import.meta.url),"utf8");
for (const name of ["create-whatsapp-order","public-order-status"]) {
  test(name+": aceita SOMENTE a origem canonica adicional e preserva os bloqueios",()=>{
    const source=read("supabase/functions/"+name+"/index.ts");
    assert.match(source,/\.add\("https:\/\/lucianeoliveiradoces\.com\.br"\)/);
    assert.match(source,/origin_not_allowed/);
    assert.match(source,/configured\?\.length \? configured : DEFAULT_ALLOWED_ORIGINS/);
    assert.doesNotMatch(source,/Access-Control-Allow-Origin"\]\s*=\s*"\*"/);
  });
}
