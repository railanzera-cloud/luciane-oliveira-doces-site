// Evidência de mensageria NÃO é evidência de opt-in, entrega ou compra.
// Dados originados em RPC read-only de staff; nenhuma mensagem é lida aqui.
export type CrmConversationEvidence = {
  conversation_id: string;
  meta_last_inbound_at: string | null;
  tintim_last_inbound_at: string | null;
  tintim_time_basis: string | null;
};

export type CrmEvidenceKind =
  | "official_matching"
  | "tintim_provider_matching"
  | "tintim_webhook_matching"
  | "official_historical"
  | "tintim_historical"
  | "none"
  | "unavailable";

export function crmEvidenceKind(
  lastInboundAt: string | null,
  evidence: CrmConversationEvidence | null | undefined,
  evidenceLoaded: boolean,
): CrmEvidenceKind {
  if (!evidenceLoaded) return "unavailable";
  const observed = lastInboundAt ? Date.parse(lastInboundAt) : NaN;
  const aligned = (stamp: string | null | undefined): boolean => {
    if (!stamp || !Number.isFinite(observed)) return false;
    const at = Date.parse(stamp);
    return Number.isFinite(at) && Math.abs(at - observed) <= 2 * 60_000;
  };
  if (evidence && aligned(evidence.meta_last_inbound_at)) return "official_matching";
  if (evidence && aligned(evidence.tintim_last_inbound_at)) {
    return evidence.tintim_time_basis === "provider_timestamp"
      ? "tintim_provider_matching" : "tintim_webhook_matching";
  }
  if (evidence?.meta_last_inbound_at) return "official_historical";
  if (evidence?.tintim_last_inbound_at) return "tintim_historical";
  return "none";
}

export function crmEvidenceCopy(kind: CrmEvidenceKind): string {
  switch(kind) {
    case "official_matching": return "Entrada Meta vinculada a este horário";
    case "tintim_provider_matching": return "Entrada Tintim com horário original";
    case "tintim_webhook_matching": return "Sinal Tintim · horário do webhook";
    case "official_historical": return "Meta em data anterior · conferir entrada atual";
    case "tintim_historical": return "Tintim em data anterior · conferir entrada atual";
    case "unavailable": return "Origem da mensagem não verificada";
    default: return "Nenhum evento de entrada vinculado";
  }
}

// Triagem ordena para conferência humana, NÃO autoriza envio automático.
export type CrmTriageInput = {
  evidence: CrmEvidenceKind;
  confirmedInterest: boolean;
  mentionedProduct: boolean;
  adHint: boolean;
  possiblePurchase: boolean;
  optedOut: boolean;
};
export function crmTriagePriority(input: CrmTriageInput): number {
  if (input.optedOut || input.possiblePurchase) return -1;
  const evidencePoints =
    input.evidence === "official_matching" ? 30 :
    input.evidence === "tintim_provider_matching" ? 22 :
    input.evidence === "tintim_webhook_matching" ? 10 :
    0;
  const interestPoints = input.confirmedInterest ? 18 :
    input.mentionedProduct ? 8 :
    input.adHint ? 2 : 0;
  return evidencePoints + interestPoints;
}

// URL somente para INSPEÇÃO manual do número no aparelho da atendente.
// Não anexa texto, não cria consentimento e não registra envio.
export function crmInspectWhatsAppNumber(phoneE164: string | null): string | null {
  if (!phoneE164 || !/^55[1-9][0-9]{9,10}$/.test(phoneE164)) return null;
  return "https://wa.me/" + phoneE164;
}
