import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Hashes Git SHA1 das imagens exatamente aprovadas, obtidos do ZIP de 01/11.
// Guardam composição, identidade de marca, qualidade e conteúdo das fotos.
// Não aceitar placeholders, uploads errados ou retestes que desativem a guarda.
const approved = {
  "public/images/pipocas-trufadas-ninho-20261101.webp":
    ["65563a3f1c193a1f2d2bef5c3d2a9b2c50fc7c98",206852],
  "public/images/pipocas-trufadas-pacoca-20261101.webp":
    ["92a7eeaf67c2090f366f112b184be824238ec827",214544],
  "public/images/pipocas-trufadas-coco-queimado-20261101.webp":
    ["e231c7b0b79d173db012018018d6c43bda02ee7f",201814],
  "public/fatia-coco-cremoso-morango.webp":
    ["18c43f8d099ae5220b2bfd65a98d14700bdcbddd",146390],
  "public/fatia-coco-cremoso-morango-card.webp":
    ["18c43f8d099ae5220b2bfd65a98d14700bdcbddd",146390],
};
const gitBlobSha=bytes=>createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
for (const [path,[expectedSha,expectedBytes]] of Object.entries(approved)) {
  test(`imagem aprovada e integra: ${path}`,()=>{
    const bytes=readFileSync(path);
    assert.equal(bytes.length,expectedBytes,`A fotografia ${path} mudou de tamanho ou nao e a aprovada`);
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
    assert.equal(gitBlobSha(bytes),expectedSha,`A fotografia ${path} nao corresponde a versao aprovada`);
  });
}
