// Histórico local de parâmetros observados. Não presume visualização ou causalidade.
export type MarketingInteraction = {
  observed_at: string;
  evidence: "url_parameters";
  path: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ad_id?: string;
  tintim_fbid?: string;
  has_fbclid?: boolean;
};

const fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "tintim_fbid"] as const;
const MAX_INTERACTIONS = 20;
const DEDUPE_MS = 10 * 60 * 1000;

function sanitize(value: string | null, limit = 200): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean ? clean.slice(0, limit) : undefined;
}

function isInteraction(value: unknown): value is MarketingInteraction {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Partial<MarketingInteraction>;
  return entry.evidence === "url_parameters"
    && typeof entry.observed_at === "string" && Number.isFinite(Date.parse(entry.observed_at))
    && typeof entry.path === "string";
}

function signature(value: MarketingInteraction): string {
  return JSON.stringify(fields.map(key => value[key] ?? "").concat(value.has_fbclid ? "has_fbclid" : ""));
}

// Nunca herda parâmetros anteriores para criar uma interação nova.
// URL de bio com somente utm_source=ig é origem identificada, não prova de clique em anúncio.
export function captureMarketingInteractions(
  previous: unknown,
  href: string,
  observedAt = new Date().toISOString(),
): MarketingInteraction[] {
  const existing = (Array.isArray(previous) ? previous : [])
    .filter(isInteraction).slice(-MAX_INTERACTIONS);
  let url: URL;
  try { url = new URL(href); } catch { return existing; }
  if (!["https:", "http:"].includes(url.protocol)) return existing;
  const entry: MarketingInteraction = {
    observed_at: Number.isFinite(Date.parse(observedAt)) ? observedAt : new Date().toISOString(),
    evidence: "url_parameters",
    path: url.pathname.slice(0, 140),
  };
  for (const key of fields) {
    const value = sanitize(url.searchParams.get(key), key === "tintim_fbid" ? 300 : 180);
    if (value) entry[key] = value;
  }
  entry.has_fbclid = Boolean(sanitize(url.searchParams.get("fbclid"), 450));
  if (entry.tintim_fbid) {
    const id = /^([0-9]{8,25})(?:_|$)/.exec(entry.tintim_fbid)?.[1];
    if (id) entry.ad_id = id;
  }
  // Sem informações novas na URL, preservamos apenas o histórico antigo.
  if (!fields.some(key => entry[key]) && !entry.has_fbclid) return existing;
  const last = existing.at(-1);
  if (last && signature(last) === signature(entry)) {
    const delta = Date.parse(entry.observed_at) - Date.parse(last.observed_at);
    if (delta >= 0 && delta < DEDUPE_MS) return existing;
  }
  return [...existing, entry].slice(-MAX_INTERACTIONS);
}
