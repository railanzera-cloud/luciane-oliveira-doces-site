// Dados agregados, sem nome, telefone ou identidade dos clientes.
export type ResultsPeriod = 7 | 30 | 90;
export type ResultsSummary = {
  orders: number;
  paid_orders: number;
  paid_amount: number;
  pending_orders: number;
  pending_amount: number;
  cancelled_orders: number;
  paid_cancelled_orders: number;
  near_campaign_orders: number;
  historical_campaign_orders: number;
  linked_without_campaign: number;
  without_tintim_link: number;
  tintim_linked_orders: number;
  orders_with_campaign_or_meta_signal: number;
  unclassified_orders: number;
  bio_orders: number;
  bio_with_fbclid: number;
  orders_with_fbclid: number;
  with_tintim_campaign: number;
  with_saved_utm_campaign: number;
  with_meta_link_id: number;
};
export type ResultsChannel = {
  channel: string; orders: number; paid_orders: number; paid_amount: number;
};
export type ResultsEvidence = {
  kind: "near_order" | "historical_conversation" | "no_campaign" | "no_link";
  orders: number; paid_orders: number; paid_amount: number;
};
export type ResultsVisit = { source: string; orders: number; paid_orders: number };
export type TrackingEvidenceKind =
  | "tintim_campaign"
  | "saved_utm_campaign"
  | "meta_link_identifier"
  | "bio_without_campaign_or_click_id"
  | "unclassified";
export type TrackingEvidenceRow = {
  kind: TrackingEvidenceKind;
  orders: number;
  marked_paid_on_site: number;
  bio_orders: number;
};
export type SavedUtmCampaign = {
  campaign_name: string;
  orders: number;
  marked_paid_on_site: number;
};
export function trackingEvidenceDescription(kind: TrackingEvidenceKind): string {
  switch (kind) {
    case "tintim_campaign": return "Campanha vinculada pelo Tintim";
    case "saved_utm_campaign": return "Campanha gravada no pedido (UTM)";
    case "meta_link_identifier": return "Identificador de link Meta, sem campanha identificada";
    case "bio_without_campaign_or_click_id": return "Link da bio, sem outro sinal identificado";
    case "unclassified": return "Origem sem evidência suficiente";
  }
}
export function trackingEvidenceExplanation(kind: TrackingEvidenceKind): string {
  switch (kind) {
    case "tintim_campaign": return "Conversa ligada ao pedido com campanha preservada no Tintim. Não confirma compra paga.";
    case "saved_utm_campaign": return "Nome de campanha salvo no pedido. Pode ter vindo de uma visita anterior; não confirma clique novo.";
    case "meta_link_identifier": return "Há fbclid ou identificador Tintim no pedido. O código não comprova, sozinho, anúncio pago.";
    case "bio_without_campaign_or_click_id": return "Entrada pelo link da bio, sem nome de campanha nem identificador de clique gravado.";
    case "unclassified": return "Não sabemos a origem com os dados disponíveis; não significa acesso orgânico.";
  }
}
export type ResultsCampaign = {
  campaign_name: string;
  campaign_id: string | null;
  evidence_kind: "near_order" | "historical_conversation";
  orders: number;
  paid_orders: number;
  paid_amount: number;
  pending_orders: number;
};
export type ResultsDaily = { day: string; orders: number; paid_orders: number };
export type ResultsOverview = {
  period_days: ResultsPeriod;
  generated_at: string;
  summary: ResultsSummary;
  channels: ResultsChannel[];
  tracking_evidence: TrackingEvidenceRow[];
  utm_campaigns: SavedUtmCampaign[];
  visits: ResultsVisit[];
  data_scope: "orders_created_in_supabase_only";
  sales_coverage: "incomplete_tintim_confirmations_not_synced";
  campaigns: ResultsCampaign[];
  daily: ResultsDaily[];
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function resultsMoney(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0);
}
export function evidenceDescription(kind: ResultsEvidence["kind"]): string {
  switch (kind) {
    case "near_order": return "Campanha registrada próxima ao pedido";
    case "historical_conversation": return "Campanha anterior na conversa";
    case "no_campaign": return "Conversa vinculada, sem campanha registrada";
    case "no_link": return "Sem conversa vinculada";
  }
}
export function channelDescription(channel: string): string {
  switch (channel) {
    case "whatsapp": return "Finalização pelo WhatsApp";
    case "site": return "Finalização no site";
    default: return "Outro canal";
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validNumber(value: unknown): boolean {
  return (typeof value === "number" || typeof value === "string")
    && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}
export function parseResultsOverview(value: unknown): ResultsOverview {
  if (!record(value) || ![7,30,90].includes(Number(value.period_days))
    || typeof value.generated_at !== "string" || !record(value.summary)) {
    throw new Error("O relatório de resultados veio incompleto. Atualize a página.");
  }
  const sourceSummary = value.summary as Record<string, unknown>;
  const mandatory = [
    "orders","paid_orders","paid_amount","pending_orders","pending_amount",
    "cancelled_orders","paid_cancelled_orders","near_campaign_orders",
    "historical_campaign_orders","linked_without_campaign","without_tintim_link",
    "tintim_linked_orders","orders_with_campaign_or_meta_signal","unclassified_orders",
    "bio_orders","bio_with_fbclid","orders_with_fbclid","with_tintim_campaign",
    "with_saved_utm_campaign","with_meta_link_id",
  ];
  if (!mandatory.every(key => validNumber(sourceSummary[key]))
    || !["channels","tracking_evidence","utm_campaigns","visits","campaigns","daily"].every(key => Array.isArray(value[key]))
    || value.data_scope !== "orders_created_in_supabase_only"
    || value.sales_coverage !== "incomplete_tintim_confirmations_not_synced") {
    throw new Error("Não foi possível validar os indicadores recebidos.");
  }
  const summary = Object.fromEntries(
    mandatory.map(key => [key, Number(sourceSummary[key])]),
  ) as ResultsSummary;
  const diagnostics = value.tracking_evidence as unknown[];
  const knownKinds = new Set<TrackingEvidenceKind>([
    "tintim_campaign","saved_utm_campaign","meta_link_identifier",
    "bio_without_campaign_or_click_id","unclassified",
  ]);
  if (diagnostics.some(item =>
    !record(item) || !knownKinds.has(item.kind as TrackingEvidenceKind)
    || !validNumber(item.orders) || !validNumber(item.marked_paid_on_site)
    || !validNumber(item.bio_orders)
  ) || diagnostics.reduce((total, item) =>
    total + Number((item as TrackingEvidenceRow).orders), 0) !== summary.orders
    || summary.bio_with_fbclid > summary.bio_orders
    || summary.orders_with_campaign_or_meta_signal > summary.orders
    || summary.tintim_linked_orders > summary.orders
    || summary.unclassified_orders > summary.orders
  ) {
    throw new Error("Os totais de rastreamento não estão consistentes. Atualize o relatório.");
  }
  return {
    period_days: Number(value.period_days) as ResultsPeriod,
    generated_at: value.generated_at,
    summary,
    channels: (value.channels as ResultsChannel[]),
    tracking_evidence: (value.tracking_evidence as TrackingEvidenceRow[]),
    utm_campaigns: (value.utm_campaigns as SavedUtmCampaign[]),
    data_scope: "orders_created_in_supabase_only",
    sales_coverage: "incomplete_tintim_confirmations_not_synced",
    visits: (value.visits as ResultsVisit[]),
    campaigns: (value.campaigns as ResultsCampaign[]),
    daily: (value.daily as ResultsDaily[]),
  };
}
