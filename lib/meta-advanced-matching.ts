/**
 * Manual Advanced Matching for the SINGLE, existing Meta Pixel.
 * No new tracking events. No PII in URLs, custom event payloads or storage.
 * Meta Pixel hashes init user parameters before transport.
 */
export const META_PIXEL_ID = "1491655855979140";

export type ManualMetaIdentity = {
  name?: string;
  email?: string;
  phone?: string;
};

export type ManualMetaCustomerData = {
  fn?: string;
  ln?: string;
  em?: string;
  ph?: string;
};

type PixelCall = ((...args: unknown[]) => void) | undefined;

function normalizedName(value: string): Pick<ManualMetaCustomerData, "fn" | "ln"> {
  if (!value || value.length > 100 || /\d/.test(value)) return {};
  const clean = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
  if (!/^[a-z]+(?:[ '-][a-z]+)*$/.test(clean) || clean.length < 2) return {};
  const parts = clean.split(" ").filter(word => word.length >= 2);
  if (!parts.length) return {};
  const fn = parts[0];
  const ln = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return ln ? { fn, ln } : { fn };
}

function normalizedEmail(value: string): string | undefined {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}

function normalizedPhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, "");
  const candidate = digits.length === 10 || digits.length === 11 ? "55" + digits : digits;
  if (!/^55\d{10,11}$/.test(candidate) || /^(\d)\1+$/.test(candidate.slice(2))) return undefined;
  return candidate;
}

export function buildManualMetaCustomerData(identity: ManualMetaIdentity): ManualMetaCustomerData {
  const match: ManualMetaCustomerData = {};
  const parts = normalizedName(identity.name ?? "");
  if (parts.fn) match.fn = parts.fn;
  if (parts.ln) match.ln = parts.ln;
  const em = normalizedEmail(identity.email ?? "");
  const ph = normalizedPhone(identity.phone ?? "");
  if (em) match.em = em;
  if (ph) match.ph = ph;
  return match;
}

/**
 * The Meta-managed GTM template likewise re-initializes an existing Pixel
 * with advanced-matching fields when identification arrives after PageView.
 * Re-init alone never creates PageView, Purchase, Lead or any custom event.
 */
export function createManualMetaMatchingUpdater(pixelId = META_PIXEL_ID) {
  let lastIdentity = "";
  return (fbq: PixelCall, identity: ManualMetaIdentity): boolean => {
    if (typeof fbq !== "function") return false;
    const match = buildManualMetaCustomerData(identity);
    if (!Object.keys(match).length) return false;
    const signature = JSON.stringify(match);
    if (signature === lastIdentity) return false;
    try {
      fbq("init", pixelId, match);
      lastIdentity = signature;
      return true;
    } catch {
      // A tracking failure must never block purchase or WhatsApp handoff.
      return false;
    }
  };
}
