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
};
export type ResultsChannel = {
  channel: string; orders: number; paid_orders: number; paid_amount: number;
};
export type ResultsEvidence = {
  kind: "near_order" | "historical_conversation" | "no_campaign" | "no_link";
  orders: number; paid_orders: number; paid_amount: number;
};
export type ResultsVisit = { source: string; orders: number; paid_orders: number };
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
  evidence: ResultsEvidence[];
  visits: ResultsVisit[];
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
  ];
  if (!mandatory.every(key => validNumber(sourceSummary[key]))
    || !["channels","evidence","visits","campaigns","daily"].every(key => Array.isArray(value[key]))) {
    throw new Error("Não foi possível validar os indicadores recebidos.");
  }
  const summary = Object.fromEntries(
    mandatory.map(key => [key, Number(sourceSummary[key])]),
  ) as ResultsSummary;
  return {
    period_days: Number(value.period_days) as ResultsPeriod,
    generated_at: value.generated_at,
    summary,
    channels: (value.channels as ResultsChannel[]),
    evidence: (value.evidence as ResultsEvidence[]),
    visits: (value.visits as ResultsVisit[]),
    campaigns: (value.campaigns as ResultsCampaign[]),
    daily: (value.daily as ResultsDaily[]),
  };
}
