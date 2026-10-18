import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const code = await readFile(new URL("../lib/qz-security.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(code, {compilerOptions:{
  target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext,
}}).outputText;
const { installKitchenQzSecurity, validKitchenQzCertificate } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const cert = "-----BEGIN CERTIFICATE-----\nMIIBdummyCertificateTest\n-----END CERTIFICATE-----";
const signature = Buffer.from("simulated-qz-signature").toString("base64");

function fakeSecurity() {
  const result = { certificateCallback:null, signatureCallback:null, algorithm:null };
  return {
    result,
    setCertificatePromise: fn => { result.certificateCallback = fn; },
    setSignaturePromise: fn => { result.signatureCallback = fn; },
    setSignatureAlgorithm: value => { result.algorithm=value; },
  };
}

test("QZ certificado recebe resolve/reject diretamente, não função intermediária",()=>{
  const qz=fakeSecurity();
  installKitchenQzSecurity(qz,cert,async()=>signature);
  assert.equal(qz.result.certificateCallback.length,2);
  let certificateSent;
  const returned=qz.result.certificateCallback(value=>certificateSent=value,err=>{throw err;});
  assert.equal(returned,undefined);
  assert.equal(certificateSent,cert);
  assert.equal(qz.result.algorithm,"SHA512");
});
test("QZ assina o conteúdo exato e devolve base64", async()=>{
  const qz=fakeSecurity();let input;
  installKitchenQzSecurity(qz,cert,async req => {input=req;return signature;});
  const signer=qz.result.signatureCallback("QZ|string to sign");
  assert.equal(typeof signer,"function");
  await new Promise((resolve,reject)=>signer(value=>{
    try {assert.equal(value,signature);resolve();} catch(e){reject(e);}
  },reject));
  assert.equal(input,"QZ|string to sign");
});
test("certificado ausente, malformado ou chave privada não entram no handshake",()=>{
  for (const candidate of ["","123","-----BEGIN PRIVATE KEY-----secret-----END PRIVATE KEY-----"]) {
    assert.equal(validKitchenQzCertificate(candidate),false);
    const qz=fakeSecurity();
    assert.throws(()=>installKitchenQzSecurity(qz,candidate,async()=>signature),/Certificado/);
    assert.equal(qz.result.certificateCallback,null);
  }
});
test("falha no assinador e assinatura inválida rejeitam sem impressão anônima",async()=>{
  for (const sign of [async()=>"", async()=>{throw Error("backend signing failed");}]) {
    const qz=fakeSecurity(); installKitchenQzSecurity(qz,cert,sign);
    await assert.rejects(
      new Promise((resolve,reject)=>qz.result.signatureCallback("pedido")(resolve,reject)),
      /inválida|backend signing failed/,
    );
  }
});
test("QZ original usava sintaxe incorreta; a nova consulta certificado antes do websocket",async()=>{
  const qzCode=await readFile(new URL("../lib/qz-print-client.ts", import.meta.url),"utf8");
  const panel=await readFile(new URL("../components/admin-orders-panel.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(qzCode,/setCertificatePromise\(\(\) => \(resolve, reject\)/);
  assert.match(qzCode,/installKitchenQzSecurity\(qz\.security, certificate/);
  const idxCert=qzCode.indexOf('signedRequest(currentAccessToken, { action: "certificate" })');
  const idxConnect=qzCode.indexOf("qz.websocket.connect");
  assert.ok(idxCert>=0 && idxConnect>idxCert,"certificate must load before websocket");
  assert.match(qzCode,/currentAccessToken = accessToken/);
  assert.match(panel,/Modo Cozinha/);
  assert.match(panel,/Conectar impressão 58 mm/);
  assert.match(panel,/Ligar automático/);
  assert.match(panel,/Reconhecer aviso e parar som/);
});
