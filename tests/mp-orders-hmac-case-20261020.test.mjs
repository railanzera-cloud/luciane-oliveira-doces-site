import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { validateOrdersNotificationSignature } from "../supabase/functions/mercadopago-webhook/signature-case.mjs";

const dataId = "ORDTST01ABC0123XY9Z";
const requestId = "65e21862-c3be-44ed-b001-e49bc89d715e";
const secret = "synthetic-unit-test-secret-only";
const ts = "1792510000";
const signed = (id, key = secret, rid = requestId) =>
  `ts=${ts},v1=${createHmac("sha256", key).update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex")}`;

function fakeSdk() {
  const seen = [];
  const validator = ({ xSignature, xRequestId, dataId: id, secret: key }) => {
    seen.push(id);
    if (!xSignature) throw Object.assign(new Error("missing"), { reason: "MissingSignatureHeader" });
    const match = xSignature.match(/\bv1=([0-9a-f]{64})/);
    if (!match) throw Object.assign(new Error("malformed"), { reason: "MalformedSignatureHeader" });
    const actual = createHmac("sha256", key)
      .update(`id:${id};request-id:${xRequestId};ts:${ts};`).digest("hex");
    if (!timingSafeEqual(Buffer.from(actual), Buffer.from(match[1]))) {
      throw Object.assign(new Error("mismatch"), { reason: "SignatureMismatch" });
    }
  };
  return { validator, seen };
}
const check = (validator, xSignature, rest = {}) =>
  validateOrdersNotificationSignature({ xSignature, xRequestId: requestId, dataId, secret, validator, ...rest });

test("canonical lowercase HMAC is accepted, original ID unchanged", () => {
  const { validator, seen } = fakeSdk();
  const original = dataId;
  assert.equal(check(validator, signed(dataId.toLowerCase())), "lowercase");
  assert.deepEqual(seen, [dataId.toLowerCase()]);
  assert.equal(dataId, original);
});

test("previous genuine original-case HMAC remains accepted only after full verification", () => {
  const { validator, seen } = fakeSdk();
  assert.equal(check(validator, signed(dataId)), "original");
  assert.deepEqual(seen, [dataId.toLowerCase(), dataId]);
});

test("wrong HMAC never becomes an accepted notification", () => {
  const { validator, seen } = fakeSdk();
  assert.throws(() => check(validator, signed(dataId, "wrong-key")), { reason: "SignatureMismatch" });
  assert.equal(seen.length, 2);
});

test("wrong webhook secret does not validate either variant", () => {
  const { validator } = fakeSdk();
  assert.throws(() => check(validator, signed(dataId.toLowerCase()), { secret: "wrong-configured-secret" }),
    { reason: "SignatureMismatch" });
});

test("missing signature is rejected without retries", () => {
  const { validator, seen } = fakeSdk();
  assert.throws(() => check(validator, null), { reason: "MissingSignatureHeader" });
  assert.equal(seen.length, 1);
});

test("malformed signature is rejected without retries", () => {
  const { validator, seen } = fakeSdk();
  assert.throws(() => check(validator, "invalid"), { reason: "MalformedSignatureHeader" });
  assert.equal(seen.length, 1);
});

test("modified x-request-id cannot pass HMAC", () => {
  const { validator } = fakeSdk();
  assert.throws(() => check(validator, signed(dataId.toLowerCase(), secret, "other-request-id")),
    { reason: "SignatureMismatch" });
});

test("lowercase URL ID uses only one validator attempt", () => {
  const { validator, seen } = fakeSdk();
  assert.equal(check(validator, signed(dataId.toLowerCase()), { dataId: dataId.toLowerCase() }), "lowercase");
  assert.deepEqual(seen, [dataId.toLowerCase()]);
  assert.throws(() => check(validator, signed(dataId), { dataId: dataId.toLowerCase() }),
    { reason: "SignatureMismatch" });
  assert.equal(seen.length, 2);
});

test("handler preserves original case for API lookup, DB event key, and payment data", () => {
  const source = readFileSync(new URL("../supabase/functions/mercadopago-webhook/index.ts", import.meta.url), "utf8");
  assert.match(source, /validateOrdersNotificationSignature\(\{/);
  assert.match(source, /fetchAuthoritativeOrder\(dataId, accessToken\)/);
  assert.match(source, /p_mp_order_id: dataId/);
  assert.match(source, /p_provider_event_key: providerEventKey/);
  assert.match(source, /if \(environment !== "test"\)/);
  assert.match(source, /if \(applied.changed_to_paid === true\) triggerOrderEffects\(\)/);
});
