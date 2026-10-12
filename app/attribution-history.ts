// Interações com parâmetros observados no site, sem inferir clique pago nem venda atribuída.
export type MarketingInteraction = {
  observed_at: string;
  evidence: "url_parameters";
  path: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  tintim_fbid?: string;
  has_fbclid?: boolean;
  has_gclid?: boolean;
};

const fields = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "utm_id", "campaign_id", "adset_id", "ad_id", "tintim_fbid",
] as const;
const MAX_INTERACTIONS = 20;
// Histórico local, não janela de atribuição da Meta. Dados antigos deixam de ser enviados aos pedidos.
const HISTORY_DAYS = 90;
const MAX_HISTORY_MS = HISTORY_DAYS * 24 * 60 * 60 * 1000;
const DEDUPE_MS = 10 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function sanitize(value: unknown, limit = 180): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean ? clean.slice(0, limit) : undefined;
}

function fromSaved(value: unknown, nowMs: number): MarketingInteraction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Partial<MarketingInteraction>;
  const seenAt = typeof entry.observed_at === "string" ? Date.parse(entry.observed_at) : NaN;
  if (entry.evidence !== "url_parameters" || !Number.isFinite(seenAt)
    || seenAt < nowMs - MAX_HISTORY_MS || seenAt > nowMs + FUTURE_TOLERANCE_MS) return null;
  if (typeof entry.path !== "string" || !entry.path.startsWith("/")) return null;

  const result: MarketingInteraction = {
    observed_at: new Date(seenAt).toISOString(),
    evidence: "url_parameters",
    path: entry.path.slice(0, 140),
  };
  for (const key of fields) {
    const value = sanitize(entry[key], key === "tintim_fbid" ? 300 : 180);
    if (value) result[key] = value;
  }
  if (entry.has_fbclid === true) result.has_fbclid = true;
  if (entry.has_gclid === true) result.has_gclid = true;
  return fields.some(key => result[key]) || result.has_fbclid || result.has_gclid ? result : null;
}

function signature(entry: MarketingInteraction): string {
  return JSON.stringify([
    ...fields.map(key => entry[key] ?? ""),
    Boolean(entry.has_fbclid), Boolean(entry.has_gclid),
  ]);
}

// Une carrinho salvo, sessão atual e histórico local SEM escolher a lista mais comprida.
// Um acesso repetido com os mesmos parâmetros em menos de 10min é a mesma observação.
export function mergeMarketingInteractions(
  a: unknown,
  b: unknown,
  now = new Date().toISOString(),
): MarketingInteraction[] {
  const clock = Date.parse(now);
  const nowMs = Number.isFinite(clock) ? clock : Date.now();
  const valid = [
    ...(Array.isArray(a) ? a : []),
    ...(Array.isArray(b) ? b : []),
  ].map(value => fromSaved(value, nowMs))
    .filter((entry): entry is MarketingInteraction => entry !== null)
    .sort((left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at));

  const merged: MarketingInteraction[] = [];
  for (const entry of valid) {
    const previous = merged.at(-1);
    if (previous && signature(previous) === signature(entry)
      && Date.parse(entry.observed_at) - Date.parse(previous.observed_at) < DEDUPE_MS) continue;
    merged.push(entry);
  }
  return merged.slice(-MAX_INTERACTIONS);
}

export function captureMarketingInteractions(
  previous: unknown,
  href: string,
  observedAt = new Date().toISOString(),
): MarketingInteraction[] {
  const nowMs = Date.parse(observedAt);
  const now = Number.isFinite(nowMs) ? observedAt : new Date().toISOString();
  const existing = mergeMarketingInteractions(previous, [], now);
  let url: URL;
  try { url = new URL(href); } catch { return existing; }
  if (!["https:", "http:"].includes(url.protocol)) return existing;

  const entry: MarketingInteraction = {
    observed_at: now,
    evidence: "url_parameters",
    path: url.pathname.slice(0, 140),
  };
  for (const key of fields) {
    const value = sanitize(url.searchParams.get(key), key === "tintim_fbid" ? 300 : 180);
    if (value) entry[key] = value;
  }
  if (url.searchParams.has("fbclid") && sanitize(url.searchParams.get("fbclid"), 450)) entry.has_fbclid = true;
  if (url.searchParams.has("gclid") && sanitize(url.searchParams.get("gclid"), 450)) entry.has_gclid = true;
  // Compatibilidade com links Tintim que embutem o ID do anúncio.
  if (!entry.ad_id && entry.tintim_fbid) {
    const id = /^([0-9]{8,25})(?:_|$)/.exec(entry.tintim_fbid)?.[1];
    if (id) entry.ad_id = id;
  }
  // Nenhum dado de entrada novo: mantém somente observações anteriores.
  if (!fields.some(key => entry[key]) && !entry.has_fbclid && !entry.has_gclid) return existing;
  return mergeMarketingInteractions(existing, [entry], now);
}
