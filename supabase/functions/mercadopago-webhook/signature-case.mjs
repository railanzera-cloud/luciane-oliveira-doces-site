/**
 * Validate Mercado Pago Orders notifications with canonical lowercase data.id,
 * retaining a cryptographically verified legacy original-case fallback.
 *
 * Never use this canonical value for API lookups, order identities or financial
 * state changes. Those keep the original URL data.id.
 */
export function validateOrdersNotificationSignature({
  xSignature,
  xRequestId,
  dataId,
  secret,
  validator,
}) {
  const canonicalDataId = dataId.toLowerCase();
  const input = { xSignature, xRequestId, secret };
  try {
    validator({ ...input, dataId: canonicalDataId });
    return "lowercase";
  } catch (error) {
    // Malformed/missing signatures and other SDK errors never get a fallback.
    // The original-case retry must still pass the actual HMAC validator.
    if (canonicalDataId === dataId || error?.reason !== "SignatureMismatch") {
      throw error;
    }
  }
  validator({ ...input, dataId });
  return "original";
}
