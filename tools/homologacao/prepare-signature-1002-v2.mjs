import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export async function prepare(start, end) {
  const startMs = Date.parse(start), endMs = Date.parse(end);
  const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!utc.test(start ?? "") || !utc.test(end ?? "") || !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) || endMs - startMs !== 3600000) {
    throw new Error("Provide explicit UTC start/end timestamps exactly 60 minutes apart. No automatic renewal.");
  }
  const base = await readFile(new URL("../../supabase/functions/mercadopago-webhook/index.ts", import.meta.url), "utf8");
  if (createHash("sha256").update(base).digest("hex") !== "fbd3c94bd460d384179382a5edc94f91be5a31f485dc7b7691d2e5fe50f64b05") {
    throw new Error("Baseline changed; review the diff before preparing another candidate.");
  }
  const helper = (await readFile(new URL("./signature-1002-v2.ts.txt", import.meta.url), "utf8"))
    .replace('"__START_UTC__"', JSON.stringify(start)).replace('"__END_UTC__"', JSON.stringify(end));
  const anchor = '    if (!signature || !requestId || !dataId) {';
  const guard = `    // Observação restrita, sem qualquer efeito financeiro, inclusive se SDK válido.
    if (dataId === SIGNATURE_1002_ID && Date.now() >= Date.parse(SIGNATURE_1002_START) &&
        Date.now() < Date.parse(SIGNATURE_1002_END)) {
      return await observeSignature1002(request, url, dataId, signature, requestId, secret);
    }
`;
  if (base.split(anchor).length !== 2 || base.split("Deno.serve(").length !== 2) throw new Error("Unexpected baseline anchors");
  return base.replace("Deno.serve(", helper + "\nDeno.serve(").replace(anchor, guard + anchor);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , start, end, output] = process.argv;
  if (!output || !output.endsWith(".ts")) throw new Error("Usage: node prepare-signature-1002-v2.mjs START_UTC END_UTC OUTPUT.ts");
  if (resolve(output) === fileURLToPath(new URL("../../supabase/functions/mercadopago-webhook/index.ts", import.meta.url))) {
    throw new Error("Write a separate candidate; never overwrite the functional baseline implicitly.");
  }
  await writeFile(output, await prepare(start, end), { flag: "wx", mode: 0o600 });
  console.log("Candidate written; NOT deployed. No request sent. Window must be explicitly authorized.");
}
